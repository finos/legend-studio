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
import { useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { generateLakehouseSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';

export const MarketplaceLakehouseHome = withMarketplaceLakehouseStore(
  observer(() => {
    const marketplaceStore = useMarketplaceLakehouseStore();
    const auth = useAuth();

    useEffect(() => {
      marketplaceStore.init(auth);
    }, [marketplaceStore, auth]);

    const isLoadingDataProducts =
      marketplaceStore.loadingAllProductsState.isInProgress ||
      marketplaceStore.loadingSandboxDataProductStates.isInProgress ||
      marketplaceStore.loadingLakehouseEnvironmentsByDIDState.isInProgress;

    const handleSearch = (query: string | undefined): void => {
      marketplaceStore.applicationStore.navigationService.navigator.goToLocation(
        generateLakehouseSearchResultsRoute(query),
      );
    };

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-home">
        <Container className="marketplace-lakehouse-home__search-container">
          <Box className="marketplace-lakehouse-home__search-container__title">
            Legend Marketplace
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
          <CubesLoadingIndicator isLoading={isLoadingDataProducts}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
