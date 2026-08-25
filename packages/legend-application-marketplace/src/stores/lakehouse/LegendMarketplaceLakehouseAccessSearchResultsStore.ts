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

import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type DataProductSearchResponse,
  type MarketplaceServerClient,
  SearchType,
} from '@finos/legend-server-marketplace';
import type { V1_PureGraphManager } from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import type { ProductCardState } from './dataProducts/ProductCardState.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import {
  getOrCreateGraphManager,
  processRawSearchResults,
} from './SearchResultsStoreUtils.js';
import {
  type DataProductSourceFilter,
  type FilterCounts,
  type SourceFilterableSearchStore,
  DataProductSort,
  LEGEND_MARKETPLACE_SETTING_KEY_VIEW_MODE,
  SearchFilterKey,
  SearchResultsViewMode,
} from './LegendMarketplaceSearchResultsStore.js';

/**
 * The subset of {@link LegendMarketplaceLakehouseAccessSearchResultsStore} that
 * {@link LakehouseAccessSearchFiltersPanel} needs, on top of the common
 * {@link SourceFilterableSearchStore} shape shared with the DataSpaces filters panel.
 */
export interface DeploymentIdFilterableSearchStore
  extends SourceFilterableSearchStore {
  selectedDeploymentIds: Set<string>;
  addDeploymentId(value: string): void;
  removeDeploymentId(value: string): void;
}

/**
 * Search results store for the Lakehouse Access experience.
 *
 * This is deliberately a fork of `LegendMarketplaceSearchResultsStore` rather than a
 * parameterization of it. This tab only ever shows Lakehouse Data Products, so producer
 * search (which bypasses the search service and merges in DataSpaces) and the
 * `data_product_type` filter are both meaningless here — the server enforces
 * `data_product_type=lakehouse` on this endpoint and would discard any type filter we sent.
 *
 * Taxonomy is deliberately absent too: the server builds the taxonomy tree unscoped by
 * product type, so its nodes and counts would describe the DataSpace corpus rather than
 * the Lakehouse Data Products this tab shows. Deployment ID takes its place as the
 * Lakehouse-specific narrowing filter.
 */
export class LegendMarketplaceLakehouseAccessSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  searchQuery: string | undefined = undefined;
  productCardStates: ProductCardState[] = [];
  sort: DataProductSort = DataProductSort.DEFAULT;
  viewMode: SearchResultsViewMode;
  selectedSources: Set<DataProductSourceFilter> =
    new Set<DataProductSourceFilter>();
  selectedDeploymentIds: Set<string> = new Set<string>();
  filterCounts: FilterCounts = {
    lakehouse_count: 0,
    legacy_count: 0,
    external_source_count: 0,
    internal_source_count: 0,
  };

  page = 1;
  itemsPerPage = 12;
  totalItems = 0;
  showAllProducts = false;
  hasFilteredDataProducts = false;

  readonly executingSearchState = ActionState.create();
  private _currentFetchToken = 0;
  private _abortController: AbortController | undefined = undefined;
  /**
   * Cache holder for `getOrCreateGraphManager` — a graph manager is expensive to
   * construct and initialize, and is safe to reuse across searches from this store
   * for as long as the store (and the page it backs) is alive.
   */
  private readonly _graphManagerCache: {
    current: V1_PureGraphManager | undefined;
  } = { current: undefined };

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.marketplaceServerClient = marketplaceBaseStore.marketplaceServerClient;

    const persistedViewMode =
      this.marketplaceBaseStore.applicationStore.settingService.getStringValue(
        LEGEND_MARKETPLACE_SETTING_KEY_VIEW_MODE,
      );
    this.viewMode =
      persistedViewMode === SearchResultsViewMode.LIST
        ? SearchResultsViewMode.LIST
        : SearchResultsViewMode.TILE;

    makeObservable<
      LegendMarketplaceLakehouseAccessSearchResultsStore,
      '_currentFetchToken' | '_abortController' | '_graphManagerCache'
    >(this, {
      searchQuery: observable,
      productCardStates: observable,
      sort: observable,
      viewMode: observable,
      selectedSources: observable,
      selectedDeploymentIds: observable,
      filterCounts: observable,
      page: observable,
      itemsPerPage: observable,
      totalItems: observable,
      showAllProducts: observable,
      hasFilteredDataProducts: observable,
      _currentFetchToken: false,
      _abortController: false,
      _graphManagerCache: false,
      setSearchQuery: action,
      setProductCardStates: action,
      setSort: action,
      setViewMode: action,
      setPage: action,
      setItemsPerPage: action,
      setTotalItems: action,
      setShowAllProducts: action,
      setHasFilteredDataProducts: action,
      setFilterCounts: action,
      toggleSource: action,
      addDeploymentId: action,
      removeDeploymentId: action,
      clearAllFilters: action,
      filterSortProducts: computed,
      isLoading: computed,
      isFirstLoad: computed,
      isOnLastPage: computed,
      hasActiveFilters: computed,
      executeSearch: flow,
    });
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  get isOnLastPage(): boolean {
    if (this.totalItems === 0) {
      return false;
    }
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    return this.page >= totalPages;
  }

  get filterSortProducts(): ProductCardState[] | undefined {
    const filtered = this.productCardStates.filter((productCardState) =>
      this.marketplaceBaseStore.envState.filterDataProduct(productCardState),
    );
    return filtered.sort((a, b) => {
      switch (this.sort) {
        case DataProductSort.DEFAULT:
          return 0;
        case DataProductSort.NAME_ALPHABETICAL:
          return a.title.localeCompare(b.title);
        case DataProductSort.NAME_REVERSE_ALPHABETICAL:
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }

  get isLoading(): boolean {
    return (
      this.executingSearchState.isInProgress ||
      this.executingSearchState.isInInitialState
    );
  }

  get isFirstLoad(): boolean {
    return this.executingSearchState.isInInitialState;
  }

  setPage(value: number): void {
    this.page = value;
  }

  setItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.page = 1;
  }

  setTotalItems(value: number): void {
    this.totalItems = value;
  }

  setShowAllProducts(value: boolean): void {
    this.showAllProducts = value;
  }

  setHasFilteredDataProducts(value: boolean): void {
    this.hasFilteredDataProducts = value;
  }

  setProductCardStates(dataProductCardStates: ProductCardState[]): void {
    this.productCardStates = dataProductCardStates;
  }

  setSort(sort: DataProductSort): void {
    this.sort = sort;
  }

  setViewMode(viewMode: SearchResultsViewMode): void {
    this.viewMode = viewMode;
    this.marketplaceBaseStore.applicationStore.settingService.persistValue(
      LEGEND_MARKETPLACE_SETTING_KEY_VIEW_MODE,
      viewMode,
    );
  }

  setFilterCounts(counts: FilterCounts): void {
    this.filterCounts = counts;
  }

  toggleSource(value: DataProductSourceFilter): void {
    const wasSelected = this.selectedSources.has(value);
    if (wasSelected) {
      this.selectedSources.delete(value);
    } else {
      this.selectedSources.add(value);
    }
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'source',
      value,
      wasSelected ? 'deselect' : 'select',
      this.searchQuery,
    );
  }

  /**
   * Deployment IDs are entered free-form rather than picked from a facet: the search
   * response carries no list of available deployment IDs, and deriving one from the
   * current page would silently omit matches on other pages.
   */
  addDeploymentId(value: string): void {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return;
    }
    trimmedValue
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .forEach((part) => this.selectedDeploymentIds.add(part));
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'deployment_id',
      trimmedValue,
      'select',
      this.searchQuery,
    );
  }

  removeDeploymentId(value: string): void {
    this.selectedDeploymentIds.delete(value);
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'deployment_id',
      value,
      'deselect',
      this.searchQuery,
    );
  }

  clearAllFilters(): void {
    this.selectedSources.clear();
    this.selectedDeploymentIds.clear();
  }

  /**
   * Resets filters and pagination, then runs the first search for this tab. Called
   * once by the page, after it has given URL param sync a chance to populate
   * `searchQuery` — kept here rather than as an inline effect so the page doesn't
   * need to re-sequence "reset then search" itself.
   */
  initialize(token: string | undefined, onError: (error: Error) => void): void {
    this.clearAllFilters();
    this.setPage(1);
    this.setShowAllProducts(false);
    flowResult(this.executeSearch(this.searchQuery ?? '', token)).catch(
      onError,
    );
  }

  get hasActiveFilters(): boolean {
    return this.selectedSources.size > 0 || this.selectedDeploymentIds.size > 0;
  }

  /**
   * NOTE: deliberately never emits `data_product_type`. The Lakehouse Access endpoint
   * enforces that filter server-side and would silently discard whatever we sent.
   */
  buildSearchFilters(): string[] {
    const filters: string[] = [];
    if (this.selectedSources.size > 0) {
      filters.push(
        `${SearchFilterKey.DATA_PRODUCT_SOURCE}=${Array.from(this.selectedSources).join(',')}`,
      );
    }
    if (this.selectedDeploymentIds.size > 0) {
      filters.push(
        `${SearchFilterKey.DEPLOYMENT_ID}=${Array.from(this.selectedDeploymentIds).join(',')}`,
      );
    }
    return filters;
  }

  *executeSearch(query: string, token: string | undefined): GeneratorFn<void> {
    const fetchToken = ++this._currentFetchToken;

    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this.executingSearchState.inProgress();

    try {
      this.setProductCardStates([]);

      const searchFilters = this.buildSearchFilters();

      const graphManager = yield* getOrCreateGraphManager(
        this.marketplaceBaseStore,
        this._graphManagerCache,
      );

      const rawResults =
        (yield this.marketplaceServerClient.lakehouseAccessSearch(
          query,
          this.marketplaceBaseStore.envState.lakehouseEnvironment,
          {
            searchType: SearchType.FULL_TEXT,
            searchFilters,
            pageSize: this.itemsPerPage,
            pageNumber: this.page,
            showAll: this.showAllProducts,
            signal,
          },
        )) as PlainObject<DataProductSearchResponse>;

      if (signal.aborted || fetchToken !== this._currentFetchToken) {
        return;
      }

      const { productCardStates, response } = processRawSearchResults(
        this.marketplaceBaseStore,
        rawResults,
        graphManager,
        token,
      );

      this.setTotalItems(response.metadata.total_count);
      this.setHasFilteredDataProducts(
        response.metadata.has_filtered_products ?? false,
      );
      this.setProductCardStates(productCardStates);

      this.setFilterCounts({
        lakehouse_count: response.metadata.lakehouse_count ?? 0,
        legacy_count: response.metadata.legacy_count ?? 0,
        external_source_count: response.metadata.external_source_count ?? 0,
        internal_source_count: response.metadata.internal_source_count ?? 0,
      });

      this.executingSearchState.pass();
    } catch (error) {
      if (fetchToken !== this._currentFetchToken) {
        return;
      }
      assertErrorThrown(error);
      this.executingSearchState.fail();
      this.marketplaceBaseStore.applicationStore.logService.error(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.LAKEHOUSE_ACCESS_SEARCH_FAILURE,
        ),
        error,
      );
      if (
        this.marketplaceBaseStore.applicationStore.config.options
          .showDevFeatures
      ) {
        this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
          error,
          `Error executing search: ${error.name}\n${error.message}\n${error.cause}\n${error.stack}`,
        );
      } else {
        this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
          `Error executing search: ${error.message}`,
        );
      }
    }
  }

  dispose(): void {
    this._abortController?.abort();
    this._abortController = undefined;
  }
}
