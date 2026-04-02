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
import {
  DataProductSort,
  SearchResultsViewMode,
  type LegendMarketplaceSearchResultsStore,
} from '../../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';
import { LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN } from '../../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useAuth } from 'react-oidc-context';
import { LakehouseProductCard } from '../../../components/LakehouseProductCard/LakehouseProductCard.js';
import { LakehouseProductListItem } from '../../../components/LakehouseProductCard/LakehouseProductListItem.js';
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
import { PaginationControls } from '../../../components/Pagination/PaginationControls.js';
import { MarketplaceSearchFiltersPanel } from '../../../components/MarketplaceSearchFiltersPanel/MarketplaceSearchFiltersPanel.js';

const SearchResultsContent = observer(
  (props: {
    searchResultsStore: LegendMarketplaceSearchResultsStore;
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
          !searchResultsStore.showAllProducts && (
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
        _useProducerSearch: boolean,
      ): void => {
        if (isNonEmptyString(_query)) {
          searchResultsStore.setSearchQuery(_query);
          searchResultsStore.setUseProducerSearch(_useProducerSearch);
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
        searchResultsStore.setShowAllProducts(true);
      }, [searchResultsStore]);

      return (
        <LegendMarketplacePage className="marketplace-lakehouse-search-results">
          <Container className="marketplace-lakehouse-search-results__search-container">
            <LegendMarketplaceSearchBar
              showSettings={true}
              onSearch={handleSearch}
              stateSearchQuery={searchResultsStore.searchQuery}
              stateUseProducerSearch={searchResultsStore.useProducerSearch}
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
              {!searchResultsStore.useProducerSearch && (
                <div className="marketplace-lakehouse-search-results__sidebar">
                  <MarketplaceSearchFiltersPanel store={searchResultsStore} />
                </div>
              )}
              <div className="marketplace-lakehouse-search-results__main-content">
                <SearchResultsContent
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
