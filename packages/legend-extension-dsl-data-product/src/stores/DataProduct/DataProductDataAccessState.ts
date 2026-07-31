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
  type GraphManagerState,
  type V1_AccessPointGroup,
  type V1_CreateContractPayload,
  type V1_CreateDataAccessRequestPayload,
  type V1_DataContractsResponse,
  type V1_DataContractSubscriptions,
  type V1_DataProduct,
  type V1_DataRequestsWithWorkflowResponse,
  type V1_EngineServerClient,
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsUserEnv,
  type V1_DataSubscriptionTarget,
  type V1_IngestEnvironment,
  type V1_LiteDataContract,
  type V1_OrganizationalScope,
  V1_AdhocTeam,
  V1_AppDirLevel,
  V1_AppDirNode,
  V1_RequestState,
  V1_createContractPayloadModelSchema,
  V1_createDataAccessRequestPayloadModelSchema,
  V1_deserializeDataContractResponse,
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_deserializeDataSubscriptionTargetsResponse,
  V1_deserializeIngestEnvironment,
  V1_isIngestEnvsCompatibleWithEntitlements,
  V1_liteDataContractsResponseModelSchemaToContracts,
  V1_liteDataContractWithUserStatusModelSchema,
  V1_ResourceType,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProductOriginType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  LogEvent,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { deserialize, serialize } from 'serializr';
import {
  type LakehouseIngestServerClient,
  type LakehouseContractServerClient,
  type LakehousePlatformServerClient,
  type PermitWorkflowServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  DSL_DATAPRODUCT_EVENT,
  DSL_DATAPRODUCT_EVENT_STATUS,
} from '../../__lib__/DSL_DataProduct_Event.js';
import type { DataProductAPGState } from './DataProductAPGState.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../DataProductDataAccess_LegendApplicationPlugin_Extension.js';
import type { DataProductAccessPointState } from './DataProductAccessPointState.js';
import { PermitDataAccessRequestState } from './DataAccess/PermitDataAccessRequestState.js';
import { type DataAccessRequestState } from './DataAccess/DataAccessRequestState.js';
import {
  runMissingIngestsCheckForArtifact,
  openOperationUrlLink,
} from '../../utils/DataProductIngestUtils.js';
import {
  DATAPRODUCT_TYPE,
  DataProductTelemetryHelper,
  PRODUCT_INTEGRATION_TYPE,
} from '../../__lib__/DataProductTelemetryHelper.js';

const LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE = 'lakehouseConsumer';
const DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';

export enum DataAccessRequestType {
  CONTRACT = 'CONTRACT',
  WORKFLOW = 'WORKFLOW',
  PERMIT = 'PERMIT',
}

export type ContractCreationRendererResult = {
  component: React.ReactNode;
  requestType: DataAccessRequestType;
};

export type ContractConsumerTypeRendererConfig = {
  type: string;
  createContractRenderer: (
    apgState: DataProductAPGState,
    handleOrganizationalScopeChange: (consumer: V1_OrganizationalScope) => void,
    handleDescriptionChange: (description: string | undefined) => void,
    handleIsValidChange: (isValid: boolean) => void,
  ) => ContractCreationRendererResult;
  organizationalScopeTypeName?: (
    consumer: V1_OrganizationalScope,
  ) => string | undefined;
  organizationalScopeTypeDetailsRenderer?: (
    consumer: V1_OrganizationalScope,
  ) => React.ReactNode | undefined;
  stringifyOrganizationalScope?: (
    consumer: V1_OrganizationalScope,
  ) => string | undefined;
  renderOrganizationalScope?: (
    consumer: V1_OrganizationalScope,
  ) => React.ReactNode | undefined;
  enableForEnterpriseAPGs?: boolean;
};

export type DataProductDataAccessStateActions = {
  getContractTaskUrl: (contractId: string, taskId: string) => string;
  getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
  getTaskPageUrl?: (dataAccessRequestId: string) => string;
};

