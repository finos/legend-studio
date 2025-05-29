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

import type { CommandRegistrar } from '@finos/legend-application';
import {
  DepotScope,
  isSnapshotVersion,
  projectIdHandlerFunc,
  resolveVersion,
  StoredSummaryEntity,
  StoreProjectData,
  VersionedProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  DataProductArtifactGeneration,
  GraphDataWithOrigin,
  GraphManagerState,
  InMemoryGraphData,
  LegendSDLC,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_deserializePackageableElement,
  V1_LakehouseDiscoveryEnvironmentResponse,
  V1_PureGraphManager,
  V1_SandboxDataProductDeploymentResponse,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import {
  GAV_DELIMITER,
  generateGAVCoordinates,
  parseGAVCoordinates,
  type Entity,
  type StoredFileGeneration,
} from '@finos/legend-storage';
import { DataProductViewerState } from './DataProductViewerState.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl } from '../../__lib__/LegendMarketplaceNavigation.js';
import type { AuthContextProps } from 'react-oidc-context';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-marketplace';
import {
  DataProductEntity,
  DataProductState,
  SandboxDataProductState,
  type BaseDataProductState,
} from './dataProducts/DataProducts.js';

const ARTIFACT_GENERATION_DAT_PRODUCT_KEY = 'dataProduct';

class DataProductFilters {
  releaseFilter;
  snapshotFilter;
  search?: string | undefined;

  constructor(
    releaseFilter: boolean,
    snapshotFilter: boolean,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      releaseFilter: observable,
      snapshotFilter: observable,
      search: observable,
    });
    this.releaseFilter = releaseFilter;
    this.snapshotFilter = snapshotFilter;
    this.search = search;
  }

  static default(): DataProductFilters {
    return new DataProductFilters(true, true, undefined);
  }
}

export enum DataProductSort {
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class MarketplaceLakehouseStore implements CommandRegistrar {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  // To consolidate all versions of a data product, we use a map from group:artifact:path to a DataProductState object, which contains
  // a map of all the verions of the data product.
  productStatesMap: Map<string, DataProductState>;
  lakehouseIngestEnvironmentSummaries: V1_LakehouseDiscoveryEnvironmentResponse[] =
    [];
  sandboxDataProductStates: SandboxDataProductState[] = [];
  loadingProductsState = ActionState.create();
  loadingLakehouseEnvironmentsState = ActionState.create();
  loadingSandboxDataProductStates = ActionState.create();
  filter: DataProductFilters = DataProductFilters.default();
  sort: DataProductSort = DataProductSort.NAME_ALPHABETICAL;
  dataProductViewer: DataProductViewerState | undefined;

  constructor(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    lakehouseServerClient: LakehouseContractServerClient,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
    lakehouseIngestServerClient: LakehouseIngestServerClient,
    depotServerClient: DepotServerClient,
  ) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.applicationStore = marketplaceBaseStore.applicationStore;
    this.lakehouseContractServerClient = lakehouseServerClient;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;
    this.lakehouseIngestServerClient = lakehouseIngestServerClient;

    this.depotServerClient = depotServerClient;
    this.productStatesMap = new Map<string, DataProductState>();
    makeObservable(this, {
      init: flow,
      initWithProduct: flow,
      initWithSandboxProduct: flow,
      productStatesMap: observable,
      sandboxDataProductStates: observable,
      lakehouseIngestEnvironmentSummaries: observable,
      dataProductViewer: observable,
      handleFilterChange: action,
      handleSearch: action,
      filterSortProducts: computed,
      setDataProductViewerState: action,
      setLakehouseIngestEnvironmentSummaries: action,
      setSandboxDataProductStates: action,
      filter: observable,
      sort: observable,
      setSort: action,
    });
  }

