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
import { Box, Container, Grid2 as Grid } from '@mui/material';
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
import { assertErrorThrown, isNonEmptyString } from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import type { BaseProductCardState } from '../../stores/lakehouse/dataProducts/BaseProductCardState.js';
import { LakehouseHighlightedProductCard } from '../../components/LakehouseProductCard/LakehouseHighlightedProductCard.js';
import { DataProductCardState } from '../../stores/lakehouse/dataProducts/DataProductCardState.js';
import { LegacyDataProductCardState } from '../../stores/lakehouse/dataProducts/LegacyDataProductCardState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { DemoModal } from './DemoModal.js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();
  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    BaseProductCardState[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const loadDataProducts = async (): Promise<void> => {
      setLoading(true);

      try {
        const dataProducts = await Promise.all(
          applicationStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              async (plugin) =>
                (await plugin.getHomePageDataProducts?.(
                  legendMarketplaceBaseStore,
                  auth.user?.access_token,
                )) ?? [],
            ),
        );
        setHighlightedDataProducts(dataProducts.flat());
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

  const handleSearch = (query: string | undefined): void => {
    if (isNonEmptyString(query)) {
      applicationStore.navigationService.navigator.goToLocation(
        generateLakehouseSearchResultsRoute(query),
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
  };

  const handleShowDemo = (): void => {
    legendMarketplaceBaseStore.setDemoModal(true);
  };

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-home">
      <div className="legend-marketplace-home__button-group">
        <button
          onClick={handleShowDemo}
          className="legend-marketplace-home__button"
        >
          <SimpleCalendarIcon className="legend-marketplace-home__button__icon" />
          Schedule a Demo
        </button>
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
          <>
            <div className="marketplace-lakehouse-home__carousel-header">
              <div className="marketplace-lakehouse-home__carousel-title">
                {getCarouselTitle()}
              </div>
            </div>
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              // spaceBetween={30}
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
                <Grid
                  container={true}
                  spacing={{ xs: 2, sm: 3, lg: 4, xl: 6 }}
                  columns={{ xs: 1, sm: 2, md: 3, lg: 4, xxxl: 5 }}
                  className="marketplace-lakehouse-home__data-product-cards"
                >
                  {highlightedDataProducts.map((productCardState) => (
                    <Grid key={productCardState.guid} size={1}>
                      <LakehouseHighlightedProductCard
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
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </SwiperSlide>
              <SwiperSlide key={2}>
                <Grid
                  container={true}
                  spacing={{ xs: 2, sm: 3, lg: 4, xl: 6 }}
                  columns={{ xs: 1, sm: 2, md: 3, lg: 4, xxxl: 5 }}
                  className="marketplace-lakehouse-home__data-product-cards"
                >
                  {highlightedDataProducts.map((productCardState) => (
                    <Grid key={productCardState.guid} size={1}>
                      <LakehouseHighlightedProductCard
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
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </SwiperSlide>
              <SwiperSlide key={3}>
                <Grid
                  container={true}
                  spacing={{ xs: 2, sm: 3, lg: 4, xl: 6 }}
                  columns={{ xs: 1, sm: 2, md: 3, lg: 4, xxxl: 5 }}
                  className="marketplace-lakehouse-home__data-product-cards"
                >
                  {highlightedDataProducts.map((productCardState) => (
                    <Grid key={productCardState.guid} size={1}>
                      <LakehouseHighlightedProductCard
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
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </SwiperSlide>
            </Swiper>
          </>
        )}
      </Container>
      <DemoModal />
    </LegendMarketplacePage>
  );
});
