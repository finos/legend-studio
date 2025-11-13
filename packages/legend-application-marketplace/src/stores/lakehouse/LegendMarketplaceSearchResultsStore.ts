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
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';

export enum DataProductSort {
  DEFAULT = 'Default',
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  readonly displayImageMap = new Map<string, string>();
  semanticSearchProductCardStates: ProductCardState[] = [];
  producerSearchDataProductCardStates: ProductCardState[] = [];
  producerSearchLegacyDataProductCardStates: ProductCardState[] = [];
  sort: DataProductSort = DataProductSort.DEFAULT;

  readonly executingSemanticSearchState = ActionState.create();
  readonly fetchingProducerSearchDataProductsState = ActionState.create();
  readonly fetchingProducerSearchLegacyDataProductsState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.marketplaceServerClient = marketplaceBaseStore.marketplaceServerClient;

    makeObservable(this, {
      semanticSearchProductCardStates: observable,
      producerSearchDataProductCardStates: observable,
      producerSearchLegacyDataProductCardStates: observable,
      sort: observable,
      setSemanticSearchProductCardStates: action,
      setProducerSearchDataProductCardStates: action,
      setProducerSearchLegacyDataProductCardStates: action,
      setSort: action,
      filterSortProducts: computed,
      isLoading: computed,
      executeSearch: flow,
    });
  }

  get filterSortProducts(): ProductCardState[] | undefined {
    const productCardStates = this.marketplaceBaseStore.useProducerSearch
      ? [
          ...this.producerSearchDataProductCardStates,
          ...this.producerSearchLegacyDataProductCardStates,
        ].sort((a, b) => a.title.localeCompare(b.title))
      : this.semanticSearchProductCardStates;
    return productCardStates
      .filter((productCardState) =>
        this.marketplaceBaseStore.envState.filterDataProduct(productCardState),
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

  get isLoading(): boolean {
    return this.marketplaceBaseStore.useProducerSearch
      ? this.fetchingProducerSearchDataProductsState.isInProgress ||
          this.fetchingProducerSearchLegacyDataProductsState.isInProgress
      : this.executingSemanticSearchState.isInProgress;
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

  *executeSearch(
    query: string,
    useProducerSearch: boolean,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.setSemanticSearchProductCardStates([]);
      this.setProducerSearchDataProductCardStates([]);
      this.setProducerSearchLegacyDataProductCardStates([]);
      if (useProducerSearch) {
        yield this.executeProducerSearch(query, token);
      } else {
        yield this.executeSemanticSearch(query);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error executing search: ${error.message}`,
      );
    }
  }

  private async executeSemanticSearch(query: string): Promise<void> {
    this.executingSemanticSearchState.inProgress();

    try {
      const rawResults = await this.marketplaceServerClient.dataProductSearch(
        query,
        this.marketplaceBaseStore.envState.lakehouseEnvironment,
      );
      const results = rawResults
        .map((result) => {
          try {
            return DataProductSearchResult.serialization.fromJson(result);
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

      // Create data product card states
      const dataProductCardStates: ProductCardState[] = results.map(
        (result) =>
          new ProductCardState(
            this.marketplaceBaseStore,
            result,
            this.displayImageMap,
          ),
      );
      this.setSemanticSearchProductCardStates(dataProductCardStates);
    } finally {
      this.executingSemanticSearchState.complete();
    }
  }

  private async executeProducerSearch(
    query: string,
    token: string | undefined,
  ): Promise<void> {
    await Promise.all([
      this.fetchDataProducts(query, token),
      this.fetchLegacyDataProducts(query),
    ]);
  }

  private async fetchDataProducts(
    query: string,
    token: string | undefined,
  ): Promise<void> {
    this.fetchingProducerSearchDataProductsState.inProgress();
    try {
      this.executingSearchState.inProgress();
      const rawResults = (yield this.marketplaceServerClient.semanticSearch(
        query,
      )) as PlainObject<TMP__DataProductSearchResult>[];
      const results = rawResults.map((result) =>
        TMP__DataProductSearchResult.serialization.fromJson(result),
      );

      // tmp convert to new type
      const convertedResults = results.map((result) => {
        const newResult = new DataProductSearchResult();
        newResult.dataProductName = result.data_product_name;
        newResult.dataProductDescription = result.data_product_description;
        newResult.similarity = result.similarity;
        newResult.id = result.id;
        const legacyMatch = result.data_product_link.match(
          /\/taxonomy\/dataspace\/(?<gav>.+)\/(?<path>.+)/,
        );
        const lakehouseMatch = result.data_product_link.match(
          /\/lakehouse\/dataProduct\/deployed\/(?<dataProductId>.+)\/(?<deploymentId>\d+)/,
        );
        if (legacyMatch !== null && legacyMatch.groups !== undefined) {
          const { gav, path } = legacyMatch.groups;
          const coordinates = parseGAVCoordinates(guaranteeNonNullable(gav));
          const details = new LegacyDataProductSearchResultDetails();
          details.groupId = coordinates.groupId;
          details.artifactId = coordinates.artifactId;
          details.versionId = coordinates.versionId;
          details.path = guaranteeNonNullable(path);
          newResult.dataProductDetails = details;
        } else if (
          lakehouseMatch !== null &&
          lakehouseMatch.groups !== undefined
        ) {
          const { dataProductId, deploymentId } = lakehouseMatch.groups;
          const lakehouseDetails =
            new LakehouseDataProductSearchResultDetails();
          lakehouseDetails.dataProductId = guaranteeNonNullable(dataProductId);
          lakehouseDetails.did = parseInt(guaranteeNonNullable(deploymentId));
          lakehouseDetails.producerEnvironmentName = '';
          lakehouseDetails.producerEnvironmentType = '';
          const origin = new LakehouseSDLCDataProductSearchResultOrigin();
          origin.groupId = '';
          origin.artifactId = '';
          origin.versionId = '';
          origin.path = '';
          lakehouseDetails.origin = origin;
          newResult.dataProductDetails = lakehouseDetails;
        } else {
          const details = new LegacyDataProductSearchResultDetails();
          details.groupId = '';
          details.artifactId = '';
          details.versionId = '';
          details.path = '';
          newResult.dataProductDetails = details;
        }
        return newResult;
      });

      // Crete graph manager for parsing ad-hoc deployed data products
      const graphManager = new V1_PureGraphManager(
        this.marketplaceBaseStore.applicationStore.pluginManager,
        this.marketplaceBaseStore.applicationStore.logService,
        this.marketplaceBaseStore.remoteEngine,
      );

      // Create data product card states
      const dataProductCardStates: ProductCardState[] = convertedResults.map(
        (result) =>
          new ProductCardState(
            this.marketplaceBaseStore,
            result,
            graphManager,
            this.displayImageMap,
          ),
      );
      this.setProductCardStates(dataProductCardStates);

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

      const productCardStates = dataProductDetails
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
                dataProductTitle: detail.title ?? detail.dataProduct.name,
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
              },
            );

            return new ProductCardState(
              this.marketplaceBaseStore,
              searchResult,
              this.displayImageMap,
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
      this.setProducerSearchDataProductCardStates(
        productCardStates.filter((productCardState) =>
          productCardState.title.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    } finally {
      this.fetchingProducerSearchDataProductsState.complete();
    }
  }

  private async fetchLegacyDataProducts(query: string): Promise<void> {
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
              this.displayImageMap,
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
      this.setProducerSearchLegacyDataProductCardStates(
        productCardStates.filter((productCardState) =>
          productCardState.title.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    } finally {
      this.fetchingProducerSearchLegacyDataProductsState.complete();
    }
  }
}
