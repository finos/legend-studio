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
  useLegendMarketplaceSearchResultsStore,
  withLegendMarketplaceSearchResultsStore,
} from '../../../application/providers/LegendMarketplaceSearchResultsStoreProvider.js';
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
  type LegendMarketplaceSearchResultsStore,
  DataProductFilterType,
  DataProductSort,
  UnmodeledDataProductDeployType,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import {
  generateLakehouseDataProductPath,
  generateLakehouseSearchResultsRoute,
  generateLegacyDataProductPath,
  LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import { V1_IngestEnvironmentClassification } from '@finos/legend-graph';
import { DataProductCardState } from '../../../stores/lakehouse/dataProducts/DataProductCardState.js';
import { LegacyDataProductCardState } from '../../../stores/lakehouse/dataProducts/LegacyDataProductCardState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LakehouseProductCard } from '../../../components/LakehouseProductCard/LakehouseProductCard.js';

const SearchResultsSortFilterPanel = observer(
  (props: { searchResultsStore: LegendMarketplaceSearchResultsStore }) => {
    const { searchResultsStore } = props;

    const [sortMenuAnchorEl, setSortMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isSortMenuOpen = Boolean(sortMenuAnchorEl);

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
              {searchResultsStore.sort}
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
                      searchResultsStore.setSort(sortValue);
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
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchResultsStore.filterState.modeledDataProducts}
                  onChange={() =>
                    searchResultsStore.handleFilterChange(
                      DataProductFilterType.MODELED_DATA_PRODUCTS,
                      undefined,
                    )
                  }
                />
              }
              label="Modeled Data Products"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={searchResultsStore.filterState.unmodeledDataProducts}
                  onChange={() =>
                    searchResultsStore.handleFilterChange(
                      DataProductFilterType.UNMODELED_DATA_PRODUCTS,
                      undefined,
                    )
                  }
                />
              }
              label="Unmodeled Data Products"
            />
            <Box className="marketplace-lakehouse-search-results__sort-filters__filter__unmodeled-config">
              <Box>
                <FormLabel>Deploy Type</FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          searchResultsStore.filterState
                            .unmodeledDataProductsConfig.sdlcDeploy
                        }
                        onChange={() =>
                          searchResultsStore.handleFilterChange(
                            DataProductFilterType.UNMODELED_DATA_PRODUCTS__DEPLOY_TYPE,
                            UnmodeledDataProductDeployType.SDLC,
                          )
                        }
                      />
                    }
                    label="SDLC Deployed"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          searchResultsStore.filterState
                            .unmodeledDataProductsConfig.sandboxDeploy
                        }
                        onChange={() =>
                          searchResultsStore.handleFilterChange(
                            DataProductFilterType.UNMODELED_DATA_PRODUCTS__DEPLOY_TYPE,
                            UnmodeledDataProductDeployType.SANDBOX,
                          )
                        }
                      />
                    }
                    label="Sandbox Deployed"
                  />
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
                          searchResultsStore.filterState
                            .unmodeledDataProductsConfig
                            .prodEnvironmentClassification
                        }
                        onChange={() =>
                          searchResultsStore.handleFilterChange(
                            DataProductFilterType.UNMODELED_DATA_PRODUCTS__ENVIRONMENT_CLASSIFICATION,
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
                          searchResultsStore.filterState
                            .unmodeledDataProductsConfig
                            .prodParallelEnvironmentClassification
                        }
                        onChange={() =>
                          searchResultsStore.handleFilterChange(
                            DataProductFilterType.UNMODELED_DATA_PRODUCTS__ENVIRONMENT_CLASSIFICATION,
                            V1_IngestEnvironmentClassification.PROD_PARALLEL,
                          )
                        }
                      />
                    }
                    label="Prod-Parallel"
                  />
                  {
                    // eslint-disable-next-line no-process-env
                    process.env.NODE_ENV !== 'production' && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={
                              searchResultsStore.filterState
                                .unmodeledDataProductsConfig
                                .devEnvironmentClassification
                            }
                            onChange={() =>
                              searchResultsStore.handleFilterChange(
                                DataProductFilterType.UNMODELED_DATA_PRODUCTS__ENVIRONMENT_CLASSIFICATION,
                                V1_IngestEnvironmentClassification.DEV,
                              )
                            }
                          />
                        }
                        label="Dev"
                      />
                    )
                  }
                </FormGroup>
              </Box>
            </Box>
          </FormGroup>
        </Box>
      </Box>
    );
  },
);

export const MarketplaceLakehouseSearchResults =
  withLegendMarketplaceSearchResultsStore(
    observer(() => {
      const searchResultsStore = useLegendMarketplaceSearchResultsStore();
      const auth = useAuth();

      const applicationStore =
        searchResultsStore.marketplaceBaseStore.applicationStore;
      const searchQuery =
        applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
          LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
          {
            sanitizeParametersInsteadOfUrl: true,
          },
        );
      searchResultsStore.handleSearch(searchQuery);

      useEffect(() => {
        if (searchResultsStore.loadingAllProductsState.isInInitialState) {
          searchResultsStore.init(auth.user?.access_token);
        }
      }, [searchResultsStore, auth]);

      const isLoadingDataProducts =
        searchResultsStore.loadingAllProductsState.isInProgress;

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
            <SearchResultsSortFilterPanel
              searchResultsStore={searchResultsStore}
            />
            <Grid
              container={true}
              spacing={{ xs: 2, sm: 3, xxl: 4 }}
              columns={{ xs: 1, sm: 2, xxl: 3 }}
              className="marketplace-lakehouse-search-results__data-product-cards"
            >
              {searchResultsStore.filterSortProducts?.map(
                (productCardState) => (
                  <Grid key={productCardState.guid} size={1}>
                    <LakehouseProductCard
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
                ),
              )}
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
