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
import {
  generateLakehouseDataProductPath,
  generateLakehouseSearchResultsRoute,
  generateLegacyDataProductPath,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  assertErrorThrown,
  isNonEmptyString,
  isNonNullable,
} from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import type { BaseProductCardState } from '../../stores/lakehouse/dataProducts/BaseProductCardState.js';
import { LakehouseHighlightedProductCard } from '../../components/LakehouseProductCard/LakehouseHighlightedProductCard.js';
import { DataProductCardState } from '../../stores/lakehouse/dataProducts/DataProductCardState.js';
import { LegacyDataProductCardState } from '../../stores/lakehouse/dataProducts/LegacyDataProductCardState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { DemoModal } from './DemoModal.js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import {
  DATAPRODUCT_TYPE,
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { V1_SdlcDeploymentDataProductOrigin } from '@finos/legend-graph';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();
  const configOptions = applicationStore.config.options;
  const showDevFeatures = configOptions.showDevFeatures;
  const adjacentUrl = applicationStore.config.adjacentEnvUrl;
  const adjacentEnvState = legendMarketplaceBaseStore.adjacentEnvState;

  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    BaseProductCardState[]
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

  const logClickingDataProductCard = (
    productCardState: BaseProductCardState,
  ): void => {
    if (productCardState instanceof DataProductCardState) {
      const details = productCardState.dataProductDetails;
      const origin =
        details.origin instanceof V1_SdlcDeploymentDataProductOrigin
          ? {
              type: DATAPRODUCT_TYPE.SDLC,
              groupId: details.origin.group,
              artifactId: details.origin.artifact,
              versionId: details.origin.version,
            }
          : {
              type: DATAPRODUCT_TYPE.ADHOC,
            };
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        applicationStore.telemetryService,
        {
          origin: origin,
          dataProductId: details.id,
          deploymentId: details.deploymentId,
          name: details.dataProduct.name,
          environmentClassification: productCardState.environmentClassification,
        },
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );
    } else if (productCardState instanceof LegacyDataProductCardState) {
      LegendMarketplaceTelemetryHelper.logEvent_ClickingLegacyDataProductCard(
        applicationStore.telemetryService,
        productCardState,
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
                    (productCardState: BaseProductCardState, index: number) => (
                      <LakehouseHighlightedProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path =
                            productCardState instanceof DataProductCardState
                              ? generateLakehouseDataProductPath(
                                  productCardState.dataProductDetails.id,
                                  productCardState.dataProductDetails
                                    .deploymentId,
                                )
                              : productCardState instanceof
                                  LegacyDataProductCardState
                                ? generateLegacyDataProductPath(
                                    generateGAVCoordinates(
                                      productCardState.groupId,
                                      productCardState.artifactId,
                                      productCardState._versionId,
                                    ),
                                    productCardState.dataSpace.path,
                                  )
                                : '';
                          applicationStore.navigationService.navigator.goToLocation(
                            path,
                          );
                          logClickingDataProductCard(productCardState);
                        }}
                      />
                    ),
                  )}
                </div>
              </SwiperSlide>
              <SwiperSlide key={2}>
                <div className="marketplace-lakehouse-home__carousel-slide">
                  {highlightedDataProducts.map(
                    (productCardState: BaseProductCardState, index: number) => (
                      <LakehouseHighlightedProductCard
                        key={`slide-2-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path =
                            productCardState instanceof DataProductCardState
                              ? generateLakehouseDataProductPath(
                                  productCardState.dataProductDetails.id,
                                  productCardState.dataProductDetails
                                    .deploymentId,
                                )
                              : productCardState instanceof
                                  LegacyDataProductCardState
                                ? generateLegacyDataProductPath(
                                    generateGAVCoordinates(
                                      productCardState.groupId,
                                      productCardState.artifactId,
                                      productCardState._versionId,
                                    ),
                                    productCardState.dataSpace.path,
                                  )
                                : '';
                          applicationStore.navigationService.navigator.goToLocation(
                            path,
                          );
                          logClickingDataProductCard(productCardState);
                        }}
                      />
                    ),
                  )}
                </div>
              </SwiperSlide>
              <SwiperSlide key={3}>
                <div className="marketplace-lakehouse-home__carousel-slide">
                  {highlightedDataProducts.map(
                    (productCardState: BaseProductCardState, index: number) => (
                      <LakehouseHighlightedProductCard
                        key={`slide-1-${productCardState.guid}`}
                        productCardState={productCardState}
                        onClick={() => {
                          const path =
                            productCardState instanceof DataProductCardState
                              ? generateLakehouseDataProductPath(
                                  productCardState.dataProductDetails.id,
                                  productCardState.dataProductDetails
                                    .deploymentId,
                                )
                              : productCardState instanceof
                                  LegacyDataProductCardState
                                ? generateLegacyDataProductPath(
                                    generateGAVCoordinates(
                                      productCardState.groupId,
                                      productCardState.artifactId,
                                      productCardState._versionId,
                                    ),
                                    productCardState.dataSpace.path,
                                  )
                                : '';
                          applicationStore.navigationService.navigator.goToLocation(
                            path,
                          );
                          logClickingDataProductCard(productCardState);
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
