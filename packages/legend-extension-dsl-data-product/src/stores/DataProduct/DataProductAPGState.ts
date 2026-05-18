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
  type V1_DataSubscription,
  type V1_DataSubscriptionResponse,
  type V1_DataSubscriptionTarget,
  type V1_LiteDataContract,
  type V1_LiteDataContractWithUserStatus,
  type V1_User,
  V1_ContractUserStatusResponseModelSchema,
  V1_CreateSubscriptionInput,
  V1_CreateSubscriptionInputModelSchema,
  V1_DataContract,
  V1_DataContractApprovedUsersResponseModelSchema,
  V1_dataRequestModelSchema,
  V1_dataSubscriptionModelSchema,
  V1_DataSubscriptionResponseModelSchema,
  V1_deserializeDataContractResponse,
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_EnrichedUserApprovalStatus,
  V1_deserializeOrgMembersResponse,
  V1_RequestState,
  V1_RMS,
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
  contractContainsSystemAccount,
} from '../../utils/DataContractUtils.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../DataProductDataAccess_LegendApplicationPlugin_Extension.js';
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
import { PermitDataAccessRequestState } from './DataAccess/PermitDataAccessRequestState.js';
import type { DataAccessRequestState } from './DataAccess/DataAccessRequestState.js';

export enum AccessPointGroupAccess {
  // can be used to indicate fetching or resyncing of group access
  UNKNOWN = 'UNKNOWN',

  SUBMITTED_FOR_APPROVALS = 'SUBMITTED_FOR_APPROVALS',
  PENDING_MANAGER_APPROVAL = 'PENDING_MANAGER_APPROVAL',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  NO_ACCESS = 'NO_ACCESS',
  ENTERPRISE = 'ENTERPRISE', // Used to indicate that the group is available for all users in the organization
}

export enum V1_UserApprovalPriority {
  NO_PRIORITY = 0,
  SUBMITTED_FOR_APPROVALS_PRIORITY = 1,
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

  // Fallback: access derived from data requests when no contract exists
  dataRequestAccess: V1_EnrichedUserApprovalStatus | undefined = undefined;
  dataRequestGuid: string | undefined = undefined;
  dataAccessRequestViewerState: DataAccessRequestState | undefined = undefined;
  readonly fetchingDataRequestAccessState = ActionState.create();

