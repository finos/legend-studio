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
  projectIdHandlerFunc,
  resolveVersion,
  StoreProjectData,
  VersionedProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  action,
  computed,
  flow,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
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
  DataProductArtifactGeneration,
  GraphDataWithOrigin,
  GraphManagerState,
  InMemoryGraphData,
  LegendSDLC,
  V1_AdHocDeploymentDataProductOrigin,
  V1_AppDirLevel,
  V1_DataProduct,
  V1_DataProductArtifactGeneration,
  V1_dataProductModelSchema,
  V1_deserializeIngestEnvironment,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_IngestEnvironmentClassification,
  V1_PureGraphManager,
  V1_SandboxDataProductDeploymentResponse,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import {
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
import { DataProductState } from './dataProducts/DataProducts.js';
import {
  type LakehousePlatformServerClient,
  type LakehouseIngestServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';

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

  get currentFilterValues(): DataProductFilterConfig {
    return {
      sdlcDeployFilter: this.sdlcDeployFilter,
      sandboxDeployFilter: this.sandboxDeployFilter,
      devEnvironmentClassificationFilter:
        this.devEnvironmentClassificationFilter,
      prodParallelEnvironmentClassificationFilter:
        this.prodParallelEnvironmentClassificationFilter,
      prodEnvironmentClassificationFilter:
        this.prodEnvironmentClassificationFilter,
    };
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
  loadingProductsState = ActionState.create();
  loadingLakehouseEnvironmentSummariesState = ActionState.create();
  loadingLakehouseEnvironmentsByDIDState = ActionState.create();
  loadingLakehouseEnvironmentDetailsState = ActionState.create();
  loadingSandboxDataProductStates = ActionState.create();
  filter: DataProductFilters;
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

    const savedFilterConfig =
      LegendMarketplaceUserDataHelper.getSavedDataProductFilterConfig(
        this.applicationStore.userDataService,
      );
    this.filter = savedFilterConfig
      ? new DataProductFilters(savedFilterConfig, undefined)
      : DataProductFilters.default();

    makeObservable(this, {
      init: flow,
      initWithProduct: flow,
      initWithSandboxProduct: flow,
      productStatesMap: observable,
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
      filter: observable,
      sort: observable,
      setSort: action,
    });
  }

  get filterSortProducts(): DataProductState[] | undefined {
    return Array.from(this.productStatesMap.values())
      .filter((dataProductState) => {
        if (!dataProductState.isInitialized) {
          return false;
        }
        // Check if product matches deploy type filter
        const deployMatch =
          (this.filter.sdlcDeployFilter &&
            dataProductState.currentDataProductDetailsAndElement
              ?.entitlementsDataProductDetails?.origin instanceof
              V1_SdlcDeploymentDataProductOrigin) ||
          (this.filter.sandboxDeployFilter &&
            dataProductState.currentDataProductDetailsAndElement
              ?.entitlementsDataProductDetails?.origin instanceof
              V1_AdHocDeploymentDataProductOrigin) ||
          dataProductState.currentDataProductDetailsAndElement
            ?.entitlementsDataProductDetails.origin === null;
        // Check if product matches environment classification filter
        const environmentClassification = dataProductState
          .currentDataProductDetailsAndElement?.entitlementsDataProductDetails
          ?.deploymentId
          ? dataProductState.lakehouseState.lakehouseIngestEnvironmentsByDID.get(
              `${dataProductState.currentDataProductDetailsAndElement?.entitlementsDataProductDetails.deploymentId}`,
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
        const dataProductTitle = dataProductState.title;
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
    LegendMarketplaceUserDataHelper.saveDataProductFilterConfig(
      this.applicationStore.userDataService,
      this.filter.currentFilterValues,
    );
  }

  handleSearch(query: string | undefined) {
    this.filter.search = query;
  }

  setSort(sort: DataProductSort): void {
    this.sort = sort;
  }

  async fetchDataProducts(token: string | undefined): Promise<void> {
    try {
      this.loadingProductsState.inProgress();
      const rawResponse =
        await this.lakehouseContractServerClient.getDataProducts(token);
      const dataProductDetails =
        V1_entitlementsDataProductDetailsResponseToDataProductDetails(
          rawResponse,
        );

      // Crete graph manager for parsing ad-hoc deployed data products
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

      // Store details in the product states map
      dataProductDetails.forEach((dataProductDetail) => {
        const originType =
          dataProductDetail.origin instanceof V1_SdlcDeploymentDataProductOrigin
            ? 'sdlc'
            : dataProductDetail.origin instanceof
                V1_AdHocDeploymentDataProductOrigin
              ? 'ad-hoc'
              : 'unknown';
        const originDetails =
          dataProductDetail.origin instanceof V1_SdlcDeploymentDataProductOrigin
            ? `${dataProductDetail.origin.group}:${dataProductDetail.origin.artifact}`
            : dataProductDetail.origin instanceof
                V1_AdHocDeploymentDataProductOrigin
              ? `${dataProductDetail.deploymentId}`
              : 'unknown';
        const key = `${dataProductDetail.id}:${originType}:${originDetails}`;
        if (!this.productStatesMap.has(key)) {
          runInAction(() => {
            this.productStatesMap.set(
              key,
              new DataProductState(this, graphManager),
            );
          });
        }
        const productState = guaranteeNonNullable(
          this.productStatesMap.get(key),
        );
        productState.addDataProductDetails(dataProductDetail);
      });
      // Set the currentProductEntity for each product state to the latest version (or if no released versions, just pick the first snapshot version)
      this.productStatesMap.forEach((dataProductState) => {
        const dataProductDetailsForId = Array.from(
          dataProductState.dataProductDetailsMap.values(),
        );
        const latestReleasedDataProduct = dataProductDetailsForId
          .map((detail) =>
            detail.entitlementsDataProductDetails.origin instanceof
            V1_SdlcDeploymentDataProductOrigin
              ? detail.entitlementsDataProductDetails.origin.version
              : undefined,
          )
          .filter(isNonNullable)
          .sort()[0];
        if (latestReleasedDataProduct) {
          dataProductState.setSelectedVersion(latestReleasedDataProduct);
        } else if (dataProductDetailsForId[0]) {
          dataProductState.setSelectedVersion(
            dataProductDetailsForId[0].entitlementsDataProductDetails instanceof
              V1_SdlcDeploymentDataProductOrigin
              ? dataProductDetailsForId[0].entitlementsDataProductDetails
                  .version
              : dataProductDetailsForId[0]
                    .entitlementsDataProductDetails instanceof
                  V1_AdHocDeploymentDataProductOrigin
                ? `${dataProductDetailsForId[0].entitlementsDataProductDetails.deploymentId}`
                : 'default',
          );
        }
      });
      this.loadingProductsState.complete();
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
      const didsAndEnvironments = (
        await Promise.all(
          dids.map(async (did) => {
            try {
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
            } catch (error) {
              assertErrorThrown(error);
              this.applicationStore.notificationService.notifyError(
                `Unable to load lakehouse environment for DID ${did}: ${error.message}`,
              );
              return undefined;
            }
          }),
        )
      ).filter(isNonNullable);
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
      const ingestEnvironments: V1_IngestEnvironment[] = (
        await Promise.all(
          this.lakehouseIngestEnvironmentSummaries.map(async (discoveryEnv) => {
            try {
              const env =
                await this.lakehouseIngestServerClient.getIngestEnvironment(
                  discoveryEnv.ingestServerUrl,
                  token,
                );
              return V1_deserializeIngestEnvironment(env);
            } catch (error) {
              assertErrorThrown(error);
              this.applicationStore.notificationService.notifyError(
                `Unable to load lakehouse environment details for ${discoveryEnv.ingestEnvironmentUrn}: ${error.message}`,
              );
              return undefined;
            }
          }),
        )
      ).filter(isNonNullable);
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

  *init(auth: AuthContextProps): GeneratorFn<void> {
    yield Promise.all([
      (async () => {
        if (!this.loadingProductsState.hasCompleted) {
          await this.fetchDataProducts(auth.user?.access_token);
        }
      })(),
      (async () => {
        if (!this.loadingLakehouseEnvironmentSummariesState.hasCompleted) {
          await this.fetchLakehouseEnvironmentSummaries(
            auth.user?.access_token,
          );
          await Promise.all([
            (async () => {
              await this.fetchLakehouseEnvironmentsByDID(
                Array.from(this.productStatesMap.values())
                  .flatMap((state) =>
                    Array.from(state.dataProductDetailsMap.values()),
                  )
                  .map(
                    (detail) =>
                      `${detail.entitlementsDataProductDetails.deploymentId}`,
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
