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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  DataProductSearchResponse,
  ErrorDataProductSearchResultDetails,
  LakehouseDataProductSearchResultDetails,
  type MarketplaceServerClient,
  SearchType,
} from '@finos/legend-server-marketplace';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { V1_PureGraphManager } from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { ProductCardState } from './dataProducts/ProductCardState.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import {
  type DataProductSourceFilter,
  type FilterCounts,
  DataProductSort,
  LEGEND_MARKETPLACE_SETTING_KEY_VIEW_MODE,
  SearchResultsViewMode,
} from './LegendMarketplaceSearchResultsStore.js';

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
      '_currentFetchToken' | '_abortController'
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
    if (this.selectedSources.has(value)) {
      this.selectedSources.delete(value);
    } else {
      this.selectedSources.add(value);
    }
  }

  /**
   * Deployment IDs are entered free-form rather than picked from a facet: the search
   * response carries no list of available deployment IDs, and deriving one from the
   * current page would silently omit matches on other pages.
   */
  addDeploymentId(value: string): void {
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .forEach((part) => this.selectedDeploymentIds.add(part));
  }

  removeDeploymentId(value: string): void {
    this.selectedDeploymentIds.delete(value);
  }

  clearAllFilters(): void {
    this.selectedSources.clear();
    this.selectedDeploymentIds.clear();
  }

  get hasActiveFilters(): boolean {
    return this.selectedSources.size > 0 || this.selectedDeploymentIds.size > 0;
  }

  /**
   * NOTE: deliberately never emits `data_product_type`. The Lakehouse Access endpoint
   * enforces that filter server-side and would silently discard whatever we sent.
   */
  private buildSearchFilters(): string[] {
    const filters: string[] = [];
    if (this.selectedSources.size > 0) {
      filters.push(
        `data_product_source=${Array.from(this.selectedSources).join(',')}`,
      );
    }
    if (this.selectedDeploymentIds.size > 0) {
      filters.push(
        `deployment_id=${Array.from(this.selectedDeploymentIds).join(',')}`,
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

      // Create graph manager for parsing ad-hoc deployed data products
      const graphManager = new V1_PureGraphManager(
        this.marketplaceBaseStore.applicationStore.pluginManager,
        this.marketplaceBaseStore.applicationStore.logService,
        this.marketplaceBaseStore.remoteEngine,
      );
      yield graphManager.initialize(
        {
          env: this.marketplaceBaseStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl:
              this.marketplaceBaseStore.applicationStore.config.engineServerUrl,
          },
        },
        { engine: this.marketplaceBaseStore.remoteEngine },
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

      if (fetchToken !== this._currentFetchToken) {
        return;
      }

      const { productCardStates, response } = this.processRawSearchResults(
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
    } catch (error) {
      if (fetchToken !== this._currentFetchToken) {
        return;
      }
      assertErrorThrown(error);
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
    } finally {
      if (fetchToken === this._currentFetchToken) {
        this.executingSearchState.complete();
      }
    }
  }

  private processRawSearchResults(
    rawResults: PlainObject<DataProductSearchResponse>,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): {
    productCardStates: ProductCardState[];
    response: DataProductSearchResponse;
  } {
    const response =
      DataProductSearchResponse.serialization.fromJson(rawResults);

    const validResults = response.results.filter(
      (result) =>
        !(
          result.dataProductDetails instanceof
          ErrorDataProductSearchResultDetails
        ) &&
        !(
          result.dataProductDetails instanceof
            LakehouseDataProductSearchResultDetails &&
          result.dataProductDetails.origin === null
        ),
    );

    const usedImages = new Set<string>();
    const productCardStates: ProductCardState[] = validResults.map(
      (result) =>
        new ProductCardState(
          this.marketplaceBaseStore,
          result,
          graphManager,
          new Map(),
          usedImages,
        ),
    );
    productCardStates.forEach((dataProductState) =>
      dataProductState.init(token),
    );

    return { productCardStates, response };
  }

  dispose(): void {
    this._abortController?.abort();
    this._abortController = undefined;
  }
}
