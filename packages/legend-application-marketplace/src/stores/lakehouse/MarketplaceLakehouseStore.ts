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

import {
  DEFAULT_TAB_SIZE,
  type CommandRegistrar,
} from '@finos/legend-application';
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
  type V1_IngestEnvironment,
  buildDataProductArtifactGeneration,
  CORE_PURE_PATH,
  DataProductArtifactGeneration,
  GraphDataWithOrigin,
  GraphManagerState,
  InMemoryGraphData,
  LegendSDLC,
  V1_AppDirLevel,
  V1_DataProduct,
  V1_DataProductArtifactGeneration,
  V1_dataProductModelSchema,
  V1_deserializeIngestEnvironment,
  V1_deserializePackageableElement,
  V1_IngestEnvironmentClassification,
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
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateIngestEnvironemntUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import type { AuthContextProps } from 'react-oidc-context';
import type { LakehouseContractServerClient } from '@finos/legend-server-marketplace';
import {
  DataProductEntity,
  DataProductState,
  SandboxDataProductState,
  type BaseDataProductState,
} from './dataProducts/DataProducts.js';
import { TMP__DummyDataProducts } from '../../pages/Lakehouse/TMP__Data/TMP__DummyDataProducts.js';
import {
  type LakehousePlatformServerClient,
  type LakehouseIngestServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';

const ARTIFACT_GENERATION_DAT_PRODUCT_KEY = 'dataProduct';

export enum DataProductFilterType {
  DEPLOY_TYPE = 'DEPLOY_TYPE',
  ENVIRONMENT_CLASSIFICATION = 'ENVIRONMENT_CLASSIFICATION',
}

export enum DeployType {
  SDLC = 'SDLC',
  SANDBOX = 'SANDBOX',
}

export interface DataProductFilterConfig {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
}

class DataProductFilters {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      sdlcDeployFilter: observable,
      sandboxDeployFilter: observable,
      devEnvironmentClassificationFilter: observable,
      prodParallelEnvironmentClassificationFilter: observable,
      prodEnvironmentClassificationFilter: observable,
      search: observable,
    });
    this.sdlcDeployFilter = defaultBooleanFilters.sdlcDeployFilter;
    this.sandboxDeployFilter = defaultBooleanFilters.sandboxDeployFilter;
    this.devEnvironmentClassificationFilter =
      defaultBooleanFilters.devEnvironmentClassificationFilter;
    this.prodParallelEnvironmentClassificationFilter =
      defaultBooleanFilters.prodParallelEnvironmentClassificationFilter;
    this.prodEnvironmentClassificationFilter =
      defaultBooleanFilters.prodEnvironmentClassificationFilter;
    this.search = search;
  }

  static default(): DataProductFilters {
    return new DataProductFilters(
      {
        sdlcDeployFilter: true,
        sandboxDeployFilter: true,
        devEnvironmentClassificationFilter: false,
        prodParallelEnvironmentClassificationFilter: false,
        prodEnvironmentClassificationFilter: true,
      },
      undefined,
    );
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
  lakehouseIngestEnvironmentSummaries: IngestDeploymentServerConfig[] = [];
  lakehouseIngestEnvironmentsByDID: Map<string, IngestDeploymentServerConfig> =
    new Map<string, IngestDeploymentServerConfig>();
  lakehouseIngestEnvironmentDetails: V1_IngestEnvironment[] = [];
  sandboxDataProductStates: SandboxDataProductState[] = [];
  loadingProductsState = ActionState.create();
  loadingLakehouseEnvironmentSummariesState = ActionState.create();
  loadingLakehouseEnvironmentsByDIDState = ActionState.create();
  loadingLakehouseEnvironmentDetailsState = ActionState.create();
  loadingSandboxDataProductStates = ActionState.create();
  filter: DataProductFilters = DataProductFilters.default();
  sort: DataProductSort = DataProductSort.NAME_ALPHABETICAL;
  dataProductViewer: DataProductViewerState | undefined;

  // Temporary state for dummy data products
  dummyDataProductStates: DataProductState[] = TMP__DummyDataProducts.map(
    (dataProduct) => {
      const dataProductEntity = new DataProductEntity(
        '',
        '',
        '1.0',
        dataProduct.path,
      );
      dataProductEntity.setProduct(dataProduct);
      const dataProductState = new DataProductState(this);
      dataProductState.setProductEntity('1.0', dataProductEntity);
      dataProductState.setSelectedVersion('1.0');
      return dataProductState;
    },
  );

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
      lakehouseIngestEnvironmentsByDID: observable,
      lakehouseIngestEnvironmentDetails: observable,
      dataProductViewer: observable,
      handleFilterChange: action,
      handleSearch: action,
      filterSortProducts: computed,
      setDataProductViewerState: action,
      setLakehouseIngestEnvironmentSummaries: action,
      setLakehouseIngestEnvironmentsByDID: action,
      setLakehouseIngestEnvironmentDetails: action,
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
      .concat(
        this.loadingLakehouseEnvironmentsByDIDState.isInProgress
          ? []
          : this.sandboxDataProductStates,
      )
      .concat(this.dummyDataProductStates)
      .filter((baseDataProductState) => {
        if (!baseDataProductState.isInitialized) {
          return false;
        }
        // Check if product matches deploy type filter
        const deployMatch =
          (this.filter.sdlcDeployFilter &&
            baseDataProductState instanceof DataProductState) ||
          (this.filter.sandboxDeployFilter &&
            baseDataProductState instanceof SandboxDataProductState) ||
          // TMP always include dummy data products
          (baseDataProductState instanceof DataProductState &&
            this.dummyDataProductStates.includes(baseDataProductState));
        // Check if product matches environment classification filter
        const environmentClassification =
          baseDataProductState instanceof SandboxDataProductState &&
          baseDataProductState.dataProductArtifact?.dataProduct.deploymentId
            ? baseDataProductState.state.lakehouseIngestEnvironmentsByDID.get(
                baseDataProductState.dataProductArtifact.dataProduct
                  .deploymentId,
              )?.environmentClassification
            : undefined;
        const environmentClassificationMatch =
          environmentClassification === undefined ||
          (this.filter.devEnvironmentClassificationFilter &&
            environmentClassification ===
              V1_IngestEnvironmentClassification.DEV) ||
          (this.filter.prodParallelEnvironmentClassificationFilter &&
            environmentClassification ===
              V1_IngestEnvironmentClassification.PROD_PARALLEL) ||
          (this.filter.prodEnvironmentClassificationFilter &&
            environmentClassification ===
              V1_IngestEnvironmentClassification.PROD);
        // Check if product title matches search filter
        const dataProductTitle = baseDataProductState.title;
        const titleMatch =
          this.filter.search === undefined ||
          this.filter.search === '' ||
          dataProductTitle
            .toLowerCase()
            .includes(this.filter.search.toLowerCase());
        return deployMatch && environmentClassificationMatch && titleMatch;
      })
      .sort((a, b) => {
        if (this.sort === DataProductSort.NAME_ALPHABETICAL) {
          return a.title.localeCompare(b.title);
        } else {
          return b.title.localeCompare(a.title);
        }
      });
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: IngestDeploymentServerConfig[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setLakehouseIngestEnvironmentsByDID(
    environmentsByDID: Map<string, IngestDeploymentServerConfig>,
  ): void {
    this.lakehouseIngestEnvironmentsByDID = environmentsByDID;
  }

  setLakehouseIngestEnvironmentDetails(
    environmentDetails: V1_IngestEnvironment[],
  ): void {
    this.lakehouseIngestEnvironmentDetails = environmentDetails;
  }

  setSandboxDataProductStates(
    sandboxDataProductStates: SandboxDataProductState[],
  ): void {
    this.sandboxDataProductStates = sandboxDataProductStates;
  }

  setDataProductViewerState(val: DataProductViewerState | undefined): void {
    this.dataProductViewer = val;
  }

  handleFilterChange(
    filterType: DataProductFilterType,
    val: DeployType | V1_IngestEnvironmentClassification | undefined,
  ): void {
    if (filterType === DataProductFilterType.DEPLOY_TYPE) {
      if (val === DeployType.SDLC) {
        this.filter.sdlcDeployFilter = !this.filter.sdlcDeployFilter;
      } else if (val === DeployType.SANDBOX) {
        this.filter.sandboxDeployFilter = !this.filter.sandboxDeployFilter;
      }
    } else {
      if (val === V1_IngestEnvironmentClassification.DEV) {
        this.filter.devEnvironmentClassificationFilter =
          !this.filter.devEnvironmentClassificationFilter;
      } else if (val === V1_IngestEnvironmentClassification.PROD_PARALLEL) {
        this.filter.prodParallelEnvironmentClassificationFilter =
          !this.filter.prodParallelEnvironmentClassificationFilter;
      } else if (val === V1_IngestEnvironmentClassification.PROD) {
        this.filter.prodEnvironmentClassificationFilter =
          !this.filter.prodEnvironmentClassificationFilter;
      }
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
        );
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
      // Fetch the data product content for each entity summary and update the product state map.
      await Promise.all(
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
            ?.productEntityMap.get(entitySummary.versionId);
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

  async fetchLakehouseEnvironmentSummaries(
    token: string | undefined,
  ): Promise<void> {
    try {
      this.loadingLakehouseEnvironmentSummariesState.inProgress();
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironmentSummaries(
          token,
        )
      ).map((e: PlainObject<IngestDeploymentServerConfig>) =>
        IngestDeploymentServerConfig.serialization.fromJson(e),
      );
      this.setLakehouseIngestEnvironmentSummaries(discoveryEnvironments);
      this.loadingLakehouseEnvironmentSummariesState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environment summaries: ${error.message}`,
      );
      this.loadingLakehouseEnvironmentSummariesState.fail();
    }
  }

  async fetchLakehouseEnvironmentSummary(
    ingestEnvironmentUrn: string,
    token: string | undefined,
  ): Promise<IngestDeploymentServerConfig | undefined> {
    try {
      const rawResponse =
        await this.lakehousePlatformServerClient.getIngestEnvironmentSummary(
          ingestEnvironmentUrn,
          token,
        );
      const response =
        IngestDeploymentServerConfig.serialization.fromJson(rawResponse);
      return response;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environment summary: ${error.message}`,
      );
      return undefined;
    }
  }

  async fetchLakehouseEnvironmentsByDID(
    dids: string[],
    token: string | undefined,
  ): Promise<void> {
    try {
      this.loadingLakehouseEnvironmentsByDIDState.inProgress();
      const didsAndEnvironments = await Promise.all(
        dids.map(async (did) => {
          return [
            did,
            IngestDeploymentServerConfig.serialization.fromJson(
              await this.lakehousePlatformServerClient.findProducerServer(
                parseInt(did),
                V1_AppDirLevel.DEPLOYMENT,
                token,
              ),
            ),
          ] as [string, IngestDeploymentServerConfig];
        }),
      );
      const didToEnvironment = new Map<string, IngestDeploymentServerConfig>(
        this.lakehouseIngestEnvironmentsByDID,
      );
      didsAndEnvironments.forEach(([did, environment]) => {
        didToEnvironment.set(did, environment);
      });
      this.setLakehouseIngestEnvironmentsByDID(didToEnvironment);
      this.loadingLakehouseEnvironmentsByDIDState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environments by DID: ${error.message}`,
      );
      this.loadingLakehouseEnvironmentsByDIDState.fail();
    }
  }

  async fetchLakehouseEnvironmentDetails(
    token: string | undefined,
  ): Promise<void> {
    try {
      this.loadingLakehouseEnvironmentDetailsState.inProgress();
      const ingestEnvironments: V1_IngestEnvironment[] = await Promise.all(
        this.lakehouseIngestEnvironmentSummaries.map(async (discoveryEnv) => {
          const env =
            await this.lakehouseIngestServerClient.getIngestEnvironment(
              discoveryEnv.ingestServerUrl,
              token,
            );
          return V1_deserializeIngestEnvironment(env);
        }),
      );
      this.setLakehouseIngestEnvironmentDetails(ingestEnvironments);
      this.loadingLakehouseEnvironmentDetailsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environment details: ${error.message}`,
      );
      this.loadingLakehouseEnvironmentSummariesState.fail();
    }
  }

  async fetchSandboxDataProducts(token: string | undefined): Promise<void> {
    try {
      this.loadingSandboxDataProductStates.inProgress();
      const ingestUrnsAndRawResponses: {
        ingestEnvironmentUrn: string;
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
              return {
                ingestEnvironmentUrn: env.ingestEnvironmentUrn,
                response,
              };
            } catch {
              return undefined;
            }
          }),
        )
      )
        .flat()
        .filter(isNonNullable) as {
        ingestEnvironmentUrn: string;
        response: PlainObject<V1_SandboxDataProductDeploymentResponse>;
      }[];
      const ingestUrnsAndDataProducts = ingestUrnsAndRawResponses
        .map((ingestUrnAndResponse) =>
          V1_SandboxDataProductDeploymentResponse.serialization
            .fromJson(ingestUrnAndResponse.response)
            .deployedDataProducts.map((deployedDataProduct) => ({
              ingestEnvironmentUrn: ingestUrnAndResponse.ingestEnvironmentUrn,
              dataProduct: deployedDataProduct,
            })),
        )
        .flat();
      const sandboxDataProductStates: SandboxDataProductState[] =
        ingestUrnsAndDataProducts.map(
          (ingestUrlAndDataProduct) =>
            new SandboxDataProductState(
              this,
              ingestUrlAndDataProduct.ingestEnvironmentUrn,
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
      (async () => {
        if (!this.loadingProductsState.hasCompleted) {
          await this.fetchDataProducts();
        }
      })(),
      (async () => {
        if (!this.loadingLakehouseEnvironmentSummariesState.hasCompleted) {
          await this.fetchLakehouseEnvironmentSummaries(
            auth.user?.access_token,
          );
          await Promise.all([
            (async () => {
              await this.fetchSandboxDataProducts(auth.user?.access_token);
              await this.fetchLakehouseEnvironmentsByDID(
                this.sandboxDataProductStates
                  .map(
                    (state) =>
                      state.dataProductArtifact?.dataProduct.deploymentId,
                  )
                  .filter(isNonNullable),
                auth.user?.access_token,
              );
            })(),
            this.fetchLakehouseEnvironmentDetails(auth.user?.access_token),
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
        this,
        new GraphManagerState(
          this.applicationStore.pluginManager,
          this.applicationStore.logService,
        ),
        this.lakehouseContractServerClient,
        projectData,
        v1DataProduct,
        false,
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
      if (!this.loadingLakehouseEnvironmentSummariesState.hasCompleted) {
        yield this.fetchLakehouseEnvironmentSummaries(auth.user?.access_token);
      }
      if (!this.loadingLakehouseEnvironmentDetailsState.hasCompleted) {
        yield this.fetchLakehouseEnvironmentDetails(auth.user?.access_token);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load product ${path}: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  *initWithSandboxProduct(
    ingestEnvironmentUrn: string,
    path: string,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const ingestServerUrl: string = guaranteeNonNullable(
        this.lakehouseIngestEnvironmentSummaries.find(
          (summary) => summary.ingestEnvironmentUrn === ingestEnvironmentUrn,
        )?.ingestServerUrl ??
          ((yield this.fetchLakehouseEnvironmentSummary(
            ingestEnvironmentUrn,
            auth.user?.access_token,
          ))?.ingestServerUrl as string),
        `Unable to find ingest server URL for environment ${ingestEnvironmentUrn}`,
      );
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
      yield Promise.all([
        (async () => {
          const graphManager = new V1_PureGraphManager(
            this.applicationStore.pluginManager,
            this.applicationStore.logService,
            this.marketplaceBaseStore.remoteEngine,
          );
          await graphManager.initialize(
            {
              env: this.applicationStore.config.env,
              tabSize: DEFAULT_TAB_SIZE,
              clientConfig: {
                baseUrl: this.applicationStore.config.engineServerUrl,
              },
            },
            { engine: this.marketplaceBaseStore.remoteEngine },
          );
          const graphManagerState = new GraphManagerState(
            this.applicationStore.pluginManager,
            this.applicationStore.logService,
          );
          const entities: Entity[] = await graphManager.pureCodeToEntities(
            sandboxDataProduct.definition,
          );
          await graphManager.buildGraph(
            graphManagerState.graph,
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
            this,
            graphManagerState,
            this.lakehouseContractServerClient,
            VersionedProjectData.serialization.fromJson({
              groupId: '',
              artifactId: '',
              versionId: '',
            }),
            v1_DataProduct,
            true,
            buildDataProductArtifactGeneration({
              ...V1_DataProductArtifactGeneration.serialization.toJson(
                sandboxDataProduct.artifact,
              ),
              content: V1_DataProductArtifactGeneration.serialization.toJson(
                sandboxDataProduct.artifact,
              ),
            }),
            {
              retrieveGraphData: () => {
                return new InMemoryGraphData(graphManagerState.graph);
              },
              viewSDLCProject: () => {
                throw new Error('Project does not exist in SDLC');
              },
              viewIngestEnvironment: () =>
                this.applicationStore.navigationService.navigator.visitAddress(
                  EXTERNAL_APPLICATION_NAVIGATION__generateIngestEnvironemntUrl(
                    ingestServerUrl,
                  ),
                ),
            },
          );
          this.setDataProductViewerState(stateViewer);
          stateViewer.fetchContracts(auth.user?.access_token);
        })(),
        this.fetchLakehouseEnvironmentsByDID(
          [sandboxDataProduct.artifact.dataProduct.deploymentId],
          auth.user?.access_token,
        ),
      ]);
      this.loadingProductsState.complete();
      if (!this.loadingLakehouseEnvironmentSummariesState.hasCompleted) {
        yield this.fetchLakehouseEnvironmentSummaries(auth.user?.access_token);
      }
      if (!this.loadingLakehouseEnvironmentDetailsState.hasCompleted) {
        yield this.fetchLakehouseEnvironmentDetails(auth.user?.access_token);
      }
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
