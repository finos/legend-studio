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
  type V1_LiteDataContract,
  type V1_User,
  V1_ContractUserStatusResponseModelSchema,
  V1_CreateSubscriptionInput,
  V1_CreateSubscriptionInputModelSchema,
  V1_DataContract,
  V1_DataContractApprovedUsersResponseModelSchema,
  V1_dataSubscriptionModelSchema,
  V1_DataSubscriptionResponseModelSchema,
  V1_deserializeDataContractResponse,
  V1_EnrichedUserApprovalStatus,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  NetworkClientError,
  HttpStatus,
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
import {
  type LakehouseContractServerClient,
  LakehouseConsumerGrantResponse,
} from '@finos/legend-server-lakehouse';
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

export enum V1_UserApprovalPriority {
  NO_PRIORITY = 0,
  PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL_PRIORITY = 2,
  PENDING_DATA_OWNER_APPROVAL_PRIORITY = 3,
  APPROVED_PRIORITY = 4,
}

export class DataProductAPGState {
  readonly dataProductViewerState: DataProductViewerState;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly apg: V1_AccessPointGroup;
  readonly accessPointStates: DataProductAccessPointState[];
  readonly id = uuid();

  isCollapsed: boolean;

  subscriptions: V1_DataSubscription[] = [];

  apgContracts: V1_LiteDataContract[] = [];
  // ASSUMPTION: one contract per user per group;
  // false here mentions contracts have not been fetched
  associatedUserContract: V1_DataContract | undefined | false = false;
  userAccessStatus: V1_EnrichedUserApprovalStatus | undefined = undefined;
  consumerGrant: LakehouseConsumerGrantResponse | undefined = undefined;
  consumerGrantNotFound = false;
  private consumerGrantPollingTimer: ReturnType<typeof setTimeout> | undefined =
    undefined;

  associatedSystemAccountContractsAndApprovedUsers: {
    contract: V1_DataContract;
    approvedUsers: V1_User[];
  }[] = [];

  readonly fetchingAccessState = ActionState.create();
  readonly pollingConsumerGrantState = ActionState.create();
  readonly handlingContractsState = ActionState.create();
  readonly fetchingUserAccessState = ActionState.create();
  readonly fetchingApprovedContractsState = ActionState.create();
  readonly fetchingSubscriptionsState = ActionState.create();
  readonly creatingSubscriptionState = ActionState.create();

  constructor(
    group: V1_AccessPointGroup,
    dataProductViewerState: DataProductViewerState,
  ) {
    makeAutoObservable(this, {
      handleContractClick: action,
      handleDataProductContracts: action,
      apgContracts: observable,
      associatedUserContract: observable,
      userAccessStatus: observable,
      associatedSystemAccountContractsAndApprovedUsers: observable,
      setApgContracts: action,
      setAssociatedUserContract: action,
      init: flow,
      fetchAndSetAssociatedSystemAccountContracts: flow,
      subscriptions: observable,
      isCollapsed: observable,
      setIsCollapsed: action,
      fetchingSubscriptionsState: observable,
      creatingSubscriptionState: observable,
      createSubscription: flow,
      setSubscriptions: action,
      fetchUserAccessStatus: flow,
      setUserAccessStatus: action,
      canCreateSubscription: computed,
      consumerGrant: observable,
      consumerGrantNotFound: observable,
      setConsumerGrant: action,
      setConsumerGrantNotFound: action,
      pollConsumerGrant: flow,
      isEntitlementsSyncing: computed,
    });

    this.apg = group;
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = dataProductViewerState.applicationStore;
    this.accessPointStates = this.apg.accessPoints.map(
      (ap) => new DataProductAccessPointState(this, ap),
    );
    this.isCollapsed = false;
  }

  setIsCollapsed(isCollapsed: boolean): void {
    this.isCollapsed = isCollapsed;
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
    if (this.associatedUserContract === false) {
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
      (this.associatedUserContract instanceof V1_DataContract &&
        this.userAccessStatus === V1_EnrichedUserApprovalStatus.APPROVED) ||
      this.associatedSystemAccountContractsAndApprovedUsers.some(
        (contract) => contract.approvedUsers.length > 0,
      )
    );
  }

  setApgContracts(val: V1_LiteDataContract[]): void {
    this.apgContracts = val;
  }

  setAssociatedUserContract(
    val: V1_DataContract | undefined,
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
  ): void {
    this.associatedUserContract = val;

    if (this.associatedUserContract) {
      this.fetchUserAccessStatus(
        this.associatedUserContract.guid,
        lakehouseContractServerClient,
        tokenProvider,
      );
    }
  }

