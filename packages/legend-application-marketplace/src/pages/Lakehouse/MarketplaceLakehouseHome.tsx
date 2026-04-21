/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { Box, Container } from '@mui/material';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { generateLakehouseSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  assertErrorThrown,
  isNonEmptyString,
  LogEvent,
} from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { DemoModal } from './DemoModal.js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { generatePathForDataProductSearchResult } from '../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../utils/LogUtils.js';
import { LakehouseProductCard } from '../../components/LakehouseProductCard/LakehouseProductCard.js';
import type { HomePageBannerConfig } from '../../application/LegendMarketplaceApplicationPlugin.js';

const TRENDING_DATA_PRODUCTS = 4;

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();

  const isDarkMode =
    !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    Record<string, ProductCardState[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<Set<string>>(
    new Set(),
  );

  const bannerConfigs: HomePageBannerConfig[] = useMemo(
    () =>
      applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            plugin.getExtraHomePageBannerConfigs?.(
              legendMarketplaceBaseStore,
            ) ?? [],
        ),
    [applicationStore.pluginManager, legendMarketplaceBaseStore],
  );

  const visibleBanners = bannerConfigs.filter(
    (banner) => !dismissedBannerIds.has(banner.id),
  );

  const dismissBanner = (bannerId: string): void => {
    setDismissedBannerIds((prev) => new Set([...prev, bannerId]));
    LegendMarketplaceTelemetryHelper.logEvent_DismissHomePageBanner(
      applicationStore.telemetryService,
      bannerId,
    );
  };

  useEffect(() => {
    LegendMarketplaceTelemetryHelper.clearSearchSessionId();
  }, []);

  const sectionNames = useMemo(
    () => Object.keys(highlightedDataProducts),
    [highlightedDataProducts],
  );

  useEffect(() => {
    const loadDataProducts = async (): Promise<void> => {
      setLoading(true);

      try {
        let trendingDataProducts:
          | Record<string, ProductCardState[]>
          | undefined;
        try {
          trendingDataProducts =
            await legendMarketplaceBaseStore.fetchTrendingDataProducts(
              auth.user?.access_token,
            );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.logService.warn(
            LogEvent.create(
              LEGEND_MARKETPLACE_APP_EVENT.FETCH_DATA_PRODUCT_FAILURE,
            ),
            'Failed to fetch trending data products',
            error,
          );
        }

        const [configDataProducts, ...extraDataProductSections] =
          await Promise.all([
            legendMarketplaceBaseStore.initHighlightedDataProducts(
              auth.user?.access_token,
            ),
            ...applicationStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                async (plugin) =>
                  (await plugin.getExtraHomePageDataProducts?.(
                    legendMarketplaceBaseStore,
                    auth.user?.access_token,
                  )) ?? {},
              ),
          ]);
        const result: Record<string, ProductCardState[]> = {
          ...configDataProducts,
        };
        if (
          trendingDataProducts &&
          Object.values(trendingDataProducts).flat().length >=
            TRENDING_DATA_PRODUCTS
        ) {
          Object.assign(result, trendingDataProducts);
        }

        for (const pluginSections of extraDataProductSections) {
          for (const [sectionTitle, dataProductStates] of Object.entries(
            pluginSections,
          )) {
            if (dataProductStates.length > 0) {
              dataProductStates.forEach((dataProductState) =>
                dataProductState.init(auth.user?.access_token),
              );
              result[sectionTitle] = [
                ...(result[sectionTitle] ?? []),
                ...dataProductStates,
              ];
            }
          }
        }

        setHighlightedDataProducts(result);
      } catch (error) {
        assertErrorThrown(error);
        if (applicationStore.config.options.showDevFeatures) {
          applicationStore.notificationService.notifyError(
            error,
            `Can't load highlighted data products: ${error.name}\n${error.message}\n${error.cause}\n${error.stack}`,
          );
        } else {
          applicationStore.notificationService.notifyError(
            `Can't load highlighted data products: ${error.message}`,
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (sectionNames.length === 0) {
      // eslint-disable-next-line no-void
      void loadDataProducts();
    }
  }, [
    auth.user?.access_token,
    sectionNames.length,
    applicationStore.notificationService,
    applicationStore.pluginManager,
    applicationStore.logService,
    legendMarketplaceBaseStore,
    applicationStore.config.options.showDevFeatures,
  ]);

  const handleCardClick = (productCardState: ProductCardState): void => {
    const path = generatePathForDataProductSearchResult(
      productCardState.searchResult,
    );
    if (path) {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(path),
      );
    }
    logClickingDataProductCard(
      productCardState,
      applicationStore,
      LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
    );
  };

  const [activeIndex, setActiveIndex] = useState(0);

  const handleSearch = (
    _query: string | undefined,
    _useProducerSearch: boolean,
  ): void => {
    if (isNonEmptyString(_query)) {
      applicationStore.navigationService.navigator.goToLocation(
        generateLakehouseSearchResultsRoute(_query, _useProducerSearch),
      );
      LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
        applicationStore.telemetryService,
        _query,
        _useProducerSearch,
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );
    }
  };

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-home">
      {visibleBanners.map((banner) => (
        <div key={banner.id} className="marketplace-lakehouse-home__banner">
          <div className="marketplace-lakehouse-home__banner__content">
            {banner.content}
          </div>
          <button
            className="marketplace-lakehouse-home__banner__close"
            onClick={() => dismissBanner(banner.id)}
            title="Dismiss banner"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <Container className="marketplace-lakehouse-home__search-container">
        <Box className="marketplace-lakehouse-home__search-container__logo">
          <img
            src={
              isDarkMode
                ? '/assets/legendmarketplacehomelogodark.png'
                : '/assets/legendmarketplacehomelogolight.png'
            }
            alt="Legend Marketplace Logo"
          />
        </Box>
        <LegendMarketplaceSearchBar
          showSettings={true}
          onSearch={handleSearch}
          placeholder="Which data can I help you find?"
          className="marketplace-lakehouse-home__search-bar"
        />
      </Container>
      <Container
        maxWidth="xxxl"
        className="marketplace-lakehouse-home__data-product-cards__container"
      >
        {loading ? (
          <CubesLoadingIndicator
            isLoading={loading}
            className="marketplace-lakehouse-home__data-product-cards__loading"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        ) : (
          <div className="marketplace-lakehouse-home__carousel-header">
            <div className="marketplace-lakehouse-home__carousel-title">
              {sectionNames[activeIndex] ?? ''}
            </div>
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              slidesPerView={1}
              navigation={false}
              pagination={{ clickable: true }}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              className="marketplace-lakehouse-home__carousel"
            >
              {sectionNames.map((sectionName) => (
                <SwiperSlide key={sectionName}>
                  <div className="marketplace-lakehouse-home__carousel-slide">
                    {highlightedDataProducts[sectionName]?.map(
                      (productCardState) => (
                        <LakehouseProductCard
                          key={`${sectionName}-${productCardState.guid}`}
                          productCardState={productCardState}
                          moreInfoPreview="large"
                          hideInfoPopover={true}
                          hideTags={true}
                          onClick={() => handleCardClick(productCardState)}
                        />
                      ),
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </Container>
      <DemoModal />
    </LegendMarketplacePage>
  );
});
