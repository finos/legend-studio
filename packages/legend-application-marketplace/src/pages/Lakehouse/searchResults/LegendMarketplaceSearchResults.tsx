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
import { useCallback, useEffect, useRef } from 'react';
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
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { TimedInfoBanner } from '../../../components/TimedInfoBanner/TimedInfoBanner.js';
import { useAuth } from 'react-oidc-context';
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
      const auth = useAuth();
      const [searchParams, setSearchParams] = useSearchParams();

      const marketplaceBaseStore = searchResultsStore.marketplaceBaseStore;
      const applicationStore = marketplaceBaseStore.applicationStore;

      const tokenRef = useRef(auth.user?.access_token);

      useEffect(() => {
        tokenRef.current = auth.user?.access_token;
      }, [auth.user?.access_token]);

      const handleFiltersChanged = useCallback(() => {
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            searchResultsStore.useProducerSearch ?? false,
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [searchResultsStore, applicationStore]);

      useEffect(() => {
        if (searchResultsStore.useProducerSearch === undefined) {
          return;
        }
        searchResultsStore.clearAllFilters();
        searchResultsStore.setPage(1);
        searchResultsStore.setShowAllProducts(false);
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            searchResultsStore.useProducerSearch,
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [
        applicationStore.telemetryService,
        tokenRef,
        searchResultsStore,
        searchResultsStore.searchQuery,
        searchResultsStore.useProducerSearch,
        applicationStore,
      ]);

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
          flowResult(
            searchResultsStore.executeSearch(
              searchResultsStore.searchQuery ?? '',
              searchResultsStore.useProducerSearch ?? false,
              tokenRef.current,
            ),
          ).catch(applicationStore.alertUnhandledError);
        },
        [searchResultsStore, applicationStore],
      );

      const handleItemsPerPageChange = useCallback(
        (itemsPerPage: number) => {
          searchResultsStore.setItemsPerPage(itemsPerPage);
          flowResult(
            searchResultsStore.executeSearch(
              searchResultsStore.searchQuery ?? '',
              searchResultsStore.useProducerSearch ?? false,
              tokenRef.current,
            ),
          ).catch(applicationStore.alertUnhandledError);
        },
        [searchResultsStore, applicationStore],
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
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            searchResultsStore.useProducerSearch ?? false,
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [searchResultsStore, applicationStore]);

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
                    onFiltersChanged={handleFiltersChanged}
                  />
                </div>
              )}
              <div className="marketplace-lakehouse-search-results__main-content">
                {applicationStore.config.options.showDevFeatures && (
                  <TimedInfoBanner className="marketplace-lakehouse-search-results__intro-banner">
                    Results include both DataSpaces (firm&apos;s data-domain
                    artifact for business concepts) and Lakehouse Access items
                    (formerly Data Product). Lakehouse Access is moving to its
                    own tab soon.
                  </TimedInfoBanner>
                )}
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