  get filterSortProducts(): BaseDataProductState[] | undefined {
    return (
      Array.from(this.productStatesMap.values()) as BaseDataProductState[]
    )
      .concat(this.sandboxDataProductStates)
      .filter((baseDataProductState) => {
        if (!baseDataProductState.isInitialized) {
          return false;
        }
        const isSnapshot = isSnapshotVersion(baseDataProductState.versionId);
        // Check if product matches release/snapshot filter
        const versionMatch =
          (this.filter.snapshotFilter && isSnapshot) ||
          (this.filter.releaseFilter && !isSnapshot);
        // Check if product title matches search filter
        const dataProductTitle = baseDataProductState.title;
        const titleMatch =
          this.filter.search === undefined ||
          this.filter.search === '' ||
          dataProductTitle
            .toLowerCase()
            .includes(this.filter.search.toLowerCase());
        return versionMatch && titleMatch;
      })
      .sort((a, b) => {
        if (this.sort === DataProductSort.NAME_ALPHABETICAL) {
          return a.title.localeCompare(b.title ?? '') ?? 0;
        } else {
          return b.title.localeCompare(a.title ?? '') ?? 0;
        }
      });
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: V1_LakehouseDiscoveryEnvironmentResponse[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setSandboxDataProductStates(
    sandboxDataProductStates: SandboxDataProductState[],
  ): void {
    this.sandboxDataProductStates = sandboxDataProductStates;
  }

  setDataProductViewerState(val: DataProductViewerState | undefined): void {
    this.dataProductViewer = val;
  }

  handleFilterChange(val: DepotScope | undefined): void {
    if (val === DepotScope.RELEASES) {
      this.filter.releaseFilter = !this.filter.releaseFilter;
    } else if (val === DepotScope.SNAPSHOT) {
      this.filter.snapshotFilter = !this.filter.snapshotFilter;
    }
  }

  handleSearch(query: string | undefined) {
    this.filter.search = query;
  }

  setSort(sort: DataProductSort): void {
    this.sort = sort;
  }

  async fetchDataProducts(): Promise<void> {
    try {
      this.loadingProductsState.inProgress();
      // we will show both released and snapshot versions for now to support deployment via workspaces
      const dataProductEntitySummaries = (
        await Promise.all([
          this.depotServerClient.getEntitiesSummaryByClassifier(
            CORE_PURE_PATH.DATA_PRODUCT,
            {
              scope: DepotScope.RELEASES,
              summary: true,
            },
          ),
          this.depotServerClient.getEntitiesSummaryByClassifier(
            CORE_PURE_PATH.DATA_PRODUCT,
            {
              scope: DepotScope.SNAPSHOT,
              summary: true,
            },
          ),
        ])
      )
        .flat()
        .map((e: PlainObject<StoredSummaryEntity>) =>
          StoredSummaryEntity.serialization.fromJson(e),
        ) as StoredSummaryEntity[];
      // Store summary information in the product state map
      dataProductEntitySummaries.forEach((entitySummary) => {
        const key =
          generateGAVCoordinates(
            entitySummary.groupId,
            entitySummary.artifactId,
            undefined,
          ) +
          GAV_DELIMITER +
          entitySummary.path;
        if (!this.productStatesMap.has(key)) {
          this.productStatesMap.set(key, new DataProductState(this));
        }
        const productState = guaranteeNonNullable(
          this.productStatesMap.get(key),
        );
        productState.setProductEntity(
          entitySummary.versionId,
          new DataProductEntity(
            entitySummary.groupId,
            entitySummary.artifactId,
            entitySummary.versionId,
            entitySummary.path,
          ),
        );
      });
      // Set the currentProductEntity for each product state to the latest version (or if no released versions, just pick the first snapshot version)
      this.productStatesMap.forEach((dataProductState) => {
        const productEntities = Array.from(
          dataProductState.productEntityMap.values(),
        );
        const latestReleasedEntity = productEntities
          .filter((entity) => !isSnapshotVersion(entity.versionId))
          .sort((a, b) => b.versionId.localeCompare(a.versionId))[0];
        if (latestReleasedEntity) {
          dataProductState.setSelectedVersion(latestReleasedEntity.versionId);
        } else if (productEntities[0]) {
          dataProductState.setSelectedVersion(productEntities[0].versionId);
        }
      });
      this.loadingProductsState.complete();
      // Asynchronously fetch the data product content for each entity summary and update the product state map.
      Promise.all(
        // TODO: explore a different way to get data product content to avoid overloading metadata server
        // as the number of data products increases.
        dataProductEntitySummaries.map(async (entitySummary) => {
          const key =
            generateGAVCoordinates(
              entitySummary.groupId,
              entitySummary.artifactId,
              undefined,
            ) +
            GAV_DELIMITER +
            entitySummary.path;
          const dataProductEntity = this.productStatesMap
            .get(key)
            ?.productEntityMap?.get(entitySummary.versionId);
          if (dataProductEntity) {
            dataProductEntity.loadingEntityState.inProgress();
            try {
              const entity = await this.depotServerClient.getVersionEntity(
                entitySummary.groupId,
                entitySummary.artifactId,
                entitySummary.versionId,
                entitySummary.path,
              );
              const dataProduct = guaranteeType(
                V1_deserializePackageableElement(
                  entity.content as PlainObject<V1_DataProduct>,
                  [],
                ),
                V1_DataProduct,
              );
              dataProductEntity.setProduct(dataProduct);
            } finally {
              dataProductEntity.loadingEntityState.complete();
            }
          }
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load products: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  async fetchLakehouseEnvironments(token: string | undefined): Promise<void> {
    try {
      this.loadingLakehouseEnvironmentsState.inProgress();
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironments(token)
      ).map((e: PlainObject<V1_LakehouseDiscoveryEnvironmentResponse>) =>
        V1_LakehouseDiscoveryEnvironmentResponse.serialization.fromJson(e),
      ) as V1_LakehouseDiscoveryEnvironmentResponse[];
      this.setLakehouseIngestEnvironmentSummaries(discoveryEnvironments);
      this.loadingLakehouseEnvironmentsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environments: ${error.message}`,
      );
      this.loadingLakehouseEnvironmentsState.fail();
    }
  }

  async fetchSandboxDataProducts(token: string | undefined): Promise<void> {
    try {
      this.loadingSandboxDataProductStates.inProgress();
      const rawSandboxDataProducts: {
        ingestServerUrl: string;
        response: PlainObject<V1_SandboxDataProductDeploymentResponse>;
      }[] = (
        await Promise.all(
          this.lakehouseIngestEnvironmentSummaries.map(async (env) => {
            try {
              const response =
                await this.lakehouseIngestServerClient.getDeployedIngestDefinitions(
                  env.ingestServerUrl,
                  token,
                );
              return { ingestServerUrl: env.ingestServerUrl, response };
            } catch {
              return undefined;
            }
          }),
        )
      )
        .flat()
        .filter(isNonNullable) as {
        ingestServerUrl: string;
        response: PlainObject<V1_SandboxDataProductDeploymentResponse>;
      }[];
      const ingestUrlsAndDataProducts = rawSandboxDataProducts
        .map((ingestUrlAndResponse) =>
          V1_SandboxDataProductDeploymentResponse.serialization
            .fromJson(ingestUrlAndResponse.response)
            .deployedDataProducts.map((deployedDataProduct) => ({
              ingestServerUrl: ingestUrlAndResponse.ingestServerUrl,
              dataProduct: deployedDataProduct,
            })),
        )
        .flat();
      const sandboxDataProductStates: SandboxDataProductState[] =
        ingestUrlsAndDataProducts.map(
          (ingestUrlAndDataProduct) =>
            new SandboxDataProductState(
              this,
              ingestUrlAndDataProduct.ingestServerUrl,
              ingestUrlAndDataProduct.dataProduct,
            ),
        );
      this.setSandboxDataProductStates(sandboxDataProductStates);
      this.loadingSandboxDataProductStates.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to fetch sandbox data products: ${error.message}`,
      );
      this.loadingSandboxDataProductStates.fail();
    }
  }

  *init(auth: AuthContextProps): GeneratorFn<void> {
    yield Promise.all([
      (() => {
        if (!this.loadingProductsState.hasCompleted) {
          this.fetchDataProducts();
        }
      })(),
      (async () => {
        if (!this.loadingLakehouseEnvironmentsState.hasCompleted) {
          await this.fetchLakehouseEnvironments(auth.user?.access_token);
          await Promise.all([
            this.fetchSandboxDataProducts(auth.user?.access_token),
          ]);
        }
      })(),
    ]);
  }

  *initWithProduct(
    gav: string,
    path: string,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const projectData = VersionedProjectData.serialization.fromJson(
        parseGAVCoordinates(gav) as unknown as PlainObject,
      );
      const storeProject = new StoreProjectData();
      storeProject.groupId = projectData.groupId;
      storeProject.artifactId = projectData.artifactId;
      const v1DataProduct = deserialize(
        V1_dataProductModelSchema,
        (
          (yield this.depotServerClient.getVersionEntity(
            projectData.groupId,
            projectData.artifactId,
            resolveVersion(projectData.versionId),
            path,
          )) as Entity
        ).content,
      );
      const files = (yield this.depotServerClient.getGenerationFilesByType(
        storeProject,
        resolveVersion(projectData.versionId),
        ARTIFACT_GENERATION_DAT_PRODUCT_KEY,
      )) as StoredFileGeneration[];
      const fileGen = files.filter((e) => e.path === v1DataProduct.path)[0]
        ?.file.content;
      let parsed: DataProductArtifactGeneration | undefined = undefined;
      if (fileGen) {
        const content: PlainObject = JSON.parse(fileGen) as PlainObject;
        const gen =
          DataProductArtifactGeneration.serialization.fromJson(content);
        gen.content = content;
        parsed = gen;
      }
      const stateViewer = new DataProductViewerState(
        this.applicationStore,
        new GraphManagerState(
          this.applicationStore.pluginManager,
          this.applicationStore.logService,
        ),
        this.lakehouseContractServerClient,
        projectData,
        v1DataProduct,
        parsed,
        {
          retrieveGraphData: () => {
            const sdlc = new LegendSDLC(
              projectData.groupId,
              projectData.artifactId,
              projectData.versionId,
            );
            return new GraphDataWithOrigin(sdlc);
          },

          viewSDLCProject: () => {
            return projectIdHandlerFunc(
              projectData.groupId,
              projectData.artifactId,
              projectData.versionId,
              this.depotServerClient,
              (projectId: string, resolvedId: string) => {
                const studioUrl = guaranteeNonNullable(
                  this.applicationStore.config.studioServerUrl,
                  'studio url required',
                );
                this.applicationStore.navigationService.navigator.visitAddress(
                  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
                    studioUrl,
                    projectId,
                    resolvedId,
                    path,
                  ),
                );
              },
            );
          },
          onZoneChange: undefined,
        },
      );
      this.setDataProductViewerState(stateViewer);
      stateViewer.fetchContracts(auth.user?.access_token);
      this.loadingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load product ${path}: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  *initWithSandboxProduct(
    ingestServerUrl: string,
    path: string,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const rawSandboxDataProductResponse: PlainObject<V1_SandboxDataProductDeploymentResponse> =
        (yield this.lakehouseIngestServerClient.getDeployedIngestDefinitions(
          ingestServerUrl,
          auth.user?.access_token,
        )) as PlainObject<V1_SandboxDataProductDeploymentResponse>;
      const sandboxDataProduct = guaranteeNonNullable(
        V1_SandboxDataProductDeploymentResponse.serialization
          .fromJson(rawSandboxDataProductResponse)
          .deployedDataProducts.find(
            (dataProduct) => dataProduct.artifact.dataProduct.path === path,
          ),
        `Unable to find data product ${path} deployed at ${ingestServerUrl}`,
      );
      const graphManager = new V1_PureGraphManager(
        this.applicationStore.pluginManager,
        this.applicationStore.logService,
        this.marketplaceBaseStore.remoteEngine,
      );
      const graphManagerState = new GraphManagerState(
        this.applicationStore.pluginManager,
        this.applicationStore.logService,
        graphManager,
      );
      const entities: Entity[] =
        yield graphManagerState.graphManager.pureCodeToEntities(
          sandboxDataProduct.definition,
        );
      yield graphManagerState.graphManager.buildGraph(
        graphManagerState.createNewGraph(),
        entities,
        ActionState.create(),
      );
      const v1_DataProduct = guaranteeType(
        guaranteeNonNullable(
          graphManager.elementToProtocol(
            graphManagerState.graph.getElement(
              sandboxDataProduct.artifact.dataProduct.path,
            ),
          ),
          `Unable to find ${sandboxDataProduct.artifact.dataProduct.path} in deployed definition`,
        ),
        V1_DataProduct,
        `${sandboxDataProduct.artifact.dataProduct.path} is not a data product`,
      );

      const stateViewer = new DataProductViewerState(
        this.applicationStore,
        graphManagerState,
        this.lakehouseContractServerClient,
        VersionedProjectData.serialization.fromJson({
          groupId: '',
          artifactId: '',
          versionId: '',
        }),
        v1_DataProduct,
        undefined,
        {
          retrieveGraphData: () => {
            return new InMemoryGraphData(graphManagerState.graph);
          },
          viewSDLCProject: () => {
            throw new Error('Project does not exist in SDLC');
          },
        },
      );
      this.setDataProductViewerState(stateViewer);
      stateViewer.fetchContracts(auth.user?.access_token);
      this.loadingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load product ${path}: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  registerCommands(): void {
    throw new Error('Method not implemented.');
  }
  deregisterCommands(): void {
    throw new Error('Method not implemented.');
  }
}
