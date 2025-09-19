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

import type {
  DataProductConfig,
  GenericLegendApplicationStore,
  NavigationZone,
} from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_AccessPointGroup,
  type V1_CreateContractPayload,
  type V1_DataContract,
  type V1_DataContractsResponse,
  type V1_DataProduct,
  type V1_EngineServerClient,
  type V1_EntitlementsDataProductDetails,
  type V1_IngestEnvironment,
  type V1_OrganizationalScope,
  V1_AdhocTeam,
  V1_AppDirLevel,
  V1_AppDirNode,
  V1_AppDirNodeModelSchema,
  V1_createContractPayloadModelSchema,
  V1_dataContractsResponseModelSchemaToContracts,
  V1_ResourceType,
} from '@finos/legend-graph';
import { action, flow, observable, makeObservable } from 'mobx';
import {
  type DataProductGroupAccessState,
  DataProductDataAccessState,
} from './DataProductDataAccessState.js';
import {
  type UserSearchService,
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { serialize } from 'serializr';
import { BaseViewerState } from '../BaseViewerState.js';
import { DataProductLayoutState } from '../BaseLayoutState.js';
import { DATA_PRODUCT_VIEWER_SECTION } from '../ProductViewerNavigation.js';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { dataContractContainsDataProduct } from '../../utils/DataContractUtils.js';

export type ContractConsumerTypeRendererConfig = {
  type: string;
  createContractRenderer: (
    applicationStore: GenericLegendApplicationStore,
    userSearchService: UserSearchService | undefined,
    accessGroupState: DataProductGroupAccessState,
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

export type DataProductViewerStateOptions = {
  userSearchService?: UserSearchService | undefined;
  dataProductConfig?: DataProductConfig | undefined;
  userProfileImageUrl?: string | undefined;
  applicationDirectoryUrl?: string | undefined;
  lakehouseIngestEnvironmentDetails?: V1_IngestEnvironment[];
};

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly engineServerClient: V1_EngineServerClient;
  readonly lakehouseContractServerClient:
    | LakehouseContractServerClient
    | undefined;
  readonly graphManagerState: GraphManagerState;
  readonly entitlementsDataProductDetails: V1_EntitlementsDataProductDetails;

  // actions
  readonly viewDataProductSource: () => void;
  readonly getContractTaskUrl: (taskId: string) => string;
  readonly getDataProductUrl: (
    dataProductId: string,
    deploymentId: number,
  ) => string;
  readonly getContractConsumerTypeRendererConfigs: (
    accessGroupState: DataProductGroupAccessState,
  ) => ContractConsumerTypeRendererConfig[];

  // optional configuration
  readonly userSearchService: UserSearchService | undefined;
  readonly dataProductConfig?: DataProductConfig | undefined;
  readonly userProfileImageUrl?: string | undefined;
  readonly applicationDirectoryUrl?: string | undefined;
  readonly lakehouseIngestEnvironmentDetails: V1_IngestEnvironment[];

  // we may want to move this out eventually
  accessState!: DataProductDataAccessState;
  associatedContracts: V1_DataContract[] | undefined = undefined;
  dataContractAccessPointGroup: V1_AccessPointGroup | undefined = undefined;
  dataContract: V1_DataContract | undefined = undefined;
  creatingContractState = ActionState.create();

  constructor(
    applicationStore: GenericLegendApplicationStore,
    engineServerClient: V1_EngineServerClient,
    graphManagerState: GraphManagerState,
    product: V1_DataProduct,
    entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
    lakehouseContractServerClient: LakehouseContractServerClient | undefined,
    options: DataProductViewerStateOptions,
    actions: {
      viewDataProductSource: () => void;
      getContractTaskUrl: (taskId: string) => string;
      getDataProductUrl: (
        dataProductId: string,
        deploymentId: number,
      ) => string;
      getContractConsumerTypeRendererConfigs: (
        accessGroupState: DataProductGroupAccessState,
      ) => ContractConsumerTypeRendererConfig[];
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    super(product, applicationStore, new DataProductLayoutState(), actions);

    makeObservable(this, {
      accessState: observable,
      fetchContracts: flow,
      associatedContracts: observable,
      dataContractAccessPointGroup: observable,
      setDataContractAccessPointGroup: action,
      dataContract: observable,
      creatingContractState: observable,
      setDataContract: action,
      setAssociatedContracts: action,
      createContract: flow,
    });

    this.engineServerClient = engineServerClient;
    this.graphManagerState = graphManagerState;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.entitlementsDataProductDetails = entitlementsDataProductDetails;
    this.accessState = new DataProductDataAccessState(this);

    // actions
    this.viewDataProductSource = actions.viewDataProductSource;
    this.getContractTaskUrl = actions.getContractTaskUrl;
    this.getDataProductUrl = actions.getDataProductUrl;
    this.getContractConsumerTypeRendererConfigs =
      actions.getContractConsumerTypeRendererConfigs;

    // optional configuration
    this.userSearchService = options.userSearchService;
    this.dataProductConfig = options.dataProductConfig;
    this.userProfileImageUrl = options.userProfileImageUrl;
    this.applicationDirectoryUrl = options.applicationDirectoryUrl;
    this.lakehouseIngestEnvironmentDetails =
      options.lakehouseIngestEnvironmentDetails ?? [];
  }

  public override getTitle(): string | undefined {
    return this.product.title;
  }

  public override getPath(): string | undefined {
    return this.product.path;
  }

  public override getName(): string | undefined {
    return this.product.name;
  }

  protected getValidSections(): string[] {
    return Object.values(DATA_PRODUCT_VIEWER_SECTION).map((section) =>
      section.toString(),
    );
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

  *fetchContracts(token: string | undefined): GeneratorFn<void> {
    if (!this.lakehouseContractServerClient) {
      this.applicationStore.notificationService.notifyWarning(
        'Cannot fetch contracts. Lakehouse contract server client is not configured',
      );
      return;
    }

    try {
      this.accessState.accessGroupStates.forEach((e) =>
        e.fetchingAccessState.inProgress(),
      );
      const didNode = new V1_AppDirNode();
      didNode.appDirId = this.deploymentId;
      didNode.level = V1_AppDirLevel.DEPLOYMENT;
      const _contracts =
        (yield this.lakehouseContractServerClient.getDataContractsFromDID(
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
            this.deploymentId,
            _contract,
          ),
        );
      this.setAssociatedContracts(dataProductContracts);
      this.accessState.accessGroupStates.forEach((e) => {
        // eslint-disable-next-line no-void
        void e.handleDataProductContracts(dataProductContracts, token);
      });
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.dataProductViewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.accessState.accessGroupStates.forEach((e) =>
        e.fetchingAccessState.complete(),
      );
    }
  }

  *createContract(
    consumer: V1_OrganizationalScope,
    description: string,
    group: V1_AccessPointGroup,
    token: string | undefined,
  ): GeneratorFn<void> {
    if (!this.lakehouseContractServerClient) {
      this.applicationStore.notificationService.notifyWarning(
        'Cannot create contract. Lakehouse contract server client is not configured',
      );
      return;
    }

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
          deploymentId: this.deploymentId,
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
        const groupAccessState = this.accessState.accessGroupStates.find(
          (e) => e.group === group,
        );
        groupAccessState?.setAssociatedContract(associatedContract, token);
      }

      this.setDataContractAccessPointGroup(undefined);
      this.setDataContract(associatedContract);
      this.applicationStore.notificationService.notifySuccess(
        `Contract created, please go to contract view for pending tasks`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.dataProductViewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.creatingContractState.complete();
    }
  }

  get deploymentId(): number {
    return this.entitlementsDataProductDetails.deploymentId;
  }
}
