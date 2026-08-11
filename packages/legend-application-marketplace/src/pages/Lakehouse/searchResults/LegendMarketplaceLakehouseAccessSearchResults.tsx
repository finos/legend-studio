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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckIcon,
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ViewHeadlineIcon,
  WindowIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  Container,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useSyncStateAndSearchParam } from '@finos/legend-application';
import { useSearchParams } from '@finos/legend-application/browser';
import { isNonEmptyString } from '@finos/legend-shared';
import {
  useLegendMarketplaceLakehouseAccessSearchResultsStore,
  withLegendMarketplaceLakehouseAccessSearchResultsStore,
} from '../../../application/providers/LegendMarketplaceLakehouseAccessSearchResultsStoreProvider.js';
import {
  DataProductSort,
  SearchResultsViewMode,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import type { LegendMarketplaceLakehouseAccessSearchResultsStore } from '../../../stores/lakehouse/LegendMarketplaceLakehouseAccessSearchResultsStore.js';
import { LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN } from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  LegendMarketplaceSearchBar,
  MarketplaceAutosuggestVariant,
  MarketplaceSearchMode,
} from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { LakehouseProductCard } from '../../../components/LakehouseProductCard/LakehouseProductCard.js';
import { LakehouseProductListItem } from '../../../components/LakehouseProductCard/LakehouseProductListItem.js';
import type { ProductCardState } from '../../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { generatePathForDataProductSearchResult } from '../../../utils/SearchUtils.js';
import { logClickingDataProductCard } from '../../../utils/LogUtils.js';
import { PaginationControls } from '../../../components/Pagination/PaginationControls.js';
import { LakehouseAccessSearchFiltersPanel } from '../../../components/LakehouseAccessSearchFiltersPanel/LakehouseAccessSearchFiltersPanel.js';

const LakehouseAccessSearchResultsContent = observer(
  (props: {
    searchResultsStore: LegendMarketplaceLakehouseAccessSearchResultsStore;
    isLoadingDataProducts: boolean;
    handleProductCardClick: (productCardState: ProductCardState) => void;
    handlePageChange: (page: number) => void;
    handleItemsPerPageChange: (itemsPerPage: number) => void;
    handleShowAllProducts: () => void;
  }) => {
    const {
      searchResultsStore,
      isLoadingDataProducts,
      handleProductCardClick,
      handlePageChange,
      handleItemsPerPageChange,
      handleShowAllProducts,
    } = props;

    if (isLoadingDataProducts) {
      return (
        <div className="marketplace-lakehouse-search-results__loading-container">
          <CubesLoadingIndicator
            isLoading={true}
            className="marketplace-lakehouse-search-results__loading-data-products-indicator"
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        </div>
      );
    }
    if (searchResultsStore.totalItems === 0) {
      return (
        <div className="marketplace-lakehouse-search-results__empty-state">
          <Typography
            variant="h5"
            className="marketplace-lakehouse-search-results__empty-state__title"
          >
            No results found
          </Typography>
          <Typography
            variant="body1"
            className="marketplace-lakehouse-search-results__empty-state__message"
          >
            We couldn&apos;t find any data products matching your search. Try
            adjusting your search terms or clearing filters.
          </Typography>
        </div>
      );
    }
    return (
      <>
        {searchResultsStore.viewMode === SearchResultsViewMode.TILE && (
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, xxl: 4 }}
            columns={{ sm: 1, md: 2, lg: 3, xxl: 4 }}
            className="marketplace-lakehouse-search-results__data-product-cards"
          >
            {searchResultsStore.filterSortProducts?.map((productCardState) => (
              <Grid key={productCardState.guid} size={1}>
                <LakehouseProductCard
                  productCardState={productCardState}
                  moreInfoPreview="small"
                  onClick={() => handleProductCardClick(productCardState)}
                />
              </Grid>
            ))}
          </Grid>
        )}
        {searchResultsStore.viewMode === SearchResultsViewMode.LIST && (
          <div className="marketplace-lakehouse-search-results__list-view">
            {searchResultsStore.filterSortProducts?.map((productCardState) => (
              <LakehouseProductListItem
                key={productCardState.guid}
                productCardState={productCardState}
                onClick={handleProductCardClick}
              />
            ))}
          </div>
        )}
        {searchResultsStore.isOnLastPage &&
          !searchResultsStore.showAllProducts &&
          searchResultsStore.hasFilteredDataProducts && (
            <div className="marketplace-lakehouse-search-results__show-all-container">
              <div className="marketplace-lakehouse-search-results__show-all-text-row">
                <Typography
                  variant="body1"
                  className="marketplace-lakehouse-search-results__show-all-text"
                >
                  Can&apos;t find what you&apos;re looking for?
                </Typography>
                <Tooltip
                  title="Data products might be automatically filtered out if they are identified as duplicates (e.g. QA, UAT, DEV)"
                  placement="top"
                  arrow={true}
                >
                  <span className="marketplace-lakehouse-search-results__show-all-info-icon">
                    <InfoCircleIcon />
                  </span>
                </Tooltip>
              </div>
              <button
                className="marketplace-lakehouse-search-results__show-all-btn"
                onClick={handleShowAllProducts}
              >
                Show all data products
              </button>
            </div>
          )}
        <PaginationControls
          totalItems={searchResultsStore.totalItems}
          itemsPerPage={searchResultsStore.itemsPerPage}
          page={searchResultsStore.page}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          disabled={isLoadingDataProducts}
        />
      </>
    );
  },
);

