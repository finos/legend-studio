/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { useCallback, useEffect } from 'react';
import { Container, Typography } from '@mui/material';
import { useSyncStateAndSearchParam } from '@finos/legend-application';
import { useSearchParams } from '@finos/legend-application/browser';
import { isNonEmptyString } from '@finos/legend-shared';
import {
  useAccessTokenRef,
  useHasReadSearchParams,
} from '../../../utils/SearchResultsPageHooks.js';
import {
  useLegendMarketplaceLakehouseAccessSearchResultsStore,
  withLegendMarketplaceLakehouseAccessSearchResultsStore,
} from '../../../application/providers/LegendMarketplaceLakehouseAccessSearchResultsStoreProvider.js';
import {
  type DataProductSort,
  SearchResultsViewMode,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import { LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN } from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  LegendMarketplaceSearchBar,
  MarketplaceSearchMode,
} from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LAKEHOUSE_ACCESS_TAB_INTRO_BANNER_TEXT } from '../../../__lib__/LegendMarketplaceSearchMode.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { TimedInfoBanner } from '../../../components/TimedInfoBanner/TimedInfoBanner.js';
import type { ProductCardState } from '../../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { generatePathForDataProductSearchResult } from '../../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../../utils/LogUtils.js';
import { LakehouseAccessSearchFiltersPanel } from '../../../components/LakehouseAccessSearchFiltersPanel/LakehouseAccessSearchFiltersPanel.js';
import { SearchResultsCardGrid } from '../../../components/SearchResultsCardGrid/SearchResultsCardGrid.js';
import { SearchResultsSortControls } from '../../../components/SearchResultsSortControls/SearchResultsSortControls.js';

export const LegendMarketplaceLakehouseAccessSearchResults =
  withLegendMarketplaceLakehouseAccessSearchResultsStore(
    observer(() => {
      const searchResultsStore =
        useLegendMarketplaceLakehouseAccessSearchResultsStore();
      const [searchParams, setSearchParams] = useSearchParams();

      const marketplaceBaseStore = searchResultsStore.marketplaceBaseStore;
      const applicationStore = marketplaceBaseStore.applicationStore;

      const tokenRef = useAccessTokenRef();

      const runSearch = useCallback(() => {
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [searchResultsStore, applicationStore, tokenRef]);

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
        LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        searchParams.get(
          LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY,
        ),
        setSearchParams,
        useCallback(() => true, []),
      );

      // The search param sync above only assigns `searchQuery` when the URL actually
      // carries a `query` param, so on the bare route (arriving from the header tab)
      // it stays `undefined` — see `useHasReadSearchParams` for why the initial search
      // is gated on this instead of on `searchQuery` being defined.
      const hasReadSearchParams = useHasReadSearchParams();

      useEffect(() => {
        if (!hasReadSearchParams) {
          return;
        }
        searchResultsStore.initialize(
          tokenRef.current,
          applicationStore.alertUnhandledError,
        );
      }, [
        hasReadSearchParams,
        searchResultsStore,
        searchResultsStore.searchQuery,
        tokenRef,
        applicationStore,
      ]);

      const isLoadingDataProducts = searchResultsStore.isLoading;

      const handleSearch = (
        _query: string | undefined,
        _mode: MarketplaceSearchMode,
      ): void => {
        // NOTE: the mode switcher is not offered on this tab (`showSettings` is
        // false), so the mode is always LAKEHOUSE_ACCESS and is ignored here.
        if (isNonEmptyString(_query)) {
          searchResultsStore.setSearchQuery(_query);
          LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
            applicationStore.telemetryService,
            _query,
            false,
            LEGEND_MARKETPLACE_PAGE.LAKEHOUSE_ACCESS_PAGE,
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
            LEGEND_MARKETPLACE_PAGE.LAKEHOUSE_ACCESS_PAGE,
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
        <LegendMarketplacePage className="marketplace-lakehouse-search-results marketplace-lakehouse-access-search-results">
          <Container className="marketplace-lakehouse-search-results__search-container">
            <LegendMarketplaceSearchBar
              showSettings={false}
              onSearch={handleSearch}
              stateSearchQuery={searchResultsStore.searchQuery}
              stateSearchMode={MarketplaceSearchMode.LAKEHOUSE_ACCESS}
              placeholder="Search Lakehouse data products"
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
                {`${searchResultsStore.totalItems} Products`}
              </Typography>
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
              <div className="marketplace-lakehouse-search-results__sidebar">
                <LakehouseAccessSearchFiltersPanel
                  store={searchResultsStore}
                  onFiltersChanged={runSearch}
                />
              </div>
              <div className="marketplace-lakehouse-search-results__main-content">
                <TimedInfoBanner className="marketplace-lakehouse-search-results__intro-banner">
                  {LAKEHOUSE_ACCESS_TAB_INTRO_BANNER_TEXT}
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