  missingIngests: string[] | undefined = undefined;

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
    initialCollapsed = false,
    initialAccessPointsCollapsed = false,
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
      hasMissingIngests: computed,
      dataRequestAccess: observable,
      dataRequestGuid: observable,
      dataAccessRequestViewerState: observable,
      setDataRequestAccess: action,
      missingIngests: observable,
      setMissingIngests: action,
      fetchMissingIngests: flow,
    });

    this.apg = group;
    this.dataProductViewerState = dataProductViewerState;
    this.applicationStore = dataProductViewerState.applicationStore;
    this.accessPointStates = this.apg.accessPoints.map(
      (ap) =>
        new DataProductAccessPointState(this, ap, initialAccessPointsCollapsed),
    );
    this.isCollapsed = initialCollapsed;
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
    if (
      this.associatedUserContract === false ||
      this.fetchingDataRequestAccessState.isInProgress
    ) {
      return AccessPointGroupAccess.UNKNOWN;
    } else if (
      this.userAccessStatus ===
        V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS ||
      this.dataRequestAccess ===
        V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS
    ) {
      return AccessPointGroupAccess.SUBMITTED_FOR_APPROVALS;
    } else if (
      this.userAccessStatus ===
        V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL ||
      this.dataRequestAccess ===
        V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL
    ) {
      return AccessPointGroupAccess.PENDING_MANAGER_APPROVAL;
    } else if (
      this.userAccessStatus ===
        V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL ||
      this.dataRequestAccess ===
        V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL
    ) {
      return AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL;
    } else if (
      this.userAccessStatus === V1_EnrichedUserApprovalStatus.APPROVED ||
      this.dataRequestAccess === V1_EnrichedUserApprovalStatus.APPROVED
    ) {
      return AccessPointGroupAccess.APPROVED;
    } else if (
      this.userAccessStatus === V1_EnrichedUserApprovalStatus.DENIED ||
      this.dataRequestAccess === V1_EnrichedUserApprovalStatus.DENIED
    ) {
      return AccessPointGroupAccess.DENIED;
    } else {
      return AccessPointGroupAccess.NO_ACCESS;
    }
  }

  setDataRequestAccess(
    val: V1_EnrichedUserApprovalStatus | undefined,
    guid?: string,
  ): void {
    this.dataRequestAccess = val;
    this.dataRequestGuid = guid;
  }

  setMissingIngests(val: string[] | undefined): void {
    this.missingIngests = val;
  }

  get hasMissingIngests(): boolean {
    return (this.missingIngests?.length ?? 0) > 0;
  }

  *fetchMissingIngests(
    tokenProvider: () => string | undefined,
  ): GeneratorFn<void> {
    if (this.missingIngests !== undefined) {
      return;
    }
    const dataAccessState =
      this.dataProductViewerState.dataProductDataAccessState;
    if (!dataAccessState) {
      this.setMissingIngests([]);
      return;
    }
    try {
      const result = (yield dataAccessState.computeMissingIngestsForApg(
        this.apg.id,
        tokenProvider,
      )) as string[];
      this.setMissingIngests(result);
    } catch (error) {
      assertErrorThrown(error);
      this.setMissingIngests([]);
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
    userContracts: V1_LiteDataContractWithUserStatus[],
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
    dataAccessPlugins?: DataProductDataAccess_LegendApplicationPlugin_Extension[],
  ): Promise<void> {
    try {
      this.handlingContractsState.inProgress();

      const entitlementsDataProductDetails =
        this.dataProductViewerState.entitlementsDataProductDetails;
      const userLiteContract = userContracts
        .filter((contract) =>
          dataContractContainsAccessGroup(
            this.apg,
            contract.contractResultLite,
            entitlementsDataProductDetails?.dataProduct.name,
            entitlementsDataProductDetails?.deploymentId,
          ),
        )
        .find(isNonNullable);

      const userContract = userLiteContract
        ? V1_deserializeDataContractResponse(
            await lakehouseContractServerClient.getDataContract(
              userLiteContract.contractResultLite.guid,
              true,
              tokenProvider(),
            ),
            this.dataProductViewerState.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
          )[0]?.dataContract
        : undefined;

      this.setAssociatedUserContract(
        userContract,
        lakehouseContractServerClient,
        tokenProvider,
      );

      // Fallback: if no user contract found, check data requests
      if (!userContract && dataAccessPlugins) {
        // eslint-disable-next-line no-void
        void this.fetchDataRequestAccessFallback(
          lakehouseContractServerClient,
          tokenProvider,
          dataAccessPlugins,
        );
      }

      const accessPointGroupContracts = contracts.filter((_contract) =>
        dataContractContainsAccessGroup(
          this.apg,
          _contract,
          entitlementsDataProductDetails?.dataProduct.name,
          entitlementsDataProductDetails?.deploymentId,
        ),
      );

      this.setApgContracts(accessPointGroupContracts);

      const systemAccountContracts = accessPointGroupContracts.filter(
        contractContainsSystemAccount,
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

  /**
   * Fallback: When no contract exists for the user, check data requests.
   * Fetches data requests for this data product + DID, checks if
   * current user is a member of the RMS org for any matching request,
   * and updates button access state accordingly.
   */
  async fetchDataRequestAccessFallback(
    lakehouseContractServerClient: LakehouseContractServerClient,
    tokenProvider: () => string | undefined,
    dataAccessPlugins: DataProductDataAccess_LegendApplicationPlugin_Extension[],
  ): Promise<void> {
    this.fetchingDataRequestAccessState.inProgress();
    try {
      const token = tokenProvider();
      const entitlementsDataProductDetails =
        this.dataProductViewerState.entitlementsDataProductDetails;
      if (!entitlementsDataProductDetails) {
        return;
      }

      const rawResponse =
        await lakehouseContractServerClient.getDataRequestsForDataProduct(
          'ACCESS_POINT_GROUP',
          entitlementsDataProductDetails.dataProduct.name,
          entitlementsDataProductDetails.deploymentId,
          token,
        );
      const plugins =
        this.dataProductViewerState.graphManagerState.pluginManager.getPureProtocolProcessorPlugins();
      const rawDataRequests: PlainObject[] =
        (rawResponse as { dataRequests?: PlainObject[] }).dataRequests ?? [];
      const dataRequests = rawDataRequests.map((raw) =>
        deserialize(V1_dataRequestModelSchema(plugins), raw),
      );

      if (dataRequests.length === 0) {
        return;
      }

      const currentUser =
        this.applicationStore.identityService.currentUser.toLowerCase();
      const orgMembersPlugin = dataAccessPlugins.find(
        (p) => p.getOrgMembers !== undefined,
      );

      if (!orgMembersPlugin?.getOrgMembers) {
        return;
      }

      const getOrgMembers =
        orgMembersPlugin.getOrgMembers.bind(orgMembersPlugin);

      for (const request of dataRequests) {
        if (!(request.consumer instanceof V1_RMS)) {
          continue;
        }
        const matched = await this.checkOrgMembership(
          getOrgMembers,
          request.consumer.rmsNode,
          token,
          currentUser,
        );
        if (matched) {
          const access = this.mapRequestStateToAccess(request.state);
          if (access) {
            this.setDataRequestAccess(access, request.guid);
            return;
          }
        }
      }
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.fetchingDataRequestAccessState.complete();
    }
  }

  private async checkOrgMembership(
    getOrgMembers: NonNullable<
      DataProductDataAccess_LegendApplicationPlugin_Extension['getOrgMembers']
    >,
    rmsNode: string,
    token: string | undefined,
    currentUser: string,
  ): Promise<boolean> {
    try {
      const orgMembersResponse = await getOrgMembers(
        rmsNode,
        token,
        this.applicationStore,
      );
      const orgMembers = V1_deserializeOrgMembersResponse(orgMembersResponse);
      return orgMembers.some((m) => m.kerberos.toLowerCase() === currentUser);
    } catch {
      return false;
    }
  }

  private mapRequestStateToAccess(
    state: V1_RequestState,
  ): V1_EnrichedUserApprovalStatus | undefined {
    switch (state) {
      case V1_RequestState.SUBMITTED_FOR_APPROVALS:
        return V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS;
      case V1_RequestState.PENDING_INVALIDATION:
        return V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL;
      case V1_RequestState.COMPLETED:
        return V1_EnrichedUserApprovalStatus.APPROVED;
      case V1_RequestState.REJECTED:
        return V1_EnrichedUserApprovalStatus.DENIED;
      default:
        return undefined;
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
        [V1_EnrichedUserApprovalStatus.UNKNOWN]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.REVOKED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.CLOSED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.DENIED]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.NO_ACCESS]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.ENTERPRISE]:
          V1_UserApprovalPriority.NO_PRIORITY,
        [V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS]:
          V1_UserApprovalPriority.SUBMITTED_FOR_APPROVALS_PRIORITY,
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
      case AccessPointGroupAccess.SUBMITTED_FOR_APPROVALS:
      case AccessPointGroupAccess.PENDING_MANAGER_APPROVAL:
      case AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL:
      case AccessPointGroupAccess.APPROVED:
        if (this.associatedUserContract) {
          dataAccessState.setContractViewerContractAndSubscription({
            dataContract: this.associatedUserContract,
          });
        } else if (this.dataRequestGuid) {
          this.handleDataRequestClick(dataAccessState);
        }
        break;
      default:
        break;
    }
  }

  private handleDataRequestClick(
    dataAccessState: DataProductDataAccessState,
  ): void {
    if (!this.dataRequestGuid) {
      return;
    }
    if (!this.dataAccessRequestViewerState) {
      const guid = this.dataRequestGuid;
      const authClient = dataAccessState.lakehouseContractServerClient;
      const plugins =
        this.dataProductViewerState.graphManagerState.pluginManager.getPureProtocolProcessorPlugins();
      this.dataAccessRequestViewerState = new PermitDataAccessRequestState(
        guid,
        this.applicationStore,
        dataAccessState.permitWorkflowServerClient,
        this.dataProductViewerState.userSearchService,
        {
          authServerClient: authClient,
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
          ...(dataAccessState.getTaskPageUrl
            ? { getTaskPageUrl: dataAccessState.getTaskPageUrl }
            : {}),
        },
      );
    }
    dataAccessState.setDataAccessRequestViewerState(
      this.dataAccessRequestViewerState,
    );
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
