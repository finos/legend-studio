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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type V1_AccessPointGroup,
  type V1_ContractUserStatusResponse,
  type V1_DataProductArtifact,
  type V1_DataSubscription,
  type V1_DataSubscriptionResponse,
  type V1_DataSubscriptionTarget,
  type V1_EntitlementsDataProductDetails,
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
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  uuid,
} from '@finos/legend-shared';
import { makeAutoObservable, action, observable, flow, computed } from 'mobx';
import { deserialize, serialize } from 'serializr';
import {
  dataContractContainsAccessGroup,
  isMemberOfContract,
  contractContainsSystemAccount,
} from '../../utils/DataContractUtils.js';
import type { DataProductDataAccessState } from './DataProductDataAccessState.js';
import type { DataProductViewerState } from './DataProductViewerState.js';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  DSL_DATAPRODUCT_EVENT,
  DSL_DATAPRODUCT_EVENT_STATUS,
} from '../../__lib__/DSL_DataProduct_Event.js';
import { DataProductAccessPointState } from './DataProductAccessPointState.js';

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

export class DataProductAPGState {
  readonly dataProductViewerState: DataProductViewerState;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly apg: V1_AccessPointGroup;
  readonly accessPointStates: DataProductAccessPointState[];
  readonly id = uuid();

  subscriptions: V1_DataSubscription[] = [];

  // ASSUMPTION: one contract per user per group;
  // false here mentions contracts have not been fetched
  associatedContract: V1_DataContract | undefined | false = false;
  userAccessStatus: V1_EnrichedUserApprovalStatus | undefined = undefined;

  associatedSystemAccountContractsAndApprovedUsers: {
    contract: V1_DataContract;
    approvedUsers: V1_User[];
  }[] = [];

  fetchingAccessState = ActionState.create();
  handlingContractsState = ActionState.create();
  fetchingUserAccessState = ActionState.create();
  fetchingApprovedContractsState = ActionState.create();
  fetchingSubscriptionsState = ActionState.create();
  creatingSubscriptionState = ActionState.create();