export type DataProductAccessPointCodeConfiguration = {
  key: string;
  label: string;
  icon: React.ReactNode | null;
  renderer: (
    accessPointState: DataProductAccessPointState,
    dataAccessState: DataProductDataAccessState | undefined,
  ) => React.ReactNode;
};

export class DataProductDataAccessState {
  readonly entitlementsDataProductDetails: V1_EntitlementsDataProductDetails;
  readonly dataProductViewerState: DataProductViewerState;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly engineServerClient: V1_EngineServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly permitWorkflowServerClient: PermitWorkflowServerClient | undefined;
  readonly graphManagerState: GraphManagerState;
  readonly dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[];

  // actions/data callbacks
  readonly getContractTaskUrl: (contractId: string, taskId: string) => string;
  readonly getDataProductUrl: (
    dataProductId: string,
    deploymentId: number,
  ) => string;
  readonly getTaskPageUrl:
    | ((dataAccessRequestId: string) => string)
    | undefined;

  // state
  associatedContracts: V1_LiteDataContract[] | undefined = undefined;
  contractCreatorAPG: V1_AccessPointGroup | undefined = undefined;
  contractViewerContractAndSubscription:
    | V1_DataContractSubscriptions
    | undefined = undefined;
  dataAccessRequestViewerState: DataAccessRequestState | undefined = undefined;
  lakehouseIngestEnvironmentSummaries: IngestDeploymentServerConfig[] = [];
  lakehouseIngestEnv: IngestDeploymentServerConfig | undefined;
  lakehouseIngestEnvDetails: V1_IngestEnvironment | undefined;
  userEntitlementsEnv: V1_EntitlementsUserEnv[] | undefined;
  dataProductOwners: string[] = [];
  subscriptionTargets: V1_DataSubscriptionTarget[] = [];

  readonly creatingContractState = ActionState.create();
  readonly creatingWorkflowRequestState = ActionState.create();
  readonly ingestEnvironmentFetchState = ActionState.create();
  readonly fetchingDataProductOwnersState = ActionState.create();
  readonly fetchingSubscriptionTargetsState = ActionState.create();

  constructor(
    entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
    dataProductViewerState: DataProductViewerState,
    lakehouseContractServerClient: LakehouseContractServerClient,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
    lakehouseIngestServerClient: LakehouseIngestServerClient,
    dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
    actions: DataProductDataAccessStateActions,
    permitWorkflowServerClient?: PermitWorkflowServerClient | undefined,
  ) {
    makeObservable(this, {
      associatedContracts: observable,
      contractCreatorAPG: observable,
      contractViewerContractAndSubscription: observable,
      dataAccessRequestViewerState: observable,
      lakehouseIngestEnvironmentSummaries: observable,
      lakehouseIngestEnv: observable,
      lakehouseIngestEnvDetails: observable,
      userEntitlementsEnv: observable,
      dataProductOwners: observable,
      subscriptionTargets: observable,
      setContractViewerContractAndSubscription: action,
      setDataAccessRequestViewerState: action,
      setAssociatedContracts: action,
      filteredDataProductQueryEnvs: computed,
      resolvedUserEnv: computed,
      setContractCreatorAPG: action,
      setLakehouseIngestEnvironmentSummaries: action,
      setEntitlementsEnv: action,
      setLakehouseIngestEnv: action,
      setLakehouseIngestEnvDetails: action,
      createContract: flow,
      createWorkflowRequest: flow,
      fetchContracts: action,
      fetchIngestEnvironmentDetails: action,
      setDataProductOwners: action,
      setSubscriptionTargets: action,
      fetchSubscriptionTargets: action,
      init: flow,
    });

    this.entitlementsDataProductDetails = entitlementsDataProductDetails;
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = this.dataProductViewerState.applicationStore;
    this.engineServerClient = this.dataProductViewerState.engineServerClient;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;
    this.lakehouseIngestServerClient = lakehouseIngestServerClient;
    this.permitWorkflowServerClient = permitWorkflowServerClient;
    this.graphManagerState = this.dataProductViewerState.graphManagerState;
    this.dataAccessPlugins = dataAccessPlugins;

    // actions
    this.getContractTaskUrl = actions.getContractTaskUrl;
    this.getDataProductUrl = actions.getDataProductUrl;
    this.getTaskPageUrl = actions.getTaskPageUrl;

    this.dataProductViewerState.setDataProductDataAccessState(this);
  }

