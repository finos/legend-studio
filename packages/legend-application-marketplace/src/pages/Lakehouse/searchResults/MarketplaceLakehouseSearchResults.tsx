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
import { useEffect, useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  Box,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid2 as Grid,
  MenuItem,
  Select,
  Typography,
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
import {
  V1_IngestEnvironmentClassification,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { DataProductCardState } from '../../../stores/lakehouse/dataProducts/DataProductCardState.js';
import { LegacyDataProductCardState } from '../../../stores/lakehouse/dataProducts/LegacyDataProductCardState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LakehouseProductCard } from '../../../components/LakehouseProductCard/LakehouseProductCard.js';
import {
  DATAPRODUCT_TYPE,
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';

const SearchResultsSortFilterPanel = observer(
  (props: { searchResultsStore: LegendMarketplaceSearchResultsStore }) => {
    const { searchResultsStore } = props;

    const [isUnmodeledFilterConfigOpen, setIsUnmodeledFilterConfigOpen] =
      useState(searchResultsStore.filterState.unmodeledDataProducts);

    const handleToggleUnmodeledFilterConfig = () => {
      setIsUnmodeledFilterConfigOpen((prev) => !prev);
    };

    return (
      <Box className="marketplace-lakehouse-search-results__sort-filters">
        <Box className="marketplace-lakehouse-search-results__sort-filters__filter">
          <Typography
            variant="h4"
            className="marketplace-lakehouse-search-results__subtitles"
          >
            Filters
          </Typography>
          <hr />
          <FormGroup>
            <Box className="marketplace-lakehouse-search-results__sort-filters__filter__section-header">
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
            </Box>
            <Box className="marketplace-lakehouse-search-results__sort-filters__filter__section-header">
              <Box
                className="marketplace-lakehouse-search-results__sort-filters__filter__expander"
                onClick={handleToggleUnmodeledFilterConfig}
              >
                {isUnmodeledFilterConfigOpen ? (
                  <ChevronDownIcon />
                ) : (
                  <ChevronRightIcon />
                )}
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      searchResultsStore.filterState.unmodeledDataProducts
                    }
                    onChange={() => {
                      searchResultsStore.handleFilterChange(
                        DataProductFilterType.UNMODELED_DATA_PRODUCTS,
                        undefined,
                      );
                      if (
                        searchResultsStore.filterState.unmodeledDataProducts
                      ) {
                        setIsUnmodeledFilterConfigOpen(true);
                      }
                    }}
                  />
                }
                label="Unmodeled Data Products"
              />
            </Box>
            {isUnmodeledFilterConfigOpen === true && (
              <Box className="marketplace-lakehouse-search-results__sort-filters__filter__unmodeled-config">
                <Box>
                  <FormLabel>Deploy Type</FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          disabled={
                            !searchResultsStore.filterState
                              .unmodeledDataProducts
                          }
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
                          disabled={
                            !searchResultsStore.filterState
                              .unmodeledDataProducts
                          }
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
                          disabled={
                            !searchResultsStore.filterState
                              .unmodeledDataProducts
                          }
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
                          disabled={
                            !searchResultsStore.filterState
                              .unmodeledDataProducts
                          }
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
                    {searchResultsStore.marketplaceBaseStore.applicationStore
                      .config.options.showDevFeatures && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            disabled={
                              !searchResultsStore.filterState
                                .unmodeledDataProducts
                            }
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
                    )}
                  </FormGroup>
                </Box>
              </Box>
            )}
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
              onSearch={(query) => {
                handleSearch(query);
                LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
                  applicationStore.telemetryService,
                  query,
                  LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
                );
              }}
              placeholder="Search Legend Marketplace"
              className="marketplace-lakehouse-search-results__search-bar"
              initialValue={searchQuery}
            />
          </Container>
          <div className="legend-marketplace-search-results__sort-bar">
            <div className="legend-marketplace-search-results__sort-bar__container">
              <Typography
                variant="h4"
                className="marketplace-lakehouse-search-results__subtitles"
              >
                {searchResultsStore.filterSortProducts?.length ?? '0'} Products
              </Typography>
              <FormControl sx={{ width: '8.2rem' }}>
                <Select
                  autoWidth={true}
                  displayEmpty={true}
                  value={'Sort'}
                  onChange={(e) => {
                    searchResultsStore.setSort(
                      e.target.value as DataProductSort,
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: '500',
                      fontSize: '1.6rem',
                      padding: '1rem',
                      minHeight: 'unset !important',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'black',
                      borderRadius: '0rem',
                    },
                  }}
                >
                  <MenuItem disabled={true} value="Sort">
                    Sort
                  </MenuItem>
                  {Object.values(DataProductSort).map((sortValue) => {
                    return (
                      <MenuItem
                        key={sortValue}
                        value={sortValue}
                        sx={{
                          gap: '0.5rem',
                        }}
                      >
                        {sortValue}
                        {searchResultsStore.sort === sortValue && <CheckIcon />}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </div>
          </div>
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
              columns={{ xs: 1, sm: 2, xxl: 4 }}
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
                        if (productCardState instanceof DataProductCardState) {
                          const details = productCardState.dataProductDetails;
                          const origin =
                            details.origin instanceof
                            V1_SdlcDeploymentDataProductOrigin
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
                            },
                            LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
                          );
                        } else if (
                          productCardState instanceof LegacyDataProductCardState
                        ) {
                          LegendMarketplaceTelemetryHelper.logEvent_ClickingLegacyDataProductCard(
                            applicationStore.telemetryService,
                            productCardState,
                            LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
                          );
                        }
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
