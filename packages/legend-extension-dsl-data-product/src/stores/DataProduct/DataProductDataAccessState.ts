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
  type V1_DataContract,
  type V1_DataContractsResponse,
  type V1_DataProduct,
  type V1_EngineServerClient,
  type V1_IngestEnvironment,
  type V1_OrganizationalScope,
  V1_AdhocTeam,
  V1_AppDirLevel,
  V1_AppDirNode,
  V1_AppDirNodeModelSchema,
  V1_createContractPayloadModelSchema,
  V1_dataContractsResponseModelSchemaToContracts,
  V1_deserializeIngestEnvironment,
  V1_ResourceType,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  isNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { serialize } from 'serializr';
import { dataContractContainsDataProduct } from '../../utils/DataContractUtils.js';
import {
  type LakehouseIngestServerClient,
  type LakehouseContractServerClient,
  type LakehousePlatformServerClient,
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { DSL_DATAPRODUCT_EVENT } from '../../__lib__/DSL_DataProduct_Event.js';
import type { DataProductAPGState } from './DataProductAPGState.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../DataProductDataAccess_LegendApplicationPlugin_Extension.js';

export type ContractConsumerTypeRendererConfig = {
  type: string;
  createContractRenderer: (
    apgState: DataProductAPGState,
    handleOrganizationalScopeChange: (consumer: V1_OrganizationalScope) => void,
    handleDescriptionChange: (description: string | undefined) => void,
    handleIsValidChange: (isValid: boolean) => void,
  ) => React.ReactNode;
  organizationalScopeTypeName?: (
    consumer: V1_OrganizationalScope,
  ) => string | undefined;
  organizationalScopeTypeDetailsRenderer?: (
    consumer: V1_OrganizationalScope,
  ) => React.ReactNode | undefined;
  enableForEnterpriseAPGs?: boolean;
};

export type DataProductDataAccessStateActions = {
  getContractTaskUrl: (taskId: string) => string;
  getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
  getContractConsumerTypeRendererConfigs: (
    apgState: DataProductAPGState,
  ) => ContractConsumerTypeRendererConfig[];
};

export class DataProductDataAccessState {
  readonly dataProductViewerState: DataProductViewerState;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly engineServerClient: V1_EngineServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[];

  // actions/data callbacks
  readonly getContractTaskUrl: (taskId: string) => string;
  readonly getDataProductUrl: (
    dataProductId: string,
    deploymentId: number,
  ) => string;
  readonly getContractConsumerTypeRendererConfigs: (
    apgState: DataProductAPGState,
  ) => ContractConsumerTypeRendererConfig[];

  // state
  associatedContracts: V1_DataContract[] | undefined = undefined;
  dataContractAccessPointGroup: V1_AccessPointGroup | undefined = undefined;
  dataContract: V1_DataContract | undefined = undefined;
  lakehouseIngestEnvironmentSummaries: IngestDeploymentServerConfig[] = [];
  lakehouseIngestEnvironmentDetails: V1_IngestEnvironment[] = [];

  readonly creatingContractState = ActionState.create();
  readonly ingestEnvironmentFetchState = ActionState.create();

  constructor(
    dataProductViewerState: DataProductViewerState,
    lakehouseContractServerClient: LakehouseContractServerClient,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
    lakehouseIngestServerClient: LakehouseIngestServerClient,
    dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
    actions: DataProductDataAccessStateActions,
  ) {
    makeObservable(this, {
      associatedContracts: observable,
      dataContractAccessPointGroup: observable,
      dataContract: observable,
      creatingContractState: observable,
      lakehouseIngestEnvironmentSummaries: observable,
      lakehouseIngestEnvironmentDetails: observable,
      setDataContract: action,
      setAssociatedContracts: action,
      setDataContractAccessPointGroup: action,
      setLakehouseIngestEnvironmentSummaries: action,
      setLakehouseIngestEnvironmentDetails: action,
      createContract: flow,
      fetchContracts: action,
      fetchIngestEnvironmentDetails: action,
      init: flow,
    });

    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = this.dataProductViewerState.applicationStore;
    this.engineServerClient = this.dataProductViewerState.engineServerClient;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;
    this.lakehouseIngestServerClient = lakehouseIngestServerClient;
    this.graphManagerState = this.dataProductViewerState.graphManagerState;
    this.dataAccessPlugins = dataAccessPlugins;

    // actions
    this.getContractTaskUrl = actions.getContractTaskUrl;
    this.getDataProductUrl = actions.getDataProductUrl;
    this.getContractConsumerTypeRendererConfigs =
      actions.getContractConsumerTypeRendererConfigs;
  }

  get product(): V1_DataProduct {
    return this.dataProductViewerState.product;
  }

  setAssociatedContracts(val: V1_DataContract[] | undefined): void {
    this.associatedContracts = val;
  }

  setDataContractAccessPointGroup(val: V1_AccessPointGroup | undefined) {
    this.dataContractAccessPointGroup = val;
  }

  setDataContract(val: V1_DataContract | undefined) {
    this.dataContract = val;
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: IngestDeploymentServerConfig[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setLakehouseIngestEnvironmentDetails(details: V1_IngestEnvironment[]): void {
    this.lakehouseIngestEnvironmentDetails = details;
  }

  async fetchIngestEnvironmentDetails(
    token: string | undefined,
  ): Promise<void> {
    if (!this.ingestEnvironmentFetchState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store ingest environment details are re-initialized',
      );
      return;
    }

    this.ingestEnvironmentFetchState.inProgress();
    await this.fetchLakehouseIngestEnvironmentSummaries(token);
    await this.fetchLakehouseIngestEnvironmentDetails(token);
    this.ingestEnvironmentFetchState.complete();
  }

  async fetchContracts(token: string | undefined): Promise<void> {
    try {
      this.dataProductViewerState.apgStates.forEach((e) =>
        e.fetchingAccessState.inProgress(),
      );
      const didNode = new V1_AppDirNode();
      didNode.appDirId = this.dataProductViewerState.deploymentId;
      didNode.level = V1_AppDirLevel.DEPLOYMENT;
      const _contracts =
        (await this.lakehouseContractServerClient.getDataContractsFromDID(
          [serialize(V1_AppDirNodeModelSchema, didNode)],
          token,
        )) as PlainObject<V1_DataContractsResponse>;
      const dataProductContracts =
        V1_dataContractsResponseModelSchemaToContracts(
          _contracts,
          this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
        ).filter((_contract) =>
          dataContractContainsDataProduct(
            this.product,
            this.dataProductViewerState.deploymentId,
            _contract,
          ),
        );
      this.setAssociatedContracts(dataProductContracts);
      this.dataProductViewerState.apgStates.forEach((e) => {
        // eslint-disable-next-line no-void
        void e.handleDataProductContracts(
          dataProductContracts,
          this.lakehouseContractServerClient,
          token,
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

  *init(token: string | undefined): GeneratorFn<void> {
    yield Promise.all([
      this.fetchContracts(token),
      this.fetchIngestEnvironmentDetails(token),
    ]);
  }

  *createContract(
    consumer: V1_OrganizationalScope,
    description: string,
    group: V1_AccessPointGroup,
    token: string | undefined,
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
          deploymentId: this.dataProductViewerState.deploymentId,
          accessPointGroup: group.id,
          consumer,
        } satisfies V1_CreateContractPayload,
      ) as PlainObject<V1_CreateContractPayload>;
      const contracts = V1_dataContractsResponseModelSchemaToContracts(
        (yield this.lakehouseContractServerClient.createContract(
          request,
          token,
        )) as unknown as PlainObject<V1_DataContractsResponse>,
        this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
      );
      const associatedContract = contracts[0];
      // Only if the user has requested a contract for themself do we update the associated contract.
      if (
        associatedContract?.consumer instanceof V1_AdhocTeam &&
        associatedContract.consumer.users.some(
          (u) => u.name === this.applicationStore.identityService.currentUser,
        )
      ) {
        const groupAccessState = this.dataProductViewerState.apgStates.find(
          (e) => e.apg === group,
        );
        groupAccessState?.setAssociatedContract(
          associatedContract,
          this.lakehouseContractServerClient,
          token,
        );
      }

      this.setDataContractAccessPointGroup(undefined);
      this.setDataContract(associatedContract);
      this.applicationStore.notificationService.notifySuccess(
        `Contract created, please go to contract view for pending tasks`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.creatingContractState.complete();
    }
  }

  async fetchLakehouseIngestEnvironmentSummaries(
    token: string | undefined,
  ): Promise<void> {
    try {
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironmentSummaries(
          token,
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

  async fetchLakehouseIngestEnvironmentDetails(
    token: string | undefined,
  ): Promise<void> {
    try {
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
              this.applicationStore.logService.warn(
                LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
                `Unable to load lakehouse environment details for ${discoveryEnv.ingestEnvironmentUrn}: ${error.message}`,
              );
              return undefined;
            }
          }),
        )
      ).filter(isNonNullable);
      this.setLakehouseIngestEnvironmentDetails(ingestEnvironments);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(DSL_DATAPRODUCT_EVENT.FETCH_INGEST_ENV_FAILURE),
        `Unable to load lakehouse environment details: ${error.message}`,
      );
    }
  }
}
