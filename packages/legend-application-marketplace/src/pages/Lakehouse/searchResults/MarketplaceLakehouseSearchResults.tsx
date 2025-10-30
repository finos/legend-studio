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
import { useEffect } from 'react';
import {
  CheckIcon,
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
  Grid,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  type LegendMarketplaceSearchResultsStore,
  DataProductSort,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import {
  generateLakehouseSearchResultsRoute,
  LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import { LakehouseProductCard } from '../../../components/LakehouseProductCard/LakehouseProductCard.js';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { generatePathForDataProductSearchResult } from '../../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../../utils/LogUtils.js';

const SearchResultsSortFilterPanel = observer(
  (props: { searchResultsStore: LegendMarketplaceSearchResultsStore }) => {
    const { searchResultsStore } = props;

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
                      searchResultsStore.handleModeledDataProductsFilterToggle()
                    }
                  />
                }
                label="Include Modeled Data Products"
              />
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
        if (
          searchResultsStore.executingSearchState.isInInitialState &&
          searchQuery
        ) {
          searchResultsStore.executeSearch(
            searchQuery,
            auth.user?.access_token,
          );
        }
      }, [auth.user?.access_token, searchQuery, searchResultsStore]);

      const isLoadingDataProducts =
        searchResultsStore.executingSearchState.isInProgress;

      const handleSearch = (query: string | undefined): void => {
        if (query) {
          searchResultsStore.executeSearch(query, auth.user?.access_token);
          searchResultsStore.marketplaceBaseStore.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateLakehouseSearchResultsRoute(query),
          );
        }
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
            {searchResultsStore.marketplaceBaseStore.envState.supportsLegacyDataProducts() && (
              <SearchResultsSortFilterPanel
                searchResultsStore={searchResultsStore}
              />
            )}
            <Grid
              container={true}
              spacing={{ xs: 2, sm: 3, xxl: 4 }}
              columns={{ sm: 1, md: 2, lg: 3, xxl: 4 }}
              className="marketplace-lakehouse-search-results__data-product-cards"
            >
              {searchResultsStore.filterSortProducts?.map(
                (productCardState) => (
                  <Grid key={productCardState.guid} size={1}>
                    <LakehouseProductCard
                      productCardState={productCardState}
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
                          LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
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