export const LegendMarketplaceLakehouseAccessSearchResults =
  withLegendMarketplaceLakehouseAccessSearchResultsStore(
    observer(() => {
      const searchResultsStore =
        useLegendMarketplaceLakehouseAccessSearchResultsStore();
      const auth = useAuth();
      const [searchParams, setSearchParams] = useSearchParams();

      const marketplaceBaseStore = searchResultsStore.marketplaceBaseStore;
      const applicationStore = marketplaceBaseStore.applicationStore;

      const tokenRef = useRef(auth.user?.access_token);

      useEffect(() => {
        tokenRef.current = auth.user?.access_token;
      }, [auth.user?.access_token]);

      const runSearch = useCallback(() => {
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [searchResultsStore, applicationStore]);

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
      // it stays `undefined`. Gating the initial search on `searchQuery` being defined
      // would therefore hang forever on that route — `isLoading` reports true while the
      // search action is still in its initial state. Instead, wait one commit for the
      // sync effect above to run, then search with whatever we ended up with.
      const [hasReadSearchParams, setHasReadSearchParams] = useState(false);

      useEffect(() => {
        setHasReadSearchParams(true);
      }, []);

      useEffect(() => {
        if (!hasReadSearchParams) {
          return;
        }
        searchResultsStore.clearAllFilters();
        searchResultsStore.setPage(1);
        searchResultsStore.setShowAllProducts(false);
        flowResult(
          searchResultsStore.executeSearch(
            searchResultsStore.searchQuery ?? '',
            tokenRef.current,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }, [
        hasReadSearchParams,
        tokenRef,
        searchResultsStore,
        searchResultsStore.searchQuery,
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
              autosuggestVariant={
                MarketplaceAutosuggestVariant.LAKEHOUSE_ACCESS
              }
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
              <div className="legend-marketplace-search-results__sort-bar__center-slot">
                <Typography className="legend-marketplace-search-results__sort-bar__scope-hint">
                  Searching Data Products for Lakehouse Access. Switch to the
                  DataSpaces tab for data domains.
                </Typography>
              </div>
              <div className="legend-marketplace-search-results__sort-bar__controls">
                <div className="legend-marketplace-search-results__view-toggle">
                  <div
                    className={clsx(
                      'legend-marketplace-search-results__view-toggle__slider',
                      searchResultsStore.viewMode ===
                        SearchResultsViewMode.LIST &&
                        'legend-marketplace-search-results__view-toggle__slider--right',
                    )}
                  />
                  <IconButton
                    className={clsx(
                      'legend-marketplace-search-results__view-toggle__btn',
                      searchResultsStore.viewMode ===
                        SearchResultsViewMode.TILE &&
                        'legend-marketplace-search-results__view-toggle__btn--active',
                    )}
                    onClick={() => {
                      searchResultsStore.setViewMode(
                        SearchResultsViewMode.TILE,
                      );
                      LegendMarketplaceTelemetryHelper.logEvent_ToggleViewMode(
                        applicationStore.telemetryService,
                        SearchResultsViewMode.TILE,
                      );
                    }}
                    title="Tile View"
                    size="small"
                  >
                    <WindowIcon />
                  </IconButton>
                  <IconButton
                    className={clsx(
                      'legend-marketplace-search-results__view-toggle__btn',
                      searchResultsStore.viewMode ===
                        SearchResultsViewMode.LIST &&
                        'legend-marketplace-search-results__view-toggle__btn--active',
                    )}
                    onClick={() => {
                      searchResultsStore.setViewMode(
                        SearchResultsViewMode.LIST,
                      );
                      LegendMarketplaceTelemetryHelper.logEvent_ToggleViewMode(
                        applicationStore.telemetryService,
                        SearchResultsViewMode.LIST,
                      );
                    }}
                    title="List View"
                    size="small"
                  >
                    <ViewHeadlineIcon />
                  </IconButton>
                </div>
                <span className="legend-marketplace-search-results__sort-bar__controls-divider" />
                <FormControl>
                  <Select
                    autoWidth={true}
                    displayEmpty={true}
                    value={'Sort'}
                    onChange={(e) => {
                      searchResultsStore.setSort(
                        e.target.value as DataProductSort,
                      );
                    }}
                    className="legend-marketplace-search-results__sort-select"
                  >
                    <MenuItem disabled={true} value="Sort">
                      Sort
                    </MenuItem>
                    {Object.values(DataProductSort).map((sortValue) => (
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
                    ))}
                  </Select>
                </FormControl>
              </div>
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
                <LakehouseAccessSearchResultsContent
                  searchResultsStore={searchResultsStore}
                  isLoadingDataProducts={isLoadingDataProducts}
                  handleProductCardClick={handleProductCardClick}
                  handlePageChange={handlePageChange}
                  handleItemsPerPageChange={handleItemsPerPageChange}
                  handleShowAllProducts={handleShowAllProducts}
                />
              </div>
            </div>
          </Container>
        </LegendMarketplacePage>
      );
    }),
  );
