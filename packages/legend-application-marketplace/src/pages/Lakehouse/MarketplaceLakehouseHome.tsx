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
import { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { generateLakehouseSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  assertErrorThrown,
  isNonEmptyString,
  isNonNullable,
} from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { DemoModal } from './DemoModal.js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { generatePathForDataProductSearchResult } from '../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../utils/LogUtils.js';
import { LakehouseProductCard } from '../../components/LakehouseProductCard/LakehouseProductCard.js';

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();

  const isDarkMode =
    !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    ProductCardState[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    LegendMarketplaceTelemetryHelper.clearSearchSessionId();
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const loadDataProducts = async (): Promise<void> => {
      setLoading(true);

      try {
        const dataProducts = (
          await Promise.all([
            await legendMarketplaceBaseStore.initHighlightedDataProducts(
              auth.user?.access_token,
            ),
            ...applicationStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                async (plugin) =>
                  (await plugin.getExtraHomePageDataProducts?.(
                    legendMarketplaceBaseStore,
                    auth.user?.access_token,
                  )) ?? [],
              ),
          ])
        )
          .filter(isNonNullable)
          .flat();
        dataProducts.forEach((dataProductState) =>
          dataProductState.init(auth.user?.access_token),
        );
        setHighlightedDataProducts(dataProducts);
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

    if (highlightedDataProducts.length === 0) {
      // eslint-disable-next-line no-void
      void loadDataProducts();
    }
  }, [
    auth.user?.access_token,
    highlightedDataProducts.length,
    applicationStore.notificationService,
    applicationStore.pluginManager,
    legendMarketplaceBaseStore,
    applicationStore.config.options.showDevFeatures,
  ]);

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
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );
    }
  };

  const getCarouselTitle = (): string => {
    if (activeIndex === 0) {
      return 'New';
    }
    if (activeIndex === 1) {
      return 'Trending';
    }
    if (activeIndex === 2) {
      return 'Sponsored';
    }
    return '';
  };

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-home">
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
          initialUseProducerSearch={
            legendMarketplaceBaseStore.useProducerSearch
          }
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
              {getCarouselTitle()}
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
              <SwiperSlide key={1}>
                <div className="marketplace-lakehouse-home__carousel-slide">
                  {highlightedDataProducts.map(
                    (productCardState: ProductCardState) => (
                      <LakehouseProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        moreInfoPreview="large"
                        hideInfoPopover={true}
                        hideTags={true}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              applicationStore.navigationService.navigator.generateAddress(
                                path,
                              ),
                            );
                          }
                          logClickingDataProductCard(
                            productCardState,
                            applicationStore,
                            LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
                          );
                        }}
                      />
                    ),
                  )}
                </div>
              </SwiperSlide>
              <SwiperSlide key={2}>
                <div className="marketplace-lakehouse-home__carousel-slide">
                  {highlightedDataProducts.map(
                    (productCardState: ProductCardState) => (
                      <LakehouseProductCard
                        key={`slide-2-${productCardState.guid}`}
                        productCardState={productCardState}
                        moreInfoPreview="large"
                        hideInfoPopover={true}
                        hideTags={true}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              applicationStore.navigationService.navigator.generateAddress(
                                path,
                              ),
                            );
                          }
                          logClickingDataProductCard(
                            productCardState,
                            applicationStore,
                            LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
                          );
                        }}
                      />
                    ),
                  )}
                </div>
              </SwiperSlide>
              <SwiperSlide key={3}>
                <div className="marketplace-lakehouse-home__carousel-slide">
                  {highlightedDataProducts.map(
                    (productCardState: ProductCardState) => (
                      <LakehouseProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        moreInfoPreview="large"
                        hideInfoPopover={true}
                        hideTags={true}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              applicationStore.navigationService.navigator.generateAddress(
                                path,
                              ),
                            );
                          }
                          logClickingDataProductCard(
                            productCardState,
                            applicationStore,
                            LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
                          );
                        }}
                      />
                    ),
                  )}
                </div>
              </SwiperSlide>
            </Swiper>
          </div>
        )}
      </Container>
      <DemoModal />
    </LegendMarketplacePage>
  );
});
