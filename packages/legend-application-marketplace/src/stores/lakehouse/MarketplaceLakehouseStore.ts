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
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  type CommandRegistrar,
} from '@finos/legend-application';
import { type DepotServerClient } from '@finos/legend-server-depot';
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
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_IngestEnvironment,
  GraphManagerState,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_deserializeIngestEnvironment,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  V1_PureGraphManager,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { DataProductViewerState } from './DataProductViewerState.js';
import type { AuthContextProps } from 'react-oidc-context';
import type { LakehouseContractServerClient } from '@finos/legend-server-marketplace';
import { DataProductState } from './dataProducts/DataProducts.js';
import {
  type LakehousePlatformServerClient,
  type LakehouseIngestServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';
import { getDataProductFromDetails } from './LakehouseUtils.js';

export enum DataProductFilterType {
  DEPLOY_TYPE = 'DEPLOY_TYPE',
  ENVIRONMENT_CLASSIFICATION = 'ENVIRONMENT_CLASSIFICATION',
}

export enum DeployType {
  SDLC = 'SDLC',
  SANDBOX = 'SANDBOX',
  UNKNOWN = 'UNKNOWN',
}

export interface DataProductFilterConfig {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  unknownDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
  unknownEnvironmentClassificationFilter: boolean;
}

class DataProductFilters {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  unknownDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
  unknownEnvironmentClassificationFilter: boolean;
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      sdlcDeployFilter: observable,
      sandboxDeployFilter: observable,
      unknownDeployFilter: observable,
      devEnvironmentClassificationFilter: observable,
      prodParallelEnvironmentClassificationFilter: observable,
      prodEnvironmentClassificationFilter: observable,
      unknownEnvironmentClassificationFilter: observable,
      search: observable,
    });
    this.sdlcDeployFilter = defaultBooleanFilters.sdlcDeployFilter;
    this.sandboxDeployFilter = defaultBooleanFilters.sandboxDeployFilter;
    this.unknownDeployFilter = defaultBooleanFilters.unknownDeployFilter;
    this.devEnvironmentClassificationFilter =
      defaultBooleanFilters.devEnvironmentClassificationFilter;
    this.prodParallelEnvironmentClassificationFilter =
      defaultBooleanFilters.prodParallelEnvironmentClassificationFilter;
    this.prodEnvironmentClassificationFilter =
      defaultBooleanFilters.prodEnvironmentClassificationFilter;
    this.unknownEnvironmentClassificationFilter =
      defaultBooleanFilters.unknownEnvironmentClassificationFilter;
    this.search = search;
  }

  static default(): DataProductFilters {
    return new DataProductFilters(
      {
        sdlcDeployFilter: true,
        sandboxDeployFilter: true,
        unknownDeployFilter: false,
        devEnvironmentClassificationFilter: false,
        prodParallelEnvironmentClassificationFilter: false,
        prodEnvironmentClassificationFilter: true,
        unknownEnvironmentClassificationFilter: false,
      },
      undefined,
    );
  }

  get currentFilterValues(): DataProductFilterConfig {
    return {
      sdlcDeployFilter: this.sdlcDeployFilter,
      sandboxDeployFilter: this.sandboxDeployFilter,
      unknownDeployFilter: this.unknownDeployFilter,
      devEnvironmentClassificationFilter:
        this.devEnvironmentClassificationFilter,
      prodParallelEnvironmentClassificationFilter:
        this.prodParallelEnvironmentClassificationFilter,
      prodEnvironmentClassificationFilter:
        this.prodEnvironmentClassificationFilter,
      unknownEnvironmentClassificationFilter:
        this.unknownEnvironmentClassificationFilter,
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
  dataProductStates: DataProductState[] = [];
  lakehouseIngestEnvironmentSummaries: IngestDeploymentServerConfig[] = [];
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
      dataProductStates: observable,
      lakehouseIngestEnvironmentSummaries: observable,
      lakehouseIngestEnvironmentDetails: observable,
      dataProductViewer: observable,
      handleFilterChange: action,
      handleSearch: action,
      filterSortProducts: computed,
      setDataProductStates: action,
      setDataProductViewerState: action,
      setLakehouseIngestEnvironmentSummaries: action,
      setLakehouseIngestEnvironmentDetails: action,
      filter: observable,
      sort: observable,
      setSort: action,
    });
  }

  get filterSortProducts(): DataProductState[] | undefined {
    return this.dataProductStates
      .filter((dataProductState) => {
        if (!dataProductState.initState.hasCompleted) {
          return false;
        }
        // Check if product matches deploy type filter
        const deployMatch =
          (this.filter.sdlcDeployFilter &&
            dataProductState.dataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin) ||
          (this.filter.sandboxDeployFilter &&
            dataProductState.dataProductDetails.origin instanceof
              V1_AdHocDeploymentDataProductOrigin) ||
          (this.filter.unknownDeployFilter &&
            dataProductState.dataProductDetails.origin === null);
        // Check if product matches environment classification filter
        const environmentClassificationMatch =
          (this.filter.devEnvironmentClassificationFilter &&
            dataProductState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT) ||
          (this.filter.prodParallelEnvironmentClassificationFilter &&
            dataProductState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL) ||
          (this.filter.prodEnvironmentClassificationFilter &&
            dataProductState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION) ||
          (this.filter.unknownEnvironmentClassificationFilter &&
            dataProductState.environmentClassification === undefined);
        // Check if product title matches search filter
        const titleMatch =
          this.filter.search === undefined ||
          this.filter.search === '' ||
          dataProductState.title
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

  setDataProductStates(dataProductStates: DataProductState[]): void {
    this.dataProductStates = dataProductStates;
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: IngestDeploymentServerConfig[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
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
    val:
      | DeployType
      | V1_IngestEnvironmentClassification
      | 'UNKNOWN'
      | undefined,
  ): void {
    if (filterType === DataProductFilterType.DEPLOY_TYPE) {
      if (val === DeployType.SDLC) {
        this.filter.sdlcDeployFilter = !this.filter.sdlcDeployFilter;
      } else if (val === DeployType.SANDBOX) {
        this.filter.sandboxDeployFilter = !this.filter.sandboxDeployFilter;
      } else if (val === DeployType.UNKNOWN) {
        this.filter.unknownDeployFilter = !this.filter.unknownDeployFilter;
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
      } else if (val === 'UNKNOWN') {
        this.filter.unknownEnvironmentClassificationFilter =
          !this.filter.unknownEnvironmentClassificationFilter;
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

      const fetchedDataProductStates = dataProductDetails.map(
        (dataProductDetail) =>
          new DataProductState(this, graphManager, dataProductDetail),
      );
      this.setDataProductStates(fetchedDataProductStates);
      this.dataProductStates.forEach((dataProductState) =>
        dataProductState.init(),
      );
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
          await this.fetchLakehouseEnvironmentDetails(auth.user?.access_token);
        }
      })(),
    ]);
  }

  *initWithProduct(
    dataProductId: string,
    deploymentId: number,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const rawResponse =
        (yield this.lakehouseContractServerClient.getDataProductByIdAndDID(
          dataProductId,
          deploymentId,
          auth.user?.access_token,
        )) as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
      const fetchedDataProductDetails =
        V1_entitlementsDataProductDetailsResponseToDataProductDetails(
          rawResponse,
        );
      if (fetchedDataProductDetails.length === 0) {
        throw new Error(
          `No data products found for ID ${dataProductId} and DID ${deploymentId}`,
        );
      } else if (fetchedDataProductDetails.length > 1) {
        throw new Error(
          `Multiple data products found for ID ${dataProductId} and DID ${deploymentId}`,
        );
      }

      const dataProductDetails = guaranteeNonNullable(
        fetchedDataProductDetails[0],
      );
      const graphManagerState = new GraphManagerState(
        this.applicationStore.pluginManager,
        this.applicationStore.logService,
      );
      // Crete graph manager for parsing ad-hoc deployed data products
      const graphManager = new V1_PureGraphManager(
        this.applicationStore.pluginManager,
        this.applicationStore.logService,
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
      const v1DataProduct = guaranteeType(
        yield getDataProductFromDetails(
          dataProductDetails,
          graphManagerState,
          graphManager,
          this.marketplaceBaseStore,
        ),
        V1_DataProduct,
        `Unable to get V1_DataProduct from details for id: ${dataProductDetails.id}`,
      );

      const stateViewer = new DataProductViewerState(
        this.applicationStore,
        this,
        graphManagerState,
        this.lakehouseContractServerClient,
        v1DataProduct,
        dataProductDetails,
        {
          viewDataProductSource: () => {
            if (
              dataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin
            ) {
              this.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                  this.applicationStore.config.studioServerUrl,
                  dataProductDetails.origin.group,
                  dataProductDetails.origin.artifact,
                  dataProductDetails.origin.version,
                  v1DataProduct.path,
                ),
              );
            }
          },
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
        `Unable to load product ${dataProductId}: ${error.message}`,
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
