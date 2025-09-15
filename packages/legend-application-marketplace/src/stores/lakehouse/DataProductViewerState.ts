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

import { type NavigationZone } from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_AccessPointGroup,
  type V1_CreateContractPayload,
  type V1_DataContract,
  type V1_DataContractsResponse,
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
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
import type { DataProductLayoutState } from './BaseLayoutState.js';
import { DATA_PRODUCT_VIEWER_SECTION } from './ProductViewerNavigation.js';
import { DataProductDataAccessState } from './DataProductDataAccessState.js';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { serialize } from 'serializr';
import { dataContractContainsDataProduct } from './LakehouseUtils.js';
import type { LegendMarketplaceProductViewerStore } from './LegendMarketplaceProductViewerStore.js';
import { BaseViewerState } from './BaseViewerState.js';

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly productViewerStore: LegendMarketplaceProductViewerStore;
  readonly graphManagerState: GraphManagerState;
  readonly entitlementsDataProductDetails: V1_EntitlementsDataProductDetails;
  readonly viewDataProductSource: () => void;

  // we may want to move this out eventually
  accessState!: DataProductDataAccessState;
  associatedContracts: V1_DataContract[] | undefined = undefined;
  dataContractAccessPointGroup: V1_AccessPointGroup | undefined = undefined;
  dataContract: V1_DataContract | undefined = undefined;
  creatingContractState = ActionState.create();

  constructor(
    productViewerStore: LegendMarketplaceProductViewerStore,
    dataProductLayoutState: DataProductLayoutState,
    graphManagerState: GraphManagerState,
    product: V1_DataProduct,
    entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
    actions: {
      viewDataProductSource: () => void;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    super(
      product,
      productViewerStore.marketplaceBaseStore.applicationStore,
      dataProductLayoutState,
      actions,
    );

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

    this.productViewerStore = productViewerStore;
    this.graphManagerState = graphManagerState;
    this.entitlementsDataProductDetails = entitlementsDataProductDetails;
    this.viewDataProductSource = actions.viewDataProductSource;
    this.accessState = new DataProductDataAccessState(this);
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
    try {
      this.accessState.accessGroupStates.forEach((e) =>
        e.fetchingAccessState.inProgress(),
      );
      const didNode = new V1_AppDirNode();
      didNode.appDirId = this.deploymentId;
      didNode.level = V1_AppDirLevel.DEPLOYMENT;
      const _contracts =
        (yield this.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.getDataContractsFromDID(
          [serialize(V1_AppDirNodeModelSchema, didNode)],
          token,
        )) as PlainObject<V1_DataContractsResponse>;
      const dataProductContracts =
        V1_dataContractsResponseModelSchemaToContracts(
          _contracts,
          this.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
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
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
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
    try {
      this.creatingContractState.inProgress();
      const request = serialize(
        V1_createContractPayloadModelSchema(
          this.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
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
        (yield this.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.createContract(
          request,
          token,
        )) as unknown as PlainObject<V1_DataContractsResponse>,
        this.productViewerStore.marketplaceBaseStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
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
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
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
