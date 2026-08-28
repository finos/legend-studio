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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  isNonNullable,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  DataProductSearchResult,
  DataProductSearchResultDetailsType,
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultOriginType,
  LakehouseSDLCDataProductSearchResultOrigin,
  type MarketplaceServerClient,
  SearchType,
  type TaxonomyNode,
} from '@finos/legend-server-marketplace';
import { ProductCardState } from './dataProducts/ProductCardState.js';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  V1_entitlementsDataProductLiteResponseToDataProductLite,
  type V1_PureGraphManager,
  extractPackagePathFromPath,
  extractElementNameFromPath,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { StoredSummaryEntity, DepotScope } from '@finos/legend-server-depot';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import {
  getOrCreateGraphManager,
  processRawSearchResults,
} from './SearchResultsStoreUtils.js';

export const TAXONOMY_UNDEFINED_NODE_ID = '__undefined__';

export enum DataProductSort {
  DEFAULT = 'Default',
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export enum DataProductTypeFilter {
  LAKEHOUSE = 'lakehouse',
  LEGACY = 'legacy',
}

export enum DataProductSourceFilter {
  EXTERNAL = 'External',
  INTERNAL = 'Internal',
}

/**
 * Query-string keys accepted by the `search_filters` parameter on the
 * DataSpaces and Lakehouse Access search endpoints.
 */
export enum SearchFilterKey {
  DATA_PRODUCT_TYPE = 'data_product_type',
  DATA_PRODUCT_SOURCE = 'data_product_source',
  LICENSE_TO = 'license_to',
  TAXONOMY = 'taxonomy',
  DEPLOYMENT_ID = 'deployment_id',
}

export enum DataProductLicenseFilter {
  ENTERPRISE = 'Enterprise',
  LIMITED_ENTERPRISE = 'Limited Enterprise',
  RESTRICTED = 'Restricted',
  UNDEFINED = 'Unknown',
}

// Display label for a license value. The backend returns/expects
// 'Limited Enterprise', but the UI should show 'Partial Enterprise' for it.
// Used both for the license filter options and the license tag shown on
// individual data product cards.
export const getDataProductLicenseDisplayLabel = (license: string): string =>
  license === DataProductLicenseFilter.LIMITED_ENTERPRISE
    ? 'Partial Enterprise'
    : license;

const DATA_PRODUCT_LICENSE_TOOLTIPS: Record<DataProductLicenseFilter, string> =
  {
    [DataProductLicenseFilter.ENTERPRISE]:
      'Data product available for firmwide use without requesting access',
    [DataProductLicenseFilter.LIMITED_ENTERPRISE]:
      'Data product with some Access Point Groups available enterprise-wide; others require requesting access',
    [DataProductLicenseFilter.RESTRICTED]:
      'Data product that requires requesting access before you can query it',
    [DataProductLicenseFilter.UNDEFINED]:
      'Data product with no license defined',
  };

export const getDataProductLicenseTooltip = (
  license: DataProductLicenseFilter,
): string => DATA_PRODUCT_LICENSE_TOOLTIPS[license];

export interface FilterCounts {
  lakehouse_count: number;
  legacy_count: number;
  external_source_count: number;
  internal_source_count: number;
}

/**
 * Which {@link FilterCounts} key backs the count shown next to each
 * {@link DataProductSourceFilter} option. A lookup table rather than a ternary so a
 * third source value can't silently fall through to the wrong count.
 */
export const SOURCE_FILTER_COUNT_KEY: Record<
  DataProductSourceFilter,
  keyof FilterCounts
> = {
  [DataProductSourceFilter.EXTERNAL]: 'external_source_count',
  [DataProductSourceFilter.INTERNAL]: 'internal_source_count',
};

export enum SearchResultsViewMode {
  TILE = 'tile',
  LIST = 'list',
}

export enum SearchResultViewOption {
  DATA_SPACES = 'Dataspaces',
  DATA_FIELDS = 'Data Fields',
}

export const LEGEND_MARKETPLACE_SETTING_KEY_VIEW_MODE =
  'marketplace.search-results.viewMode';

/**
 * The subset of a search results store that {@link SourceFilterSection} (the "Source"
 * filter section shared by every search experience's filters panel) needs.
 *
 * Declared structurally so that any search experience can reuse the section. The
 * concrete stores have private members, which would otherwise make them mutually
 * incompatible even where their public shapes match.
 */
export interface SourceFilterableSearchStore {
  searchQuery: string | undefined;
  selectedSources: Set<DataProductSourceFilter>;
  filterCounts: FilterCounts;
  hasActiveFilters: boolean;
  isFirstLoad: boolean;
  toggleSource(value: DataProductSourceFilter): void;
  clearAllFilters(): void;
  setPage(value: number): void;
}

/**
 * The subset of a search results store that {@link MarketplaceSearchFiltersPanel} needs.
 * Extends {@link SourceFilterableSearchStore} with the taxonomy- and license-specific
 * members that only the DataSpaces search experience has.
 */
export interface TaxonomyFilterableSearchStore
  extends SourceFilterableSearchStore {
  taxonomyTree: TaxonomyNode[];
  selectedTaxonomyNodeIds: Set<string>;
  selectedLicenses: Set<DataProductLicenseFilter>;
  totalItems: number;
  toggleTaxonomyNode(nodeId: string): void;
  simpleToggleTaxonomyNode(nodeId: string): void;
  toggleLicense(value: DataProductLicenseFilter): void;
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  searchQuery: string | undefined = undefined;
  private _lastTaxonomyQueryKey: string | undefined = undefined;
  useProducerSearch: boolean | undefined = undefined;
  semanticSearchProductCardStates: ProductCardState[] = [];
  producerSearchDataProductCardStates: ProductCardState[] = [];
  producerSearchLegacyDataProductCardStates: ProductCardState[] = [];
  sort: DataProductSort = DataProductSort.DEFAULT;
  viewMode: SearchResultsViewMode;
  taxonomyTree: TaxonomyNode[] = [];
  selectedTaxonomyNodeIds: Set<string> = new Set<string>();
  selectedDataProductTypes: Set<DataProductTypeFilter> =
    new Set<DataProductTypeFilter>();
  selectedSources: Set<DataProductSourceFilter> =
    new Set<DataProductSourceFilter>();
  selectedLicenses: Set<DataProductLicenseFilter> =
    new Set<DataProductLicenseFilter>();
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

  readonly executingSemanticSearchState = ActionState.create();
  readonly fetchingProducerSearchDataProductsState = ActionState.create();
  readonly fetchingProducerSearchLegacyDataProductsState = ActionState.create();
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
      LegendMarketplaceSearchResultsStore,
      '_lastTaxonomyQueryKey' | '_graphManagerCache'
    >(this, {
      searchQuery: observable,
      useProducerSearch: observable,
      semanticSearchProductCardStates: observable,
      producerSearchDataProductCardStates: observable,
      producerSearchLegacyDataProductCardStates: observable,
      sort: observable,
      viewMode: observable,
      taxonomyTree: observable,
      selectedTaxonomyNodeIds: observable,
      selectedDataProductTypes: observable,
      selectedSources: observable,
      selectedLicenses: observable,
      filterCounts: observable,
      _lastTaxonomyQueryKey: false,
      _graphManagerCache: false,
      setSearchQuery: action,
      setUseProducerSearch: action,
      page: observable,
      itemsPerPage: observable,
      totalItems: observable,
      showAllProducts: observable,
      hasFilteredDataProducts: observable,
      setSemanticSearchProductCardStates: action,
      setProducerSearchDataProductCardStates: action,
      setProducerSearchLegacyDataProductCardStates: action,
      setSort: action,
      setViewMode: action,
      setPage: action,
      setItemsPerPage: action,
      setTotalItems: action,
      setShowAllProducts: action,
      setHasFilteredDataProducts: action,
      setTaxonomyTree: action,
      setFilterCounts: action,
      setSelectedTaxonomyNodeIds: action,
      toggleTaxonomyNode: action,
      simpleToggleTaxonomyNode: action,
      toggleDataProductType: action,
      toggleSource: action,
      toggleLicense: action,
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

  setUseProducerSearch(value: boolean): void {
    this.useProducerSearch = value;
  }

  get isOnLastPage(): boolean {
    if (this.totalItems === 0) {
      return false;
    }
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    return this.page >= totalPages;
  }

  get filterSortProducts(): ProductCardState[] | undefined {
    const productCardStates = this.useProducerSearch
      ? [
          ...this.producerSearchDataProductCardStates,
          ...this.producerSearchLegacyDataProductCardStates,
        ].sort((a, b) => a.title.localeCompare(b.title))
      : this.semanticSearchProductCardStates;
    let filtered = productCardStates.filter((productCardState) =>
      this.marketplaceBaseStore.envState.filterDataProduct(productCardState),
    );
    if (this.useProducerSearch && this.selectedTaxonomyNodeIds.size > 0) {
      filtered = filtered.filter((productCardState) => {
        const productTaxonomyPaths =
          productCardState.searchResult.tags2.flatMap((tag) =>
            tag.split(',').map((t) => t.trim()),
          );
        return productTaxonomyPaths.some((path) =>
          Array.from(this.selectedTaxonomyNodeIds).some(
            (selectedId) =>
              path === selectedId || path.startsWith(`${selectedId}::`),
          ),
        );
      });
    }
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
    return this.useProducerSearch
      ? this.fetchingProducerSearchDataProductsState.isInProgress ||
          this.fetchingProducerSearchDataProductsState.isInInitialState ||
          this.fetchingProducerSearchLegacyDataProductsState.isInProgress
      : this.executingSemanticSearchState.isInProgress ||
          this.executingSemanticSearchState.isInInitialState;
  }

  get isFirstLoad(): boolean {
    return this.executingSemanticSearchState.isInInitialState;
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

  setSemanticSearchProductCardStates(
    dataProductCardStates: ProductCardState[],
  ): void {
    this.semanticSearchProductCardStates = dataProductCardStates;
  }

  setProducerSearchDataProductCardStates(
    dataProductCardStates: ProductCardState[],
  ): void {
    this.producerSearchDataProductCardStates = dataProductCardStates;
  }

  setProducerSearchLegacyDataProductCardStates(
    dataProductCardStates: ProductCardState[],
  ): void {
    this.producerSearchLegacyDataProductCardStates = dataProductCardStates;
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

  setTaxonomyTree(tree: TaxonomyNode[]): void {
    this.taxonomyTree = tree;
  }

  setFilterCounts(counts: FilterCounts): void {
    this.filterCounts = counts;
  }

  setSelectedTaxonomyNodeIds(ids: string[]): void {
    this.selectedTaxonomyNodeIds = new Set(ids);
  }

  private collectAllNodeIds(node: TaxonomyNode): string[] {
    const ids: string[] = [node.id];
    for (const child of node.children) {
      ids.push(...this.collectAllNodeIds(child));
    }
    return ids;
  }

  private findNode(
    nodes: TaxonomyNode[],
    nodeId: string,
  ): TaxonomyNode | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      const found = this.findNode(node.children, nodeId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private findAncestorPath(
    nodes: TaxonomyNode[],
    nodeId: string,
    currentPath: TaxonomyNode[] = [],
  ): TaxonomyNode[] | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return [...currentPath];
      }
      const found = this.findAncestorPath(node.children, nodeId, [
        ...currentPath,
        node,
      ]);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  toggleTaxonomyNode(nodeId: string): void {
    const wasSelected = this.selectedTaxonomyNodeIds.has(nodeId);
    if (wasSelected) {
      this.deselectTaxonomyNode(nodeId);
    } else {
      this.selectTaxonomyNode(nodeId);
    }
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'taxonomy',
      nodeId,
      wasSelected ? 'deselect' : 'select',
      this.searchQuery,
    );
  }

  private deselectTaxonomyNode(nodeId: string): void {
    const node = this.findNode(this.taxonomyTree, nodeId);
    if (node) {
      const idsToRemove = this.collectAllNodeIds(node);
      for (const id of idsToRemove) {
        this.selectedTaxonomyNodeIds.delete(id);
      }
    } else {
      this.selectedTaxonomyNodeIds.delete(nodeId);
    }
  }

  private selectTaxonomyNode(nodeId: string): void {
    const node = this.findNode(this.taxonomyTree, nodeId);
    if (node) {
      const idsToAdd = this.collectAllNodeIds(node);
      for (const id of idsToAdd) {
        this.selectedTaxonomyNodeIds.add(id);
      }
    } else {
      this.selectedTaxonomyNodeIds.add(nodeId);
    }
    const ancestors = this.findAncestorPath(this.taxonomyTree, nodeId, []);
    if (ancestors) {
      for (const ancestor of ancestors) {
        this.selectedTaxonomyNodeIds.add(ancestor.id);
      }
    }
  }

  simpleToggleTaxonomyNode(nodeId: string): void {
    const wasSelected = this.selectedTaxonomyNodeIds.has(nodeId);
    if (wasSelected) {
      this.selectedTaxonomyNodeIds.delete(nodeId);
    } else {
      this.selectedTaxonomyNodeIds.add(nodeId);
    }
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'taxonomy',
      nodeId,
      wasSelected ? 'deselect' : 'select',
      this.searchQuery,
    );
  }

  toggleDataProductType(value: DataProductTypeFilter): void {
    if (this.selectedDataProductTypes.has(value)) {
      this.selectedDataProductTypes.delete(value);
    } else {
      this.selectedDataProductTypes.add(value);
    }
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

  toggleLicense(value: DataProductLicenseFilter): void {
    const wasSelected = this.selectedLicenses.has(value);
    if (wasSelected) {
      this.selectedLicenses.delete(value);
    } else {
      this.selectedLicenses.add(value);
    }
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'license',
      value,
      wasSelected ? 'deselect' : 'select',
      this.searchQuery,
    );
  }

  clearAllFilters(): void {
    this.selectedDataProductTypes.clear();
    this.selectedSources.clear();
    this.selectedLicenses.clear();
    this.selectedTaxonomyNodeIds.clear();
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedDataProductTypes.size > 0 ||
      this.selectedSources.size > 0 ||
      this.selectedLicenses.size > 0 ||
      this.selectedTaxonomyNodeIds.size > 0
    );
  }

  private computeFilterNodeIds(): string[] {
    const selectedIds = this.selectedTaxonomyNodeIds;
    if (selectedIds.size === 0) {
      return [];
    }
    const filterIds: string[] = [];
    const visitedIds = new Set<string>();

    const processNode = (node: TaxonomyNode): void => {
      visitedIds.add(node.id);
      if (!selectedIds.has(node.id)) {
        node.children.forEach((child) => {
          processNode(child);
        });
        return;
      }
      const selectedChildCount = node.children.filter((c) =>
        selectedIds.has(c.id),
      ).length;
      if (
        node.children.length === 0 ||
        selectedChildCount === 0 ||
        selectedChildCount === node.children.length
      ) {
        filterIds.push(node.id);
        const markVisited = (n: TaxonomyNode): void => {
          visitedIds.add(n.id);
          n.children.forEach(markVisited);
        };
        node.children.forEach(markVisited);
      } else {
        node.children.forEach((child) => {
          processNode(child);
        });
      }
    };

    this.taxonomyTree.forEach((rootNode) => {
      processNode(rootNode);
    });

    for (const id of selectedIds) {
      if (!visitedIds.has(id)) {
        filterIds.push(id);
      }
    }
    return filterIds;
  }

  buildSearchFilters(): string[] {
    const filters: string[] = [];
    if (this.selectedDataProductTypes.size > 0) {
      filters.push(
        `${SearchFilterKey.DATA_PRODUCT_TYPE}=${Array.from(this.selectedDataProductTypes).join(',')}`,
      );
    }
    if (this.selectedSources.size > 0) {
      filters.push(
        `${SearchFilterKey.DATA_PRODUCT_SOURCE}=${Array.from(this.selectedSources).join(',')}`,
      );
    }
    if (this.selectedLicenses.size > 0) {
      // Map UNDEFINED → '' since the backend filters by empty string for unlicensed products.
      const licenseValues = Array.from(this.selectedLicenses).map((l) =>
        l === DataProductLicenseFilter.UNDEFINED ? '' : l,
      );
      filters.push(`${SearchFilterKey.LICENSE_TO}=${licenseValues.join(',')}`);
    }
    // Map TAXONOMY_UNDEFINED_NODE_ID to '' so the backend can filter for products
    // with no taxonomy tags, the same way license_to='' handles undefined licenses.
    const taxonomyFilterIds = this.computeFilterNodeIds().filter(
      (id) => id !== TAXONOMY_UNDEFINED_NODE_ID,
    );
    if (this.selectedTaxonomyNodeIds.has(TAXONOMY_UNDEFINED_NODE_ID)) {
      taxonomyFilterIds.push('');
    }
    if (taxonomyFilterIds.length > 0) {
      filters.push(
        `${SearchFilterKey.TAXONOMY}=${taxonomyFilterIds.join(',')}`,
      );
    }
    return filters;
  }

  *executeSearch(
    query: string,
    useProducerSearch: boolean,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.setSemanticSearchProductCardStates([]);
      this.setProducerSearchDataProductCardStates([]);
      this.setProducerSearchLegacyDataProductCardStates([]);

      const searchFilters = this.buildSearchFilters();

      const graphManager = yield* getOrCreateGraphManager(
        this.marketplaceBaseStore,
        this._graphManagerCache,
      );

      if (useProducerSearch) {
        yield this.executeProducerSearch(query, graphManager, token);
      } else {
        yield this.executeSemanticSearch(
          query,
          graphManager,
          token,
          searchFilters,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
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

  private async executeSemanticSearch(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
    filters: string[] = [],
  ): Promise<void> {
    this.executingSemanticSearchState.inProgress();

    try {
      const rawResults = await this.marketplaceServerClient.dataProductSearch(
        query,
        this.marketplaceBaseStore.envState.lakehouseEnvironment,
        SearchType.HYBRID,
        filters,
        this.itemsPerPage,
        this.page,
        this.showAllProducts,
      );

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
      this.setSemanticSearchProductCardStates(productCardStates);

      // Rebuild the taxonomy tree only when the query changes.
      // Source and license filters are not applied to taxonomy counts by the backend,
      // so there is no point keying on them.
      if (response.filters_metadata && query !== this._lastTaxonomyQueryKey) {
        this.setTaxonomyTree(response.filters_metadata.taxonomy_tree);
        this._lastTaxonomyQueryKey = query;
      }

      this.setFilterCounts({
        lakehouse_count: response.metadata.lakehouse_count ?? 0,
        legacy_count: response.metadata.legacy_count ?? 0,
        external_source_count: response.metadata.external_source_count ?? 0,
        internal_source_count: response.metadata.internal_source_count ?? 0,
      });
      this.executingSemanticSearchState.pass();
    } catch (error) {
      this.executingSemanticSearchState.fail();
      throw error;
    }
  }

  private async executeProducerSearch(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): Promise<void> {
    await Promise.all([
      this.DEPRECATED_fetchDataProducts(query, graphManager, token),
      this.fetchLegacyDataProducts(query, graphManager, token),
    ]);

    this.setTotalItems(
      this.producerSearchDataProductCardStates.length +
        this.producerSearchLegacyDataProductCardStates.length,
    );
  }

  private async DEPRECATED_fetchDataProducts(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): Promise<void> {
    this.fetchingProducerSearchDataProductsState.inProgress();
    try {
      const rawResponse =
        await this.marketplaceBaseStore.lakehouseContractServerClient.getAllLiteDataProducts(
          this.marketplaceBaseStore.envState.lakehouseEnvironment,
          undefined,
          token,
        );
      const dataProductLiteDetails =
        V1_entitlementsDataProductLiteResponseToDataProductLite(rawResponse);

      const usedImages = new Set<string>();
      const productCardStates = dataProductLiteDetails
        .map((detail) => {
          try {
            const origin =
              detail.origin instanceof V1_SdlcDeploymentDataProductOrigin
                ? LakehouseSDLCDataProductSearchResultOrigin.serialization.fromJson(
                    {
                      _type: LakehouseDataProductSearchResultOriginType.SDLC,
                      groupId: detail.origin.group,
                      artifactId: detail.origin.artifact,
                      versionId: detail.origin.version,
                      path: detail.fullPath,
                    },
                  )
                : LakehouseAdHocDataProductSearchResultOrigin.serialization.fromJson(
                    {
                      _type: LakehouseDataProductSearchResultOriginType.AD_HOC,
                    },
                  );
            const searchResult = DataProductSearchResult.serialization.fromJson(
              {
                dataProductTitle: detail.title ?? detail.id,
                dataProductDescription: detail.description,
                tags1: [],
                tags2: [],
                tag_score: 0,
                similarity: 0,
                dataProductDetails: {
                  _type: DataProductSearchResultDetailsType.LAKEHOUSE,
                  dataProductId: detail.id,
                  deploymentId: detail.deploymentId,
                  producerEnvironmentName:
                    detail.lakehouseEnvironment?.producerEnvironmentName,
                  producerEnvironmentType: detail.lakehouseEnvironment?.type,
                  origin,
                },
              },
            );

            return new ProductCardState(
              this.marketplaceBaseStore,
              searchResult,
              graphManager,
              new Map(),
              usedImages,
            );
          } catch (error) {
            this.marketplaceBaseStore.applicationStore.logService.error(
              LogEvent.create(
                LEGEND_MARKETPLACE_APP_EVENT.DESERIALIZE_DATA_PRODUCT_SEARCH_RESULT_FAILURE,
              ),
              `Can't deserialize data product search result: ${error}`,
            );
            return undefined;
          }
        })
        .filter(isNonNullable);
      const filteredProductCardStates = productCardStates.filter(
        (productCardState) =>
          productCardState.title.toLowerCase().includes(query.toLowerCase()),
      );
      filteredProductCardStates.forEach((dataProductState) =>
        dataProductState.init(token),
      );
      this.setProducerSearchDataProductCardStates(filteredProductCardStates);
      this.fetchingProducerSearchDataProductsState.pass();
    } catch (error) {
      this.fetchingProducerSearchDataProductsState.fail();
      throw error;
    }
  }

  private async fetchLegacyDataProducts(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): Promise<void> {
    if (!this.marketplaceBaseStore.envState.supportsLegacyDataProducts()) {
      return;
    }

    this.fetchingProducerSearchLegacyDataProductsState.inProgress();
    try {
      const rawDataSpaceEntitySummaries =
        await this.marketplaceBaseStore.depotServerClient.getEntitiesSummaryByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
            summary: true,
          },
        );
      const dataSpaceEntitySummaries = rawDataSpaceEntitySummaries.map(
        (entity) => StoredSummaryEntity.serialization.fromJson(entity),
      );
      const usedImages = new Set<string>();
      const productCardStates = dataSpaceEntitySummaries
        .map((entity) => {
          try {
            const dataSpace = V1_deserializeDataSpace({
              executionContexts: [],
              defaultExecutionContext: '',
              package: extractPackagePathFromPath(entity.path) ?? entity.path,
              name: extractElementNameFromPath(entity.path),
            });
            const searchResult = DataProductSearchResult.serialization.fromJson(
              {
                dataProductTitle: dataSpace.title ?? dataSpace.name,
                dataProductDescription: dataSpace.description,
                tags1: [],
                tags2: [],
                tag_score: 0,
                similarity: 0,
                dataProductDetails: {
                  _type: DataProductSearchResultDetailsType.LEGACY,
                  groupId: entity.groupId,
                  artifactId: entity.artifactId,
                  versionId: entity.versionId,
                  path: entity.path,
                },
              },
            );
            return new ProductCardState(
              this.marketplaceBaseStore,
              searchResult,
              graphManager,
              new Map(),
              usedImages,
            );
          } catch (error) {
            this.marketplaceBaseStore.applicationStore.logService.error(
              LogEvent.create(
                LEGEND_MARKETPLACE_APP_EVENT.DESERIALIZE_DATA_PRODUCT_SEARCH_RESULT_FAILURE,
              ),
              `Can't deserialize data product search result: ${error}`,
            );
            return undefined;
          }
        })
        .filter(isNonNullable);
      const filteredProductCardStates = productCardStates.filter(
        (productCardState) =>
          productCardState.title.toLowerCase().includes(query.toLowerCase()),
      );
      filteredProductCardStates.forEach((dataProductState) =>
        dataProductState.init(token),
      );
      this.setProducerSearchLegacyDataProductCardStates(
        filteredProductCardStates,
      );
      this.fetchingProducerSearchLegacyDataProductsState.pass();
    } catch (error) {
      this.fetchingProducerSearchLegacyDataProductsState.fail();
      throw error;
    }
  }
}