  get product(): V1_DataProduct {
    return this.dataProductViewerState.product;
  }

  get filteredDataProductQueryEnvs(): IngestDeploymentServerConfig[] {
    const dataProductEnv =
      this.entitlementsDataProductDetails.lakehouseEnvironment?.type;
    const filteredByClassification =
      this.lakehouseIngestEnvironmentSummaries.filter(
        (env) =>
          dataProductEnv === undefined ||
          V1_isIngestEnvsCompatibleWithEntitlements(
            env.environmentClassification,
            dataProductEnv,
          ),
      );
    if (this.userEntitlementsEnv?.length) {
      const userEnvs = this.userEntitlementsEnv.map(
        (e) => e.lakehouseEnvironment,
      );
      return filteredByClassification.filter((e) =>
        userEnvs.includes(e.environmentName),
      );
    }
    return filteredByClassification;
  }

  get resolvedUserEnv(): IngestDeploymentServerConfig | undefined {
    if (this.filteredDataProductQueryEnvs.length === 1) {
      return this.filteredDataProductQueryEnvs[0];
    }
    return undefined;
  }

  /**
   * Builds the lakehouse-consumer DataCube `sourceData` for an access point;
   * query-string handling is the caller's concern, not the store's.
   */
  buildDataCubeSourceData(
    accessPointName: string,
    environmentName: string,
  ): Record<string, unknown> {
    const details = this.entitlementsDataProductDetails;
    const origin = details.origin;
    const sourceData: Record<string, unknown> = {
      _type: LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
      warehouse: DEFAULT_CONSUMER_WAREHOUSE,
      environment: environmentName,
      paths: [this.dataProductViewerState.product.path, accessPointName],
      deploymentId: details.deploymentId,
    };
    if (origin instanceof V1_SdlcDeploymentDataProductOrigin) {
      sourceData.origin = {
        _type: V1_DataProductOriginType.SDLC_DEPLOYMENT,
        dpCoordinates: {
          groupId: origin.group,
          artifactId: origin.artifact,
          versionId: origin.version,
        },
      };
    } else if (origin instanceof V1_AdHocDeploymentDataProductOrigin) {
      sourceData.origin = {
        _type: V1_DataProductOriginType.AD_HOC_DEPLOYMENT,
      };
    } else {
      throw new UnsupportedOperationError(
        `Can't open DataCube: unsupported data product origin`,
      );
    }
    return sourceData;
  }

