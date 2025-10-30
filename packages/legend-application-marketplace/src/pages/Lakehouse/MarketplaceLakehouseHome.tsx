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
  OpenNewTabIcon,
  SimpleCalendarIcon,
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
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { LakehouseHighlightedProductCard } from '../../components/LakehouseProductCard/LakehouseHighlightedProductCard.js';
import { generatePathForDataProductSearchResult } from '../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../utils/LogUtils.js';

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();
  const configOptions = applicationStore.config.options;
  const showDevFeatures = configOptions.showDevFeatures;
  const adjacentUrl = applicationStore.config.adjacentEnvUrl;
  const adjacentEnvState = legendMarketplaceBaseStore.adjacentEnvState;

  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    ProductCardState[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const loadDataProducts = async (): Promise<void> => {
      setLoading(true);

      try {
        const dataProducts = await Promise.all([
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
        ]);
        setHighlightedDataProducts(dataProducts.filter(isNonNullable).flat());
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyError(
          `Can't load highlighted data products: ${error.message}`,
        );
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
  ]);

  const handleSearch = (query: string): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateLakehouseSearchResultsRoute(query),
    );
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

  const newsletterNavigation = (): void => {
    applicationStore.navigationService.navigator.visitAddress(
      applicationStore.config.options.newsletterUrl,
    );
    applicationStore.telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_SUBSCRIBE_TO_NEWSLETTER,
      {},
    );
  };

  const visitAdjacentEnv = (): void => {
    if (adjacentUrl) {
      applicationStore.navigationService.navigator.visitAddress(adjacentUrl);
    }
  };

  const handleShowDemo = (): void => {
    legendMarketplaceBaseStore.setDemoModal(true);
  };

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-home">
      <div className="legend-marketplace-home__button-group">
        {showDevFeatures && (
          <button
            onClick={handleShowDemo}
            className="legend-marketplace-home__button"
          >
            <SimpleCalendarIcon className="legend-marketplace-home__button__icon" />
            Schedule a Demo
          </button>
        )}
        {adjacentUrl && adjacentEnvState && (
          <button
            className="legend-marketplace-home__button"
            onClick={visitAdjacentEnv}
          >
            <OpenNewTabIcon className="legend-marketplace-home__button__icon" />
            {`${adjacentEnvState.label} Env`}
          </button>
        )}
        <button
          className="legend-marketplace-home__button"
          onClick={newsletterNavigation}
        >
          <OpenNewTabIcon className="legend-marketplace-home__button__icon" />
          Subscribe to our Newsletter
        </button>
      </div>
      <Container className="marketplace-lakehouse-home__search-container">
        <Box className="marketplace-lakehouse-home__search-container__logo">
          <img src="/assets/legendmarketplacehomelogo.png" alt="Legend Logo" />
        </Box>
        <Box className="marketplace-lakehouse-home__search-container__title_legend">
          Legend
        </Box>
        <Box className="marketplace-lakehouse-home__search-container__title_marketplace">
          Marketplace
        </Box>
        <LegendMarketplaceSearchBar
          onSearch={(query) => {
            if (isNonEmptyString(query)) {
              handleSearch(query);
              LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
                applicationStore.telemetryService,
                query,
                LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
              );
            }
          }}
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
                      <LakehouseHighlightedProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              path,
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
                    (productCardState: ProductCardState, index: number) => (
                      <LakehouseHighlightedProductCard
                        key={`slide-2-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              path,
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
                    (productCardState: ProductCardState, index: number) => (
                      <LakehouseHighlightedProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path = generatePathForDataProductSearchResult(
                            productCardState.searchResult,
                          );
                          if (path) {
                            applicationStore.navigationService.navigator.visitAddress(
                              path,
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
