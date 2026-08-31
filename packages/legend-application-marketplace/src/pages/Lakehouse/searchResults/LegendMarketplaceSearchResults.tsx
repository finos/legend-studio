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
import { flowResult } from 'mobx';
import {
  useLegendMarketplaceSearchResultsStore,
  withLegendMarketplaceSearchResultsStore,
} from '../../../application/providers/LegendMarketplaceSearchResultsStoreProvider.js';
import { useCallback, useEffect } from 'react';
import { Container, Typography } from '@mui/material';
import {
  type DataProductSort,
  SearchResultViewOption,
  SearchResultsViewMode,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import {
  generateFieldSearchResultsRoute,
  generateLakehouseAccessSearchResultsRoute,
  LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  LegendMarketplaceSearchBar,
  MarketplaceSearchMode,
} from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { DATA_SPACES_LAKEHOUSE_ACCESS_INTRO_BANNER_TEXT } from '../../../__lib__/LegendMarketplaceSearchMode.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { TimedInfoBanner } from '../../../components/TimedInfoBanner/TimedInfoBanner.js';
import {
  useAccessTokenRef,
  useHasReadSearchParams,
} from '../../../utils/SearchResultsPageHooks.js';
import type { ProductCardState } from '../../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { generatePathForDataProductSearchResult } from '../../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../../utils/LogUtils.js';
import { useSyncStateAndSearchParam } from '@finos/legend-application';
import { useSearchParams } from '@finos/legend-application/browser';
import { isNonEmptyString } from '@finos/legend-shared';
import { MarketplaceSearchFiltersPanel } from '../../../components/MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';
import { LegendMarketplaceOptionSelector } from '../../../components/OptionSelector/LegendMarketplaceOptionSelector.js';
import { SearchResultsCardGrid } from '../../../components/SearchResultsCardGrid/SearchResultsCardGrid.js';
import { SearchResultsSortControls } from '../../../components/SearchResultsSortControls/SearchResultsSortControls.js';

export const LegendMarketplaceSearchResults =
  withLegendMarketplaceSearchResultsStore(
    observer(() => {
      const searchResultsStore = useLegendMarketplaceSearchResultsStore();
      const [searchParams, setSearchParams] = useSearchParams();

      const marketplaceBaseStore = searchResultsStore.marketplaceBaseStore;
      const applicationStore = marketplaceBaseStore.applicationStore;

      const tokenRef = useAccessTokenRef();

      const runSearch = useCallback(() => {
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            searchResultsStore.useProducerSearch ?? false,
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [searchResultsStore, applicationStore, tokenRef]);

      useSyncStateAndSearchParam(
        searchResultsStore.useProducerSearch,
        useCallback(
          (val: string | null) => {
            searchResultsStore.setUseProducerSearch(val === 'true');
          },
          [searchResultsStore],
        ),
        LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.USE_PRODUCER_SEARCH,
        searchParams.get(
          LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.USE_PRODUCER_SEARCH,
        ),
        setSearchParams,
        useCallback(() => true, []),
      );

      useSyncStateAndSearchParam(
        searchResultsStore.searchQuery,
        useCallback(
          (val: string | null) => {
            if (val !== null) {
              searchResultsStore.setSearchQuery(val);
            }
          },
          [searchResultsStore],
        ),
        LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        searchParams.get(
          LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        ),
        setSearchParams,
        useCallback(() => true, []),
      );

      // See `useHasReadSearchParams` for why the initial search is gated on this
      // rather than on `useProducerSearch`/`searchQuery` being defined.
      const hasReadSearchParams = useHasReadSearchParams();

      useEffect(() => {
        if (!hasReadSearchParams) {
          return;
        }
        searchResultsStore.clearAllFilters();
        searchResultsStore.setPage(1);
        searchResultsStore.setShowAllProducts(false);
        runSearch();
      }, [
        hasReadSearchParams,
        searchResultsStore,
        searchResultsStore.searchQuery,
        searchResultsStore.useProducerSearch,
        runSearch,
      ]);

      const isLoadingDataProducts = searchResultsStore.isLoading;

      const handleSearch = (
        _query: string | undefined,
        _mode: MarketplaceSearchMode,
      ): void => {
        if (isNonEmptyString(_query)) {
          if (_mode === MarketplaceSearchMode.DATA_FIELDS) {
            applicationStore.navigationService.navigator.goToLocation(
              generateFieldSearchResultsRoute(_query),
            );
            LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
              applicationStore.telemetryService,
              _query,
              false,
              LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
              true,
            );
            return;
          }
          if (_mode === MarketplaceSearchMode.LAKEHOUSE_ACCESS) {
            applicationStore.navigationService.navigator.goToLocation(
              generateLakehouseAccessSearchResultsRoute(_query),
            );
            LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
              applicationStore.telemetryService,
              _query,
              false,
              LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
            );
            return;
          }
          searchResultsStore.setSearchQuery(_query);
          searchResultsStore.setUseProducerSearch(
            _mode === MarketplaceSearchMode.PRODUCER,
          );
          LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
            applicationStore.telemetryService,
            searchResultsStore.searchQuery,
            searchResultsStore.useProducerSearch ?? false,
            LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
          );
        }
      };

      const handlePageChange = useCallback(
        (page: number) => {
          searchResultsStore.setPage(page);
          runSearch();
        },
        [searchResultsStore, runSearch],
      );

      const handleItemsPerPageChange = useCallback(
        (itemsPerPage: number) => {
          searchResultsStore.setItemsPerPage(itemsPerPage);
          runSearch();
        },
        [searchResultsStore, runSearch],
      );

      const handleProductCardClick = useCallback(
        (productCardState: ProductCardState) => {
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
        },
        [applicationStore],
      );
      const handleShowAllProducts = useCallback(() => {
        LegendMarketplaceTelemetryHelper.logEvent_ShowAllDataProducts(
          applicationStore.telemetryService,
          searchResultsStore.searchQuery,
        );
        searchResultsStore.setShowAllProducts(true);
        runSearch();
      }, [searchResultsStore, applicationStore, runSearch]);

      return (
        <LegendMarketplacePage className="marketplace-lakehouse-search-results">
          <Container className="marketplace-lakehouse-search-results__search-container">
            <LegendMarketplaceSearchBar
              showSettings={true}
              onSearch={handleSearch}
              stateSearchQuery={searchResultsStore.searchQuery}
              stateSearchMode={
                searchResultsStore.useProducerSearch === true
                  ? MarketplaceSearchMode.PRODUCER
                  : MarketplaceSearchMode.DATA_SPACES
              }
              placeholder="Search Legend Marketplace"
              className="marketplace-lakehouse-search-results__search-bar"
              enableAutosuggest={false}
            />
          </Container>
          <div className="legend-marketplace-search-results__sort-bar">
            <div className="legend-marketplace-search-results__sort-bar__container">
              <Typography
                variant="h4"
                className="marketplace-lakehouse-search-results__subtitles"
              >
                {searchResultsStore.useProducerSearch
                  ? `${searchResultsStore.filterSortProducts?.length ?? 0} Products`
                  : `${searchResultsStore.totalItems} Products`}
              </Typography>
              <div className="legend-marketplace-search-results__sort-bar__center-slot">
                {isNonEmptyString(searchResultsStore.searchQuery) && (
                  <div className="legend-marketplace-search-results__search-type-tabs">
                    <LegendMarketplaceOptionSelector
                      options={[
                        SearchResultViewOption.DATA_SPACES,
                        SearchResultViewOption.DATA_FIELDS,
                      ]}
                      selectedOption={SearchResultViewOption.DATA_SPACES}
                      onChange={(option) => {
                        if (option === SearchResultViewOption.DATA_FIELDS) {
                          applicationStore.navigationService.navigator.goToLocation(
                            generateFieldSearchResultsRoute(
                              searchResultsStore.searchQuery,
                            ),
                          );
                        }
                      }}
                      ariaLabel="Search result type"
                    />
                  </div>
                )}
              </div>
              <SearchResultsSortControls
                viewMode={searchResultsStore.viewMode}
                onTileViewClick={() => {
                  searchResultsStore.setViewMode(SearchResultsViewMode.TILE);
                  LegendMarketplaceTelemetryHelper.logEvent_ToggleViewMode(
                    applicationStore.telemetryService,
                    SearchResultsViewMode.TILE,
                  );
                }}
                onListViewClick={() => {
                  searchResultsStore.setViewMode(SearchResultsViewMode.LIST);
                  LegendMarketplaceTelemetryHelper.logEvent_ToggleViewMode(
                    applicationStore.telemetryService,
                    SearchResultsViewMode.LIST,
                  );
                }}
                sort={searchResultsStore.sort}
                onSortChange={(sort: DataProductSort) => {
                  searchResultsStore.setSort(sort);
                }}
              />
            </div>
          </div>
          <Container
            maxWidth="xxxl"
            className="marketplace-lakehouse-search-results__results-container"
          >
            <div className="marketplace-lakehouse-search-results__results-layout">
              {!searchResultsStore.useProducerSearch && (
                <div className="marketplace-lakehouse-search-results__sidebar">
                  <MarketplaceSearchFiltersPanel
                    store={searchResultsStore}
                    onFiltersChanged={runSearch}
                  />
                </div>
              )}
              <div className="marketplace-lakehouse-search-results__main-content">
                <TimedInfoBanner className="marketplace-lakehouse-search-results__intro-banner">
                  {DATA_SPACES_LAKEHOUSE_ACCESS_INTRO_BANNER_TEXT}
                </TimedInfoBanner>
                <SearchResultsCardGrid
                  isLoading={isLoadingDataProducts}
                  totalItems={searchResultsStore.totalItems}
                  viewMode={searchResultsStore.viewMode}
                  products={searchResultsStore.filterSortProducts}
                  onProductCardClick={handleProductCardClick}
                  canShowAll={
                    searchResultsStore.isOnLastPage &&
                    !searchResultsStore.showAllProducts &&
                    !searchResultsStore.useProducerSearch &&
                    searchResultsStore.hasFilteredDataProducts
                  }
                  onShowAllProducts={handleShowAllProducts}
                  itemsPerPage={searchResultsStore.itemsPerPage}
                  page={searchResultsStore.page}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            </div>
          </Container>
        </LegendMarketplacePage>
      );
    }),
  );
