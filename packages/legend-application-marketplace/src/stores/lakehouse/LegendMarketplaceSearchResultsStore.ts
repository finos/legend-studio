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
  type PlainObject,
} from '@finos/legend-shared';
import {
  DataProductSearchResult,
  DataProductSearchResultDetailsType,
  DataProductSearchResponse,
  ErrorDataProductSearchResultDetails,
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultDetails,
  LakehouseDataProductSearchResultOriginType,
  LakehouseSDLCDataProductSearchResultOrigin,
  type MarketplaceServerClient,
  type TaxonomyNode,
} from '@finos/legend-server-marketplace';
import { ProductCardState } from './dataProducts/ProductCardState.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  V1_entitlementsDataProductLiteResponseToDataProductLite,
  V1_PureGraphManager,
  extractPackagePathFromPath,
  extractElementNameFromPath,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import {
  type StoredSummaryEntity,
  DepotScope,
} from '@finos/legend-server-depot';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';

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

export interface FilterCounts {
  lakehouse_count: number;
  legacy_count: number;
  external_source_count: number;
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  searchQuery: string | undefined = undefined;
  private _lastTaxonomyQuery: string | undefined = undefined;
  useProducerSearch: boolean | undefined = undefined;
  semanticSearchProductCardStates: ProductCardState[] = [];
  producerSearchDataProductCardStates: ProductCardState[] = [];
  producerSearchLegacyDataProductCardStates: ProductCardState[] = [];
  sort: DataProductSort = DataProductSort.DEFAULT;
  taxonomyTree: TaxonomyNode[] = [];
  selectedTaxonomyNodeIds: Set<string> = new Set<string>();
  selectedDataProductTypes: Set<DataProductTypeFilter> =
    new Set<DataProductTypeFilter>();
  selectedSources: Set<DataProductSourceFilter> =
    new Set<DataProductSourceFilter>();
  filterCounts: FilterCounts = {
    lakehouse_count: 0,
    legacy_count: 0,
    external_source_count: 0,
  };

  page = 1;
  itemsPerPage = 12;
  totalItems = 0;

  readonly executingSemanticSearchState = ActionState.create();
  readonly fetchingProducerSearchDataProductsState = ActionState.create();
  readonly fetchingProducerSearchLegacyDataProductsState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.marketplaceServerClient = marketplaceBaseStore.marketplaceServerClient;

    makeObservable<LegendMarketplaceSearchResultsStore, '_lastTaxonomyQuery'>(
      this,
      {
        searchQuery: observable,
        useProducerSearch: observable,
        semanticSearchProductCardStates: observable,
        producerSearchDataProductCardStates: observable,
        producerSearchLegacyDataProductCardStates: observable,
        sort: observable,
        taxonomyTree: observable,
        selectedTaxonomyNodeIds: observable,
        selectedDataProductTypes: observable,
        selectedSources: observable,
        filterCounts: observable,
        _lastTaxonomyQuery: false,
        setSearchQuery: action,
        setUseProducerSearch: action,
        page: observable,
        itemsPerPage: observable,
        totalItems: observable,
        setSemanticSearchProductCardStates: action,
        setProducerSearchDataProductCardStates: action,
        setProducerSearchLegacyDataProductCardStates: action,
        setSort: action,
        setPage: action,
        setItemsPerPage: action,
        setTotalItems: action,
        setTaxonomyTree: action,
        setFilterCounts: action,
        setSelectedTaxonomyNodeIds: action,
        toggleTaxonomyNode: action,
        simpleToggleTaxonomyNode: action,
        toggleDataProductType: action,
        toggleSource: action,
        clearAllFilters: action,
        filterSortProducts: computed,
        isLoading: computed,
        hasActiveFilters: computed,
        executeSearch: flow,
      },
    );
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  setUseProducerSearch(value: boolean): void {
    this.useProducerSearch = value;
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
          return b.searchResult.similarity - a.searchResult.similarity;
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
    if (this.selectedTaxonomyNodeIds.has(nodeId)) {
      this.deselectTaxonomyNode(nodeId);
    } else {
      this.selectTaxonomyNode(nodeId);
    }
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
    if (this.selectedTaxonomyNodeIds.has(nodeId)) {
      this.selectedTaxonomyNodeIds.delete(nodeId);
    } else {
      this.selectedTaxonomyNodeIds.add(nodeId);
    }
  }

  toggleDataProductType(value: DataProductTypeFilter): void {
    if (this.selectedDataProductTypes.has(value)) {
      this.selectedDataProductTypes.delete(value);
    } else {
      this.selectedDataProductTypes.add(value);
    }
  }

  toggleSource(value: DataProductSourceFilter): void {
    if (this.selectedSources.has(value)) {
      this.selectedSources.delete(value);
    } else {
      this.selectedSources.add(value);
    }
  }

  clearAllFilters(): void {
    this.selectedDataProductTypes.clear();
    this.selectedSources.clear();
    this.selectedTaxonomyNodeIds.clear();
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedDataProductTypes.size > 0 ||
      this.selectedSources.size > 0 ||
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

  private buildSearchFilters(): string[] {
    const filters: string[] = [];
    if (this.selectedDataProductTypes.size > 0) {
      filters.push(
        `data_product_type=${Array.from(this.selectedDataProductTypes).join(',')}`,
      );
    }
    if (this.selectedSources.size > 0) {
      filters.push(
        `data_product_source=${Array.from(this.selectedSources).join(',')}`,
      );
    }
    const taxonomyFilterIds = this.computeFilterNodeIds();
    if (taxonomyFilterIds.length > 0) {
      filters.push(`taxonomy=${taxonomyFilterIds.join(',')}`);
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
        'hybrid',
        filters,
        this.itemsPerPage,
        this.page,
      );

      const { productCardStates, response } = this.processRawSearchResults(
        rawResults,
        graphManager,
        token,
      );

      this.setTotalItems(response.metadata.total_count);
      this.setSemanticSearchProductCardStates(productCardStates);

      const isNewQuery = query !== this._lastTaxonomyQuery;
      if (response.filters_metadata && isNewQuery) {
        this.setTaxonomyTree(response.filters_metadata.taxonomy_tree);
        this._lastTaxonomyQuery = query;
      }

      this.setFilterCounts({
        lakehouse_count: response.metadata.lakehouse_count ?? 0,
        legacy_count: response.metadata.legacy_count ?? 0,
        external_source_count: response.metadata.external_source_count ?? 0,
      });
    } finally {
      this.executingSemanticSearchState.complete();
    }
  }

  private async executeProducerSearch(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): Promise<void> {
    await Promise.all([
      this.fetchDataProducts(query, graphManager, token),
      this.fetchLegacyDataProducts(query, graphManager, token),
    ]);

    this.setTotalItems(
      this.producerSearchDataProductCardStates.length +
        this.producerSearchLegacyDataProductCardStates.length,
    );
  }

  private async fetchDataProducts(
    query: string,
    graphManager: V1_PureGraphManager,
    token: string | undefined,
  ): Promise<void> {
    this.fetchingProducerSearchDataProductsState.inProgress();
    try {
      const rawResponse =
        await this.marketplaceBaseStore.lakehouseContractServerClient.getDataProductsLite(
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
    } finally {
      this.fetchingProducerSearchDataProductsState.complete();
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
      const dataSpaceEntitySummaries =
        (await this.marketplaceBaseStore.depotServerClient.getEntitiesSummaryByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
            summary: true,
          },
        )) as unknown as StoredSummaryEntity[];
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
    } finally {
      this.fetchingProducerSearchLegacyDataProductsState.complete();
    }
  }
}
