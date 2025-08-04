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
} from '../MarketplaceLakehouseStoreProvider.js';
import React, { useEffect, useState } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ExpandMoreIcon,
} from '@finos/legend-art';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid2 as Grid,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  DataProductFilterType,
  DataProductSort,
  DeployType,
  type MarketplaceLakehouseStore,
} from '../../../stores/lakehouse/MarketplaceLakehouseStore.js';
import {
  generateLakehouseDataProductPath,
  generateLakehouseSearchResultsRoute,
  LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import { type DataProductState } from '../../../stores/lakehouse/dataProducts/DataProducts.js';
import { V1_IngestEnvironmentClassification } from '@finos/legend-graph';
import { isNullable } from '@finos/legend-shared';
import { LakehouseDataProductCard } from '../../../components/LakehouseDataProductCard/LakehouseDataProductCard.js';

const SearchResultsSortFilterPanel = observer(
  (props: { marketplaceStore: MarketplaceLakehouseStore }) => {
    const { marketplaceStore } = props;

    const [sortMenuAnchorEl, setSortMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isSortMenuOpen = Boolean(sortMenuAnchorEl);

    const showUnknownDeployTypeFilter = marketplaceStore.dataProductStates.some(
      (state) => isNullable(state.dataProductDetails.origin),
    );
    const showUnknownEnvironmentFilter =
      marketplaceStore.dataProductStates.some((state) =>
        isNullable(state.environmentClassification),
      );

    return (
      <Box className="marketplace-lakehouse-search-results__sort-filters">
        <Box className="marketplace-lakehouse-search-results__sort-filters__sort">
          Sort By
          <Box>
            <Button
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                setSortMenuAnchorEl(event.currentTarget);
              }}
              className="marketplace-lakehouse-search-results__sort-filters__sort__btn"
            >
              {marketplaceStore.sort}
              <ExpandMoreIcon />
            </Button>
            <Menu
              anchorEl={sortMenuAnchorEl}
              open={isSortMenuOpen}
              onClose={() => setSortMenuAnchorEl(null)}
              anchorOrigin={{
                horizontal: 'left',
                vertical: 'bottom',
              }}
              transformOrigin={{
                horizontal: 'left',
                vertical: 'top',
              }}
            >
              {Object.values(DataProductSort).map((sortValue) => {
                return (
                  <MenuItem
                    key={sortValue}
                    onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                      marketplaceStore.setSort(sortValue);
                      setSortMenuAnchorEl(null);
                    }}
                  >
                    {sortValue}
                  </MenuItem>
                );
              })}
            </Menu>
          </Box>
        </Box>
        <Box className="marketplace-lakehouse-search-results__sort-filters__filter">
          Filter By
          <Box>
            <FormLabel>Deploy Type</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketplaceStore.filter.sdlcDeployFilter}
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.DEPLOY_TYPE,
                        DeployType.SDLC,
                      )
                    }
                  />
                }
                label="SDLC Deployed"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketplaceStore.filter.sandboxDeployFilter}
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.DEPLOY_TYPE,
                        DeployType.SANDBOX,
                      )
                    }
                  />
                }
                label="Sandbox Deployed"
              />
              {showUnknownDeployTypeFilter === true && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={marketplaceStore.filter.unknownDeployFilter}
                      onChange={() =>
                        marketplaceStore.handleFilterChange(
                          DataProductFilterType.DEPLOY_TYPE,
                          DeployType.UNKNOWN,
                        )
                      }
                    />
                  }
                  label="Unknown"
                />
              )}
            </FormGroup>
          </Box>
          <hr />
          <Box>
            <FormLabel>Deploy Environment</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter
                        .prodEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.PROD,
                      )
                    }
                  />
                }
                label="Prod"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter
                        .prodParallelEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.PROD_PARALLEL,
                      )
                    }
                  />
                }
                label="Prod-Parallel"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter.devEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.DEV,
                      )
                    }
                  />
                }
                label="Dev"
              />
              {showUnknownEnvironmentFilter === true && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        marketplaceStore.filter
                          .unknownEnvironmentClassificationFilter
                      }
                      onChange={() =>
                        marketplaceStore.handleFilterChange(
                          DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                          'UNKNOWN',
                        )
                      }
                    />
                  }
                  label="Unknown"
                />
              )}
            </FormGroup>
          </Box>
        </Box>
      </Box>
    );
  },
);

export const MarketplaceLakehouseSearchResults = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const auth = useAuth();

    const applicationStore = marketPlaceStore.applicationStore;
    const searchQuery =
      applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
        LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        {
          sanitizeParametersInsteadOfUrl: true,
        },
      );
    marketPlaceStore.handleSearch(searchQuery);

    useEffect(() => {
      marketPlaceStore.init(auth);
    }, [marketPlaceStore, auth]);

    const isLoadingDataProducts =
      marketPlaceStore.loadingAllProductsState.isInProgress ||
      marketPlaceStore.loadingSandboxDataProductStates.isInProgress ||
      marketPlaceStore.loadingLakehouseEnvironmentsByDIDState.isInProgress;

    const handleSearch = (query: string | undefined): void => {
      applicationStore.navigationService.navigator.goToLocation(
        generateLakehouseSearchResultsRoute(query),
      );
    };

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-search-results">
        <Container className="marketplace-lakehouse-search-results__search-container">
          <LegendMarketplaceSearchBar
            onSearch={handleSearch}
            placeholder="Search Legend Marketplace"
            className="marketplace-lakehouse-search-results__search-bar"
            initialValue={searchQuery}
          />
        </Container>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-search-results__results-container"
        >
          <SearchResultsSortFilterPanel marketplaceStore={marketPlaceStore} />
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, xxl: 4 }}
            columns={{ xs: 1, sm: 2, xxl: 3 }}
            className="marketplace-lakehouse-search-results__data-product-cards"
          >
            {marketPlaceStore.filterSortProducts?.map((dataProductState) => (
              <Grid
                key={`${dataProductState.dataProductDetails.id}-${dataProductState.dataProductDetails.deploymentId}`}
                size={1}
              >
                <LakehouseDataProductCard
                  dataProductState={dataProductState}
                  onClick={(dpState: DataProductState) => {
                    marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                      generateLakehouseDataProductPath(
                        dataProductState.dataProductDetails.id,
                        dataProductState.dataProductDetails.deploymentId,
                      ),
                    );
                  }}
                />
              </Grid>
            ))}
            {isLoadingDataProducts && (
              <Grid size={1}>
                <CubesLoadingIndicator
                  isLoading={true}
                  className="marketplace-lakehouse-search-results__loading-data-products-indicator"
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
              </Grid>
            )}
          </Grid>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
