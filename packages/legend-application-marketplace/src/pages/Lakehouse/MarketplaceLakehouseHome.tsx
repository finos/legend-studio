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
import {
  useMarketplaceLakehouseStore,
  withMarketplaceLakehouseStore,
} from './MarketplaceLakehouseStoreProvider.js';
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

export const MarketplaceLakehouseHome = withMarketplaceLakehouseStore(
  observer(() => {
    const marketplaceStore = useMarketplaceLakehouseStore();
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
            marketplaceStore.applicationStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                async (plugin) =>
                  (await plugin.getHomePageDataProducts?.(
                    marketplaceStore,
                    auth.user?.access_token,
                  )) ?? [],
              ),
          );
          setHighlightedDataProducts(dataProducts.flat());
        } catch (error) {
          assertErrorThrown(error);
          marketplaceStore.applicationStore.notificationService.notifyError(
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
      marketplaceStore,
      auth.user?.access_token,
      highlightedDataProducts.length,
    ]);

    const handleSearch = (query: string | undefined): void => {
      if (isNonEmptyString(query)) {
        marketplaceStore.applicationStore.navigationService.navigator.goToLocation(
          generateLakehouseSearchResultsRoute(query),
        );
      }
    };

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-home">
        <Container className="marketplace-lakehouse-home__search-container">
          <Box className="marketplace-lakehouse-home__search-container__logo">
            <img src="/assets/LegendLogo.png" alt="Legend Logo" />
          </Box>
          <Box className="marketplace-lakehouse-home__search-container__title">
            Marketplace
          </Box>
          <LegendMarketplaceSearchBar
            onSearch={handleSearch}
            placeholder="Search Legend Marketplace"
            className="marketplace-lakehouse-home__search-bar"
          />
        </Container>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-home__highlights-container"
        >
          <CubesLoadingIndicator isLoading={loading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, lg: 4, xxl: 5 }}
            columns={{ xs: 1, sm: 2, lg: 3, xxl: 4 }}
            className="marketplace-lakehouse-search-results__data-product-cards"
          >
            {highlightedDataProducts.map((dataProductState) => (
              <Grid
                key={`${dataProductState.dataProductDetails.id}-${dataProductState.dataProductDetails.deploymentId}`}
                size={1}
              >
                <LakehouseHighlightedDataProductCard
                  dataProductState={dataProductState}
                  onClick={() => {
                    marketplaceStore.applicationStore.navigationService.navigator.visitAddress(
                      generateLakehouseDataProductPath(
                        dataProductState.dataProductDetails.id,
                        dataProductState.dataProductDetails.deploymentId,
                      ),
                    );
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
