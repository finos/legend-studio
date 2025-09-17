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
  type V1_AccessPointGroup,
  type V1_ContractUserStatusResponse,
  type V1_DataProduct,
  type V1_DataSubscription,
  type V1_DataSubscriptionResponse,
  type V1_DataSubscriptionTarget,
  type V1_User,
  V1_ContractUserStatusResponseModelSchema,
  V1_CreateSubscriptionInput,
  V1_CreateSubscriptionInputModelSchema,
  V1_DataContract,
  V1_DataContractApprovedUsersResponseModelSchema,
  V1_dataContractsResponseModelSchemaToContracts,
  V1_dataSubscriptionModelSchema,
  V1_DataSubscriptionResponseModelSchema,
  V1_EnrichedUserApprovalStatus,
} from '@finos/legend-graph';
import type { DataProductViewerState } from './DataProductViewerState.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  uuid,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import { deserialize, serialize } from 'serializr';
import {
  contractContainsSystemAccount,
  dataContractContainsAccessGroup,
  isMemberOfContract,
} from '../../utils/DataContractUtils.js';

export enum AccessPointGroupAccess {
  // can be used to indicate fetching or resyncing of group access
  UNKNOWN = 'UNKNOWN',

  PENDING_MANAGER_APPROVAL = 'PENDING_MANAGER_APPROVAL',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  NO_ACCESS = 'NO_ACCESS',
  ENTERPRISE = 'ENTERPRISE', // Used to indicate that the group is available for all users in the organization
}

export class DataProductGroupAccessState {
  readonly accessState: DataProductDataAccessState;
  readonly group: V1_AccessPointGroup;
  id = uuid();
  subscriptions: V1_DataSubscription[] = [];

  fetchingAccessState = ActionState.create();
  handlingContractsState = ActionState.create();
  fetchingUserAccessState = ActionState.create();
  fetchingApprovedContractsState = ActionState.create();
  fetchingSubscriptionsState = ActionState.create();
  creatingSubscriptionState = ActionState.create();

  // ASSUMPTION: one contract per user per group;
  // false here mentions contracts have not been fetched
  associatedContract: V1_DataContract | undefined | false = false;
  userAccessStatus: V1_EnrichedUserApprovalStatus | undefined = undefined;

  associatedSystemAccountContractsAndApprovedUsers: {
    contract: V1_DataContract;
    approvedUsers: V1_User[];
  }[] = [];

  constructor(
    group: V1_AccessPointGroup,
    accessState: DataProductDataAccessState,
  ) {
    this.group = group;
    this.accessState = accessState;
    makeAutoObservable(this, {
      handleContractClick: action,
      handleDataProductContracts: action,
      associatedContract: observable,
      userAccessStatus: observable,
      associatedSystemAccountContractsAndApprovedUsers: observable,
      setAssociatedContract: action,
      fetchAndSetAssociatedSystemAccountContracts: flow,
      subscriptions: observable,
      fetchingSubscriptionsState: observable,
      creatingSubscriptionState: observable,
      createSubscription: flow,
      setSubscriptions: action,
      fetchUserAccessStatus: flow,
      setUserAccessStatus: action,
      canCreateSubscription: computed,
    });
  }

  get access(): AccessPointGroupAccess {
    const publicStereotype =
      this.accessState.viewerState.applicationStore.config.options
        .dataProductConfig?.publicStereotype;
    if (
      publicStereotype &&
      this.group.stereotypes.filter(
        (stereotype) =>
          stereotype.profile === publicStereotype.profile &&
          stereotype.value === publicStereotype.stereotype,
      ).length > 0
    ) {
      return AccessPointGroupAccess.ENTERPRISE;
    }
    if (this.associatedContract === false) {
      return AccessPointGroupAccess.UNKNOWN;
    } else if (
      this.userAccessStatus ===
      V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL
    ) {
      return AccessPointGroupAccess.PENDING_MANAGER_APPROVAL;
    } else if (
      this.userAccessStatus ===
      V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL
    ) {
      return AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL;
    } else if (
      this.userAccessStatus === V1_EnrichedUserApprovalStatus.APPROVED
    ) {
      return AccessPointGroupAccess.APPROVED;
    } else {
      return AccessPointGroupAccess.NO_ACCESS;
    }
  }

  get canCreateSubscription(): boolean {
    return (
      (this.associatedContract instanceof V1_DataContract &&
        this.userAccessStatus === V1_EnrichedUserApprovalStatus.APPROVED) ||
      this.associatedSystemAccountContractsAndApprovedUsers.some(
        (contract) => contract.approvedUsers.length > 0,
      )
    );
  }

  setAssociatedContract(
    val: V1_DataContract | undefined,
    token: string | undefined,
  ): void {
    this.associatedContract = val;

    if (this.associatedContract) {
      this.fetchUserAccessStatus(this.associatedContract.guid, token);
    }
  }

