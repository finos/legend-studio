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
  type GeneratorFn,
} from '@finos/legend-shared';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';
import {
  DataProductSearchResult,
  DataProductSearchResultDetailsType,
  LakehouseAdHocDataProductSearchResultOrigin,
  LakehouseDataProductSearchResultOriginType,
  LakehouseSDLCDataProductSearchResultOrigin,
  type MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import { ProductCardState } from './dataProducts/ProductCardState.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_PureGraphManager,
  extractPackagePathFromPath,
  extractElementNameFromPath,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import {
  type StoredSummaryEntity,
  DepotScope,
} from '@finos/legend-server-depot';

export interface DataProductFilterConfig {
  modeledDataProducts?: boolean;
}

class DataProductFilterState {
  modeledDataProducts: boolean;
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      modeledDataProducts: observable,
      search: observable,
    });
    this.modeledDataProducts =
      defaultBooleanFilters.modeledDataProducts ??
      DataProductFilterState.default().modeledDataProducts;
    this.search = search;
  }

  static default(): DataProductFilterState {
    return new DataProductFilterState(
      {
        modeledDataProducts: false,
      },
      undefined,
    );
  }

  get currentFilterValues(): DataProductFilterConfig {
    return {
      modeledDataProducts: this.modeledDataProducts,
    };
  }
}

export enum DataProductSort {
  DEFAULT = 'Default',
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  readonly displayImageMap = new Map<string, string>();
  productCardStates: ProductCardState[] = [];
  filterState: DataProductFilterState;
  sort: DataProductSort = DataProductSort.DEFAULT;
  useIndexSearch = false;

  executingSearchState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.marketplaceServerClient = marketplaceBaseStore.marketplaceServerClient;

    const savedFilterConfig =
      LegendMarketplaceUserDataHelper.getSavedDataProductFilterConfig(
        this.marketplaceBaseStore.applicationStore.userDataService,
      );
    this.filterState = savedFilterConfig
      ? new DataProductFilterState(savedFilterConfig, undefined)
      : DataProductFilterState.default();

