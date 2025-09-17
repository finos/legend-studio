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
} from '@finos/legend-art';
import {
  generateLakehouseDataProductPath,
  generateLakehouseSearchResultsRoute,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import { assertErrorThrown, isNonEmptyString } from '@finos/legend-shared';
import type { DataProductState } from '../../stores/lakehouse/dataProducts/DataProducts.js';
import { LakehouseHighlightedDataProductCard } from '../../components/LakehouseDataProductCard/LakehouseHighlightedDataProductCard.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

export const MarketplaceLakehouseHome = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const auth = useAuth();
  const [highlightedDataProducts, setHighlightedDataProducts] = useState<
    DataProductState[]
  >([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <LegendMarketplacePage className="marketplace-lakehouse-home">
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
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, lg: 4 }}
            columns={{ xs: 1, sm: 2, md: 3, lg: 4, xxxl: 5 }}
            className="marketplace-lakehouse-home__data-product-cards"
          >
            {highlightedDataProducts.map((dataProductState) => (
              <Grid
                key={`${dataProductState.dataProductDetails.id}-${dataProductState.dataProductDetails.deploymentId}`}
                size={1}
              >
                <LakehouseHighlightedDataProductCard
                  dataProductState={dataProductState}
                  onClick={() => {
                    applicationStore.navigationService.navigator.visitAddress(
                      applicationStore.navigationService.navigator.generateAddress(
                        generateLakehouseDataProductPath(
                          dataProductState.dataProductDetails.id,
                          dataProductState.dataProductDetails.deploymentId,
                        ),
                      ),
                    );
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </LegendMarketplacePage>
  );
});