  *fetchAndSetAssociatedSystemAccountContracts(
    systemAccountContracts: V1_DataContract[],
    token: string | undefined,
  ): GeneratorFn<void> {
    this.fetchingApprovedContractsState.inProgress();
    try {
      this.associatedSystemAccountContractsAndApprovedUsers =
        (yield Promise.all(
          systemAccountContracts.map(async (contract) => {
            const rawApprovedUsers =
              await this.accessState.viewerState.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.getApprovedUsersForDataContract(
                contract.guid,
                token,
              );
            const approvedUsers =
              deserialize(
                V1_DataContractApprovedUsersResponseModelSchema,
                rawApprovedUsers,
              ).approvedUsers ?? [];
            return {
              contract,
              approvedUsers,
            };
          }),
        )) as { contract: V1_DataContract; approvedUsers: V1_User[] }[];
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `Error fetching approved users for contract: ${error.message}`,
      );
    } finally {
      this.fetchingApprovedContractsState.complete();
    }
  }

  setUserAccessStatus(val: V1_EnrichedUserApprovalStatus | undefined): void {
    this.userAccessStatus = val;
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }

  async handleDataProductContracts(
    contracts: V1_DataContract[],
    token: string | undefined,
  ): Promise<void> {
    try {
      this.handlingContractsState.inProgress();

      const accessPointGroupContracts = contracts.filter((_contract) =>
        dataContractContainsAccessGroup(this.group, _contract),
      );
      const rawAccessPointGroupContractsWithMembers = await Promise.all(
        accessPointGroupContracts.map((_contract) =>
          this.accessState.viewerState.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.getDataContract(
            _contract.guid,
            true,
            token,
          ),
        ),
      );
      const accessPointGroupContractsWithMembers =
        rawAccessPointGroupContractsWithMembers.flatMap((_response) =>
          V1_dataContractsResponseModelSchemaToContracts(
            _response,
            this.accessState.viewerState.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
        );
      const userContracts = (
        await Promise.all(
          accessPointGroupContractsWithMembers.map(async (_contract) => {
            const isMember = await isMemberOfContract(
              this.accessState.viewerState.applicationStore.identityService
                .currentUser,
              _contract,
              this.accessState.viewerState.productViewerStore
                .marketplaceBaseStore.lakehouseContractServerClient,
              token,
            );
            return isMember ? _contract : undefined;
          }),
        )
      ).filter(isNonNullable);
      const systemAccountContracts = accessPointGroupContracts.filter(
        contractContainsSystemAccount,
      );
      // ASSUMPTION: one contract per user per group
      const userContract = userContracts[0];
      this.setAssociatedContract(userContract, token);
      this.fetchAndSetAssociatedSystemAccountContracts(
        systemAccountContracts,
        token,
      );
    } finally {
      this.handlingContractsState.complete();
    }
  }

  handleContractClick(): void {
    switch (this.access) {
      case AccessPointGroupAccess.NO_ACCESS:
      case AccessPointGroupAccess.DENIED:
        this.accessState.viewerState.setDataContractAccessPointGroup(
          this.group,
        );
        break;
      case AccessPointGroupAccess.PENDING_MANAGER_APPROVAL:
      case AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL:
      case AccessPointGroupAccess.APPROVED:
        if (this.associatedContract) {
          this.accessState.viewerState.setDataContract(this.associatedContract);
        }
        break;
      default:
        break;
    }
  }

  *fetchUserAccessStatus(
    contractId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingUserAccessState.inProgress();
      const rawUserStatus =
        (yield this.accessState.viewerState.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.getContractUserStatus(
          contractId,
          this.accessState.viewerState.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_ContractUserStatusResponse>;
      const userStatus = deserialize(
        V1_ContractUserStatusResponseModelSchema,
        rawUserStatus,
      ).status;
      this.setUserAccessStatus(userStatus);
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `Error fetching user access status: ${error.message}`,
      );
    } finally {
      this.fetchingUserAccessState.complete();
    }
  }

  *fetchSubscriptions(
    contractId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingSubscriptionsState.inProgress();
      const rawSubscriptions =
        (yield this.accessState.viewerState.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.getSubscriptionsForContract(
          contractId,
          token,
        )) as V1_DataSubscriptionResponse;
      const subscriptions = rawSubscriptions.subscriptions?.map(
        (rawSubscription) =>
          deserialize(V1_dataSubscriptionModelSchema, rawSubscription),
      );
      this.setSubscriptions(subscriptions ?? []);
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.fetchingSubscriptionsState.complete();
    }
  }

  *createSubscription(
    contractId: string,
    target: V1_DataSubscriptionTarget,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.creatingSubscriptionState.inProgress();
      const input = new V1_CreateSubscriptionInput();
      input.contractId = contractId;
      input.target = target;
      const response =
        (yield this.accessState.viewerState.productViewerStore.marketplaceBaseStore.lakehouseContractServerClient.createSubscription(
          serialize(V1_CreateSubscriptionInputModelSchema, input),
          token,
        )) as PlainObject<V1_DataSubscriptionResponse>;
      guaranteeNonNullable(
        deserialize(V1_DataSubscriptionResponseModelSchema, response)
          .subscriptions?.[0],
        'No subsription returned from server',
      );
      this.accessState.viewerState.applicationStore.notificationService.notifySuccess(
        `Subscription created`,
      );
      this.fetchSubscriptions(contractId, token);
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.creatingSubscriptionState.complete();
    }
  }
}

export class DataProductDataAccessState {
  readonly viewerState: DataProductViewerState;
  accessGroupStates: DataProductGroupAccessState[];
  fetchingDataProductAccessState = ActionState.create();

  constructor(viewerState: DataProductViewerState) {
    makeObservable(this, {
      accessGroupStates: observable,
      fetchingDataProductAccessState: observable,
    });

    this.viewerState = viewerState;
    this.accessGroupStates = this.product.accessPointGroups.map(
      (e) => new DataProductGroupAccessState(e, this),
    );
  }

  get product(): V1_DataProduct {
    return this.viewerState.product;
  }
}