  constructor(
    group: V1_AccessPointGroup,
    dataProductViewerState: DataProductViewerState,
  ) {
    makeAutoObservable(this, {
      handleContractClick: action,
      handleDataProductContracts: action,
      associatedContract: observable,
      userAccessStatus: observable,
      associatedSystemAccountContractsAndApprovedUsers: observable,
      setAssociatedContract: action,
      init: flow,
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

    this.apg = group;
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = dataProductViewerState.applicationStore;
    this.accessPointStates = this.apg.accessPoints.map(
      (ap) => new DataProductAccessPointState(this, ap),
    );
  }

  get access(): AccessPointGroupAccess {
    const publicStereotype =
      this.dataProductViewerState.dataProductConfig?.publicStereotype;
    if (
      publicStereotype &&
      this.apg.stereotypes.filter(
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
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): void {
    this.associatedContract = val;

    if (this.associatedContract) {
      this.fetchUserAccessStatus(
        this.associatedContract.guid,
        lakehouseContractServerClient,
        token,
      );
    }
  }

  *init(
    artifactGenerationPromise: Promise<V1_DataProductArtifact | undefined>,
    entitlementsDataProductDetails?: V1_EntitlementsDataProductDetails,
  ): GeneratorFn<void> {
    yield Promise.all(
      this.accessPointStates.map((ap) =>
        ap.init(artifactGenerationPromise, entitlementsDataProductDetails),
      ),
    );
  }

  *fetchAndSetAssociatedSystemAccountContracts(
    systemAccountContracts: V1_DataContract[],
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): GeneratorFn<void> {
    this.fetchingApprovedContractsState.inProgress();
    try {
      this.associatedSystemAccountContractsAndApprovedUsers =
        (yield Promise.all(
          systemAccountContracts.map(async (contract) => {
            const rawApprovedUsers =
              await lakehouseContractServerClient.getApprovedUsersForDataContract(
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
      this.applicationStore.notificationService.notifyError(
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
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): Promise<void> {
    try {
      this.handlingContractsState.inProgress();

      const accessPointGroupContracts = contracts.filter((_contract) =>
        dataContractContainsAccessGroup(this.apg, _contract),
      );
      const rawAccessPointGroupContractsWithMembers = await Promise.all(
        accessPointGroupContracts.map((_contract) =>
          lakehouseContractServerClient.getDataContract(
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
            this.dataProductViewerState.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
          ),
        );
      const userContracts = (
        await Promise.all(
          accessPointGroupContractsWithMembers.map(async (_contract) => {
            const isMember = await isMemberOfContract(
              this.applicationStore.identityService.currentUser,
              _contract,
              lakehouseContractServerClient,
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
      this.setAssociatedContract(
        userContract,
        lakehouseContractServerClient,
        token,
      );
      this.fetchAndSetAssociatedSystemAccountContracts(
        systemAccountContracts,
        lakehouseContractServerClient,
        token,
      );
    } finally {
      this.handlingContractsState.complete();
    }
  }

  handleContractClick(dataAccessState: DataProductDataAccessState): void {
    switch (this.access) {
      case AccessPointGroupAccess.NO_ACCESS:
      case AccessPointGroupAccess.DENIED:
        dataAccessState.setDataContractAccessPointGroup(this.apg);
        break;
      case AccessPointGroupAccess.PENDING_MANAGER_APPROVAL:
      case AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL:
      case AccessPointGroupAccess.APPROVED:
        if (this.associatedContract) {
          dataAccessState.setDataContract(this.associatedContract);
        }
        break;
      default:
        break;
    }
  }

  *fetchUserAccessStatus(
    contractId: string,
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingUserAccessState.inProgress();
      const rawUserStatus =
        (yield lakehouseContractServerClient.getContractUserStatus(
          contractId,
          this.applicationStore.identityService.currentUser,
          token,
        )) as PlainObject<V1_ContractUserStatusResponse>;
      const userStatus = deserialize(
        V1_ContractUserStatusResponseModelSchema,
        rawUserStatus,
      ).status;
      this.setUserAccessStatus(userStatus);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Error fetching user access status: ${error.message}`,
      );
    } finally {
      this.fetchingUserAccessState.complete();
    }
  }

  *fetchSubscriptions(
    contractId: string,
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingSubscriptionsState.inProgress();
      const rawSubscriptions =
        (yield lakehouseContractServerClient.getSubscriptionsForContract(
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
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.fetchingSubscriptionsState.complete();
    }
  }

  logCreatingSubscription(
    request: PlainObject<V1_DataSubscriptionResponse>,
    error: string | undefined,
  ): void {
    const data =
      error === undefined
        ? { ...request, status: DSL_DATAPRODUCT_EVENT_STATUS.SUCCESS }
        : {
            ...request,
            status: DSL_DATAPRODUCT_EVENT_STATUS.FAILURE,
            error: error,
          };
    this.applicationStore.telemetryService.logEvent(
      DSL_DATAPRODUCT_EVENT.CREATE_SUBSCRIPTION,
      data,
    );
  }

  *createSubscription(
    contractId: string,
    target: V1_DataSubscriptionTarget,
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.creatingSubscriptionState.inProgress();
      const input = new V1_CreateSubscriptionInput();
      input.contractId = contractId;
      input.target = target;
      const request = serialize(
        V1_CreateSubscriptionInputModelSchema,
        input,
      ) as PlainObject<V1_CreateSubscriptionInput>;
      try {
        const response =
          (yield lakehouseContractServerClient.createSubscription(
            request,
            token,
          )) as PlainObject<V1_DataSubscriptionResponse>;
        guaranteeNonNullable(
          deserialize(V1_DataSubscriptionResponseModelSchema, response)
            .subscriptions?.[0],
          'No subsription returned from server',
        );
        this.applicationStore.notificationService.notifySuccess(
          `Subscription created`,
        );
        this.fetchSubscriptions(
          contractId,
          lakehouseContractServerClient,
          token,
        );
        this.logCreatingSubscription(request, undefined);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(
          `${error.message}`,
        );
        this.logCreatingSubscription(request, error.message);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(`${error.message}`);
    } finally {
      this.creatingSubscriptionState.complete();
    }
  }
}