  *init(
    dataProductArtifactPromise: Promise<V1_DataProductArtifact | undefined>,
    entitlementsDataProductDetails?: V1_EntitlementsDataProductDetails,
  ): GeneratorFn<void> {
    yield Promise.all(
      this.accessPointStates.map((ap) =>
        ap.init(dataProductArtifactPromise, entitlementsDataProductDetails),
      ),
    );
  }

  *fetchAndSetAssociatedSystemAccountContracts(
    systemAccountContracts: V1_LiteDataContract[],
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

  setConsumerGrant(val: LakehouseConsumerGrantResponse | undefined): void {
    this.consumerGrant = val;
  }

  setConsumerGrantNotFound(val: boolean): void {
    this.consumerGrantNotFound = val;
  }

  get isEntitlementsSyncing(): boolean {
    if (this.userAccessStatus !== V1_EnrichedUserApprovalStatus.APPROVED) {
      return false;
    }
    if (this.consumerGrantNotFound) {
      return false;
    }
    if (!this.consumerGrant) {
      return true;
    }
    const currentUser =
      this.applicationStore.identityService.currentUser.toLowerCase();
    return !(
      this.consumerGrant.users?.some(
        (user) => user.username.toLowerCase() === currentUser,
      ) ?? false
    );
  }

  stopPollingConsumerGrant(): void {
    if (this.consumerGrantPollingTimer) {
      clearTimeout(this.consumerGrantPollingTimer);
      this.consumerGrantPollingTimer = undefined;
    }
  }

  *pollConsumerGrant(
    contractId: string,
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
  ): GeneratorFn<void> {
    this.stopPollingConsumerGrant();
    this.pollingConsumerGrantState.inProgress();
    const poll = async (): Promise<void> => {
      try {
        const rawResponse =
          await lakehouseContractServerClient.getConsumerGrantsByContractId(
            contractId,
            tokenProvider(),
          );
        const response =
          LakehouseConsumerGrantResponse.serialization.fromJson(rawResponse);
        this.setConsumerGrant(response);
        const currentUser =
          this.applicationStore.identityService.currentUser.toLowerCase();
        const userFound =
          response.users?.some(
            (user) => user.username.toLowerCase() === currentUser,
          ) ?? false;
        if (!userFound) {
          this.consumerGrantPollingTimer = setTimeout(() => {
            poll().catch(() => {});
          }, 5000);
        } else {
          this.pollingConsumerGrantState.complete();
        }
      } catch (error) {
        assertErrorThrown(error);
        if (
          error instanceof NetworkClientError &&
          error.response.status === HttpStatus.NOT_FOUND
        ) {
          this.setConsumerGrantNotFound(true);
        } else {
          this.applicationStore.notificationService.notifyError(
            `Error fetching consumer grants: ${error.message}`,
          );
        }
        this.pollingConsumerGrantState.complete();
      }
    };
    yield poll();
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }

  async handleDataProductContracts(
    contracts: V1_LiteDataContract[],
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
  ): Promise<void> {
    try {
      this.handlingContractsState.inProgress();

      const accessPointGroupContracts = contracts.filter((_contract) =>
        dataContractContainsAccessGroup(this.apg, _contract),
      );

      this.setApgContracts(accessPointGroupContracts);

      const rawAccessPointGroupContractsWithMembers = await Promise.all(
        accessPointGroupContracts.map((_contract) =>
          lakehouseContractServerClient.getDataContract(
            _contract.guid,
            true,
            tokenProvider(),
          ),
        ),
      );

      const accessPointGroupContractsWithMembers =
        rawAccessPointGroupContractsWithMembers.flatMap((_response) =>
          V1_deserializeDataContractResponse(
            _response,
            this.dataProductViewerState.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
          ).map(
            (_contractAndSubscription) => _contractAndSubscription.dataContract,
          ),
        );
      const userContracts = (
        await Promise.all(
          accessPointGroupContractsWithMembers.map(async (_contract) => {
            const isMember = await isMemberOfContract(
              this.applicationStore.identityService.currentUser,
              _contract,
              lakehouseContractServerClient,
              tokenProvider(),
            );
            return isMember ? _contract : undefined;
          }),
        )
      ).filter(isNonNullable);
      const systemAccountContracts = accessPointGroupContracts.filter(
        contractContainsSystemAccount,
      );
      const userContract = await this.getContractLatestInApprovalProcess(
        userContracts,
        lakehouseContractServerClient,
        tokenProvider(),
      );
      this.setAssociatedUserContract(
        userContract,
        lakehouseContractServerClient,
        tokenProvider,
      );
      this.fetchAndSetAssociatedSystemAccountContracts(
        systemAccountContracts,
        lakehouseContractServerClient,
        tokenProvider(),
      );
    } finally {
      this.handlingContractsState.complete();
    }
  }

  async getContractLatestInApprovalProcess(
    contracts: V1_DataContract[],
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): Promise<V1_DataContract | undefined> {
    if (contracts.length === 0) {
      return undefined;
    }

    const approvalStagePriority: Record<V1_EnrichedUserApprovalStatus, number> =
      {
        [V1_EnrichedUserApprovalStatus.REVOKED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.CLOSED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.DENIED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL]:
          V1_UserApprovalPriority.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL_PRIORITY,
        [V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL]:
          V1_UserApprovalPriority.PENDING_DATA_OWNER_APPROVAL_PRIORITY,
        [V1_EnrichedUserApprovalStatus.APPROVED]:
          V1_UserApprovalPriority.APPROVED_PRIORITY,
      };

    const contractStatuses = (
      await Promise.all(
        contracts.map(async (contract) => {
          try {
            const rawUserStatus =
              await lakehouseContractServerClient.getContractUserStatus(
                contract.guid,
                this.applicationStore.identityService.currentUser,
                token,
              );
            const userStatus = deserialize(
              V1_ContractUserStatusResponseModelSchema,
              rawUserStatus,
            ).status;
            const rank = approvalStagePriority[userStatus];

            return { contract, rank };
          } catch (error) {
            assertErrorThrown(error);
            this.applicationStore.notificationService.notifyWarning(
              `Could not fetch status for contract ${contract.guid}: ${error.message}`,
            );
            return null;
          }
        }),
      )
    ).filter(isNonNullable);

    const bestContract = contractStatuses.reduce<
      | {
          contract: V1_DataContract;
          rank: number;
        }
      | undefined
    >((currentBest, currentContract) => {
      if (!currentBest || currentContract.rank > currentBest.rank) {
        return {
          contract: currentContract.contract,
          rank: currentContract.rank,
        };
      }
      return currentBest;
    }, undefined);

    return bestContract?.contract;
  }

  handleContractClick(dataAccessState: DataProductDataAccessState): void {
    switch (this.access) {
      case AccessPointGroupAccess.NO_ACCESS:
      case AccessPointGroupAccess.DENIED:
        dataAccessState.setContractCreatorAPG(this.apg);
        break;
      case AccessPointGroupAccess.PENDING_MANAGER_APPROVAL:
      case AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL:
      case AccessPointGroupAccess.APPROVED:
        if (this.associatedUserContract) {
          dataAccessState.setContractViewerContractAndSubscription({
            dataContract: this.associatedUserContract,
          });
        }
        break;
      default:
        break;
    }
  }

  *fetchUserAccessStatus(
    contractId: string,
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingUserAccessState.inProgress();
      const rawUserStatus =
        (yield lakehouseContractServerClient.getContractUserStatus(
          contractId,
          this.applicationStore.identityService.currentUser,
          tokenProvider(),
        )) as PlainObject<V1_ContractUserStatusResponse>;
      const userStatus = deserialize(
        V1_ContractUserStatusResponseModelSchema,
        rawUserStatus,
      ).status;
      this.setUserAccessStatus(userStatus);
      if (userStatus === V1_EnrichedUserApprovalStatus.APPROVED) {
        this.pollConsumerGrant(
          contractId,
          lakehouseContractServerClient,
          tokenProvider,
        );
      }
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
    contracts: V1_LiteDataContract[],
    lakehouseContractServerClient: LakehouseContractServerClient,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.fetchingSubscriptionsState.inProgress();
      const rawSubscriptions = (
        (yield Promise.all(
          contracts.map(async (contract) =>
            lakehouseContractServerClient.getSubscriptionsForContract(
              contract.guid,
              token,
            ),
          ),
        )) as V1_DataSubscriptionResponse[]
      ).flatMap((response) => response.subscriptions ?? []);
      const subscriptions = rawSubscriptions.map((rawSubscription) =>
        deserialize(V1_dataSubscriptionModelSchema, rawSubscription),
      );
      this.setSubscriptions(subscriptions);
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
          this.apgContracts,
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