  /**
   * Opens an access point in DataCube via the configured launcher, logging the
   * integration-open telemetry. Throws if no launcher or origin is available.
   */
  openAccessPointInDataCube(
    accessPointName: string,
    environmentName: string,
    extraSourceData?: Record<string, unknown>,
  ): void {
    const openDataCube = guaranteeNonNullable(
      this.dataProductViewerState.openDataCube,
      `Can't open DataCube: no launcher is configured for this data product`,
    );
    const details = this.entitlementsDataProductDetails;
    const sourceData = {
      ...this.buildDataCubeSourceData(accessPointName, environmentName),
      ...extraSourceData,
    };
    try {
      DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
        this.applicationStore.telemetryService,
        {
          origin:
            details.origin instanceof V1_SdlcDeploymentDataProductOrigin
              ? {
                  type: DATAPRODUCT_TYPE.SDLC,
                  groupId: details.origin.group,
                  artifactId: details.origin.artifact,
                  versionId: details.origin.version,
                }
              : { type: DATAPRODUCT_TYPE.ADHOC },
          deploymentId: details.deploymentId,
          name: details.dataProduct.name,
          productIntegrationType: PRODUCT_INTEGRATION_TYPE.DATA_CUBE,
          accessPointPath: accessPointName,
          environmentClassification: details.lakehouseEnvironment?.type,
        },
        undefined,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(
          DSL_DATAPRODUCT_EVENT.ERROR_LOG_OPEN_DATACUBE_FROM_AI_CHAT,
        ),
        error,
      );
    }
    openDataCube(sourceData);
  }

  generateOperationalUrlForIngestUrn(
    producerUrn?: string,
    ingestDefinitionUrn?: string,
  ): string | undefined {
    const baseUrl =
      this.dataProductViewerState.dataProductConfig?.operationalUrl;
    const ingestEnvironmentUrn = this.lakehouseIngestEnv?.ingestEnvironmentUrn;
    if (!baseUrl || !ingestEnvironmentUrn) {
      return undefined;
    }
    return openOperationUrlLink(
      baseUrl,
      ingestEnvironmentUrn,
      producerUrn,
      ingestDefinitionUrn,
    );
  }

  setAssociatedContracts(val: V1_LiteDataContract[] | undefined): void {
    this.associatedContracts = val;
  }

  setContractCreatorAPG(val: V1_AccessPointGroup | undefined) {
    this.contractCreatorAPG = val;
  }

  setContractViewerContractAndSubscription(
    val: V1_DataContractSubscriptions | undefined,
  ) {
    this.contractViewerContractAndSubscription = val;
  }

  setDataAccessRequestViewerState(
    val: DataAccessRequestState | undefined,
  ): void {
    this.dataAccessRequestViewerState = val;
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: IngestDeploymentServerConfig[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setLakehouseIngestEnv(env: IngestDeploymentServerConfig | undefined): void {
    this.lakehouseIngestEnv = env;
  }

  setLakehouseIngestEnvDetails(env: V1_IngestEnvironment | undefined): void {
    this.lakehouseIngestEnvDetails = env;
  }

  setEntitlementsEnv(envs: V1_EntitlementsUserEnv[] | undefined): void {
    this.userEntitlementsEnv = envs;
  }

  setDataProductOwners(owners: string[]): void {
    this.dataProductOwners = owners;
  }

  async fetchIngestEnvironmentDetails(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    if (!this.ingestEnvironmentFetchState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store ingest environment details are re-initialized',
      );
      return;
    }

    this.ingestEnvironmentFetchState.inProgress();
    await Promise.all([
      this.fetchLakehouseIngestEnvironmentSummaries(tokenProvider),
      this.fetchLakehouseIngestEnv(tokenProvider),
      this.fetchEntitlementsEnvs(tokenProvider),
    ]);
    this.ingestEnvironmentFetchState.complete();
  }

  async fetchContracts(tokenProvider: () => string | undefined): Promise<void> {
    try {
      this.dataProductViewerState.apgStates.forEach((e) =>
        e.fetchingAccessState.inProgress(),
      );
      const didNode = new V1_AppDirNode();
      didNode.appDirId = this.entitlementsDataProductDetails.deploymentId;
      didNode.level = V1_AppDirLevel.DEPLOYMENT;

      // Fetch data product contracts and current user's contracts in parallel.
      // The user contracts call is fetched ONCE per data product (rather than
      // once per APG) for performance reasons. The result is shared across all
      // APG states.
      const [_contracts, rawUserContracts] = await Promise.all([
        this.lakehouseContractServerClient.getDataContractsForDataProduct(
          V1_ResourceType.ACCESS_POINT_GROUP,
          this.entitlementsDataProductDetails.dataProduct.name,
          this.entitlementsDataProductDetails.deploymentId,
          tokenProvider(),
        ),
        this.lakehouseContractServerClient.getContractsForUser(
          this.applicationStore.identityService.currentUser,
          tokenProvider(),
        ),
      ]);

      const dataProductContracts =
        V1_liteDataContractsResponseModelSchemaToContracts(
          _contracts,
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        );

      const userContracts = rawUserContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );

      this.setAssociatedContracts(dataProductContracts);
      this.dataProductViewerState.apgStates.forEach((e) => {
        // eslint-disable-next-line no-void
        void e.handleDataProductContracts(
          dataProductContracts,
          userContracts,
          this.lakehouseContractServerClient,
          tokenProvider,
          this.dataAccessPlugins,
        );
      });
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.dataProductViewerState.apgStates.forEach((e) =>
        e.fetchingAccessState.complete(),
      );
    }
  }

  *init(tokenProvider: () => string | undefined): GeneratorFn<void> {
    yield Promise.all([
      this.fetchContracts(tokenProvider),
      this.fetchIngestEnvironmentDetails(tokenProvider),
      this.fetchDataProductOwners(tokenProvider),
      ...this.dataProductViewerState.apgStates.map((apgState) =>
        flowResult(apgState.fetchMissingIngests(tokenProvider)),
      ),
    ]);
  }

  logCreatingContract(
    request: PlainObject<V1_CreateContractPayload>,
    consumerType: string,
    error: string | undefined,
  ): void {
    const data =
      error === undefined
        ? {
            ...request,
            consumerType: consumerType,
            status: DSL_DATAPRODUCT_EVENT_STATUS.SUCCESS,
          }
        : {
            ...request,
            consumerType: consumerType,
            status: DSL_DATAPRODUCT_EVENT_STATUS.FAILURE,
            error: error,
          };
    this.applicationStore.telemetryService.logEvent(
      DSL_DATAPRODUCT_EVENT.CREATE_CONTRACT,
      data,
    );
  }

  *createContract(
    consumer: V1_OrganizationalScope,
    description: string,
    group: V1_AccessPointGroup,
    tokenProvider: () => string | undefined,
    consumerType: string,
  ): GeneratorFn<void> {
    try {
      this.creatingContractState.inProgress();
      const request = serialize(
        V1_createContractPayloadModelSchema(
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        {
          description,
          resourceId: this.product.name,
          resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
          deploymentId: this.entitlementsDataProductDetails.deploymentId,
          accessPointGroup: group.id,
          consumer,
        } satisfies V1_CreateContractPayload,
      ) as PlainObject<V1_CreateContractPayload>;
      try {
        const contractsAndSubscriptions = V1_deserializeDataContractResponse(
          (yield this.lakehouseContractServerClient.createContract(
            request,
            tokenProvider(),
          )) as PlainObject<V1_DataContractsResponse>,
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        );
        const associatedContractAndSubscription = contractsAndSubscriptions[0];
        // Only if the user has requested a contract for themself do we update the associated contract.
        if (
          associatedContractAndSubscription?.dataContract.consumer instanceof
            V1_AdhocTeam &&
          associatedContractAndSubscription.dataContract.consumer.users.some(
            (u) => u.name === this.applicationStore.identityService.currentUser,
          )
        ) {
          const apgState = this.dataProductViewerState.apgStates.find(
            (e) => e.apg === group,
          );
          apgState?.setAssociatedUserContract(
            associatedContractAndSubscription.dataContract,
            this.lakehouseContractServerClient,
            tokenProvider,
          );
        }

        this.setContractCreatorAPG(undefined);
        this.setContractViewerContractAndSubscription(
          associatedContractAndSubscription,
        );
        this.applicationStore.notificationService.notifySuccess(
          `Contract created, please go to contract view for pending tasks`,
        );
        this.logCreatingContract(request, consumerType, undefined);
        yield this.fetchContracts(tokenProvider);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(
          `${error.message}`,
        );
        this.logCreatingContract(request, consumerType, error.message);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.creatingContractState.complete();
    }
  }

  *createWorkflowRequest(
    consumer: V1_OrganizationalScope,
    description: string,
    group: V1_AccessPointGroup,
    tokenProvider: () => string | undefined,
    consumerType: string,
  ): GeneratorFn<void> {
    try {
      this.creatingWorkflowRequestState.inProgress();
      const request = serialize(
        V1_createDataAccessRequestPayloadModelSchema(
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        {
          description,
          resourceId: this.product.name,
          deploymentId: this.entitlementsDataProductDetails.deploymentId,
          accessPointGroup: group.id,
          consumer,
        } satisfies V1_CreateDataAccessRequestPayload,
      ) as PlainObject<V1_CreateDataAccessRequestPayload>;
      try {
        const response = V1_deserializeDataRequestsWithWorkflowResponse(
          (yield this.lakehouseContractServerClient.createDataAccessRequest(
            request,
            tokenProvider(),
          )) as PlainObject<V1_DataRequestsWithWorkflowResponse>,
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        );
        if (response.length > 0) {
          const dataRequestWithWorkflow = guaranteeNonNullable(response[0]);
          const guid = dataRequestWithWorkflow.dataRequest.guid;
          this.setContractCreatorAPG(undefined);
          this.applicationStore.notificationService.notifySuccess(
            `Data access request created successfully`,
          );
          const authClient = this.lakehouseContractServerClient;
          const plugins =
            this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins();
          const viewerState = new PermitDataAccessRequestState(
            guid,
            this.applicationStore,
            this.permitWorkflowServerClient,
            this.dataProductViewerState.userSearchService,
            {
              authServerClient: authClient,
              initialData: dataRequestWithWorkflow,
              fetchFresh: async (token) => {
                const raw = await authClient.getDataAccessRequestWithWorkflow(
                  guid,
                  token,
                );
                return V1_deserializeDataRequestsWithWorkflowResponse(
                  raw,
                  plugins,
                )[0];
              },
              ...(this.getTaskPageUrl
                ? { getTaskPageUrl: this.getTaskPageUrl }
                : {}),
            },
          );
          this.setDataAccessRequestViewerState(viewerState);

          // Update the APG button state if the current user belongs to the consumer's org
          const orgNodeCode = this.dataAccessPlugins
            .map((p) => p.getOrganizationalNodeCode?.(consumer))
            .find(isNonNullable);
          if (orgNodeCode) {
            const apgState = this.dataProductViewerState.apgStates.find(
              (s) => s.apg.id === group.id,
            );
            if (apgState) {
              // eslint-disable-next-line no-void
              void apgState.checkAndSetAccessForOrgRequest(
                orgNodeCode,
                guid,
                V1_RequestState.SUBMITTED_FOR_APPROVALS,
                this.dataAccessPlugins,
                tokenProvider(),
              );
            }
          }
        }
        this.applicationStore.telemetryService.logEvent(
          DSL_DATAPRODUCT_EVENT.CREATE_CONTRACT,
          {
            ...request,
            consumerType,
            status: DSL_DATAPRODUCT_EVENT_STATUS.SUCCESS,
            requestType: 'workflow',
          },
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(
          `${error.message}`,
        );
        this.applicationStore.telemetryService.logEvent(
          DSL_DATAPRODUCT_EVENT.CREATE_CONTRACT,
          {
            ...request,
            consumerType,
            status: DSL_DATAPRODUCT_EVENT_STATUS.FAILURE,
            error: error.message,
            requestType: 'workflow',
          },
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.creatingWorkflowRequestState.complete();
    }
  }

  async fetchLakehouseIngestEnvironmentSummaries(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    try {
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironmentSummaries(
          tokenProvider(),
        )
      ).map((e: PlainObject<IngestDeploymentServerConfig>) =>
        IngestDeploymentServerConfig.serialization.fromJson(e),
      );
      this.setLakehouseIngestEnvironmentSummaries(discoveryEnvironments);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to load lakehouse environment summaries: ${error.message}`,
      );
    }
  }

  async fetchLakehouseIngestEnv(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    try {
      const did = this.entitlementsDataProductDetails.deploymentId;
      const ingestEnv =
        await this.lakehousePlatformServerClient.findProducerServer(
          did,
          undefined,
          tokenProvider(),
        );
      const ingestServerUrl =
        IngestDeploymentServerConfig.serialization.fromJson(ingestEnv);
      this.setLakehouseIngestEnv(ingestServerUrl);
      try {
        const rawIngestEnvDetails =
          await this.lakehouseIngestServerClient.getIngestEnvironment(
            ingestServerUrl.ingestServerUrl,
            tokenProvider(),
          );
        this.setLakehouseIngestEnvDetails(
          V1_deserializeIngestEnvironment(rawIngestEnvDetails),
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
          `Unable to load lakehouse ingest env details for ${ingestServerUrl.ingestEnvironmentUrn}: ${error.message}`,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to find lakehouse ingest env with did: ${this.entitlementsDataProductDetails.deploymentId}, error: ${error.message}`,
      );
    }
  }

  async computeMissingIngestsForApg(
    accessPointGroupId: string,
    tokenProvider: () => string | undefined,
  ): Promise<string[]> {
    const origin = this.entitlementsDataProductDetails.origin;
    if (!(origin instanceof V1_SdlcDeploymentDataProductOrigin)) {
      return [];
    }
    const artifact =
      await this.dataProductViewerState.dataProductArtifactPromise;
    if (!artifact) {
      return [];
    }
    return runMissingIngestsCheckForArtifact(
      {
        accessPointGroupId,
        deploymentId: this.entitlementsDataProductDetails.deploymentId,
        dataProductName: this.entitlementsDataProductDetails.dataProduct.name,
        gavCoordinates: {
          groupId: origin.group,
          artifactId: origin.artifact,
          versionId: origin.version,
        },
        artifact,
        v1DataProduct: this.product,
      },
      {
        lakehouseIngestServerClient: this.lakehouseIngestServerClient,
        lakehousePlatformServerClient: this.lakehousePlatformServerClient,
        plugins:
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        getGraphManager: async () => this.graphManagerState.graphManager,
      },
      tokenProvider(),
    );
  }

  async fetchEntitlementsEnvs(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    try {
      const envs =
        await this.lakehouseContractServerClient.getUserEntitlementEnvs(
          this.applicationStore.identityService.currentUser,
          tokenProvider(),
        );
      this.setEntitlementsEnv(envs.users);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to load entitlements envs: ${error.message}`,
      );
    }
  }

  async fetchDataProductOwners(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    this.fetchingDataProductOwnersState.inProgress();
    try {
      const rawOwnershipResponse =
        await this.lakehouseContractServerClient.getOwnersForDid(
          this.entitlementsDataProductDetails.deploymentId,
          tokenProvider(),
        );
      const owners = this.dataAccessPlugins.flatMap(
        (plugin) =>
          plugin.handleDataProductOwnersResponse?.(rawOwnershipResponse) ?? [],
      );
      this.setDataProductOwners(owners);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create('data-product.fetchDataProductOwners.failure'),
        `Unable to fetch data product owners: ${error.message}`,
      );
    } finally {
      this.fetchingDataProductOwnersState.complete();
    }
  }

  setSubscriptionTargets(targets: V1_DataSubscriptionTarget[]): void {
    this.subscriptionTargets = targets;
  }

  /**
   * Fetches the available subscription targets once per store instance.
   * Subsequent calls are no-ops while a fetch is in-flight or has completed.
   */
  async fetchSubscriptionTargets(
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    if (!this.fetchingSubscriptionTargetsState.isInInitialState) {
      return;
    }
    this.fetchingSubscriptionTargetsState.inProgress();
    try {
      const rawResponse =
        await this.lakehouseContractServerClient.getSubscriptionTargets(
          tokenProvider(),
        );
      const targets =
        V1_deserializeDataSubscriptionTargetsResponse(rawResponse).targets;
      this.setSubscriptionTargets(targets);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create('data-product.fetchSubscriptionTargets.failure'),
        `Unable to fetch subscription targets: ${error.message}`,
      );
    } finally {
      this.fetchingSubscriptionTargetsState.complete();
    }
  }
}