    makeObservable(this, {
      productCardStates: observable,
      filterState: observable,
      sort: observable,
      useIndexSearch: observable,
      handleModeledDataProductsFilterToggle: action,
      handleSearch: action,
      setProductCardStates: action,
      setSort: action,
      setUseIndexSearch: action,
      filterSortProducts: computed,
      executeSearch: flow,
    });
  }

  get filterSortProducts(): ProductCardState[] | undefined {
    return this.productCardStates
      .filter((productCardState) =>
        this.marketplaceBaseStore.envState.filterDataProduct(
          productCardState,
          this.filterState.modeledDataProducts,
        ),
      )
      .sort((a, b) => {
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

  setProductCardStates(dataProductCardStates: ProductCardState[]): void {
    this.productCardStates = dataProductCardStates;
  }

  handleModeledDataProductsFilterToggle(): void {
    this.filterState.modeledDataProducts =
      !this.filterState.modeledDataProducts;
    LegendMarketplaceUserDataHelper.saveDataProductFilterConfig(
      this.marketplaceBaseStore.applicationStore.userDataService,
      this.filterState.currentFilterValues,
    );
  }

  handleSearch(query: string | undefined) {
    this.filterState.search = query;
  }

  setSort(sort: DataProductSort): void {
    this.sort = sort;
  }

  setUseIndexSearch(value: boolean): void {
    this.useIndexSearch = value;
  }

  *executeSearch(
    query: string,
    useIndexSearch: boolean,
    token: string | undefined,
  ): GeneratorFn<void> {
    this.executingSearchState.inProgress();

    try {
      const results = useIndexSearch
        ? yield this.executeIndexSearch(query, token)
        : yield this.executeSemanticSearch(query);
      this.setProductCardStates(results);
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error executing search: ${error.message}`,
      );
    } finally {
      this.executingSearchState.complete();
    }
  }

  private async executeSemanticSearch(
    query: string,
  ): Promise<ProductCardState[]> {
    const rawResults = await this.marketplaceServerClient.dataProductSearch(
      query,
      this.marketplaceBaseStore.envState.lakehouseEnvironment,
    );
    const results = rawResults.map((result) =>
      DataProductSearchResult.serialization.fromJson(result),
    );

    // Create data product card states
    const dataProductCardStates: ProductCardState[] = results.map(
      (result) =>
        new ProductCardState(
          this.marketplaceBaseStore,
          result,
          this.displayImageMap,
        ),
    );
    return dataProductCardStates;
  }

  private async executeIndexSearch(
    query: string,
    token: string | undefined,
  ): Promise<ProductCardState[]> {
    const [dataProducts, legacyDataProducts] = await Promise.all([
      this.fetchDataProducts(token),
      this.fetchLegacyDataProducts(),
    ]);

    return [...dataProducts, ...legacyDataProducts].filter((productCardState) =>
      productCardState.title.toLowerCase().includes(query.toLowerCase()),
    );
  }

  private async fetchDataProducts(
    token: string | undefined,
  ): Promise<ProductCardState[]> {
    const rawResponse =
      await this.marketplaceBaseStore.lakehouseContractServerClient.getDataProducts(
        token,
      );
    const dataProductDetails =
      V1_entitlementsDataProductDetailsResponseToDataProductDetails(
        rawResponse,
      );

    // Crete graph manager for parsing ad-hoc deployed data products
    const graphManager = new V1_PureGraphManager(
      this.marketplaceBaseStore.applicationStore.pluginManager,
      this.marketplaceBaseStore.applicationStore.logService,
      this.marketplaceBaseStore.remoteEngine,
    );
    await graphManager.initialize(
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

    return dataProductDetails.map((detail) => {
      const origin =
        detail.origin instanceof V1_SdlcDeploymentDataProductOrigin
          ? LakehouseSDLCDataProductSearchResultOrigin.serialization.fromJson({
              _type: LakehouseDataProductSearchResultOriginType.SDLC,
              groupId: detail.origin.group,
              artifactId: detail.origin.artifact,
              versionId: detail.origin.version,
              path: detail.fullPath,
            })
          : LakehouseAdHocDataProductSearchResultOrigin.serialization.fromJson({
              _type: LakehouseDataProductSearchResultOriginType.AD_HOC,
            });
      const searchResult = DataProductSearchResult.serialization.fromJson({
        dataProductTitle: detail.title,
        dataProductDescription: detail.description,
        tags1: [],
        tags2: [],
        tag_score: 0,
        similarity: 0,
        dataProductDetails: {
          _type: DataProductSearchResultDetailsType.LAKEHOUSE,
          dataProductId: detail.dataProduct.name,
          deploymentId: detail.deploymentId,
          producerEnvironmentName:
            detail.lakehouseEnvironment?.producerEnvironmentName,
          producerEnvironmentType: detail.lakehouseEnvironment?.type,
          origin,
        },
      });
      return new ProductCardState(
        this.marketplaceBaseStore,
        searchResult,
        this.displayImageMap,
      );
    });
  }

  private async fetchLegacyDataProducts(): Promise<ProductCardState[]> {
    if (!this.marketplaceBaseStore.envState.supportsLegacyDataProducts()) {
      return [];
    }
    const dataSpaceEntitySummaries =
      (await this.marketplaceBaseStore.depotServerClient.getEntitiesSummaryByClassifier(
        DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
        {
          scope: DepotScope.RELEASES,
          summary: true,
        },
      )) as unknown as StoredSummaryEntity[];
    return dataSpaceEntitySummaries.map((entity) => {
      const dataSpace = V1_deserializeDataSpace({
        executionContexts: [],
        defaultExecutionContext: '',
        package: extractPackagePathFromPath(entity.path) ?? entity.path,
        name: extractElementNameFromPath(entity.path),
      });
      const searchResult = DataProductSearchResult.serialization.fromJson({
        dataProductTitle: dataSpace.title,
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
      });
      return new ProductCardState(
        this.marketplaceBaseStore,
        searchResult,
        this.displayImageMap,
      );
    });
  }
}
