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
  type V1_ContractUserMembership,
  type V1_DataSubscription,
  type V1_LiteDataContract,
  type V1_OrganizationalScope,
  type V1_TaskMetadata,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ContractState,
  V1_ResourceType,
  V1_UserApprovalStatus,
  V1_UserType,
  V1_deserializeDataContractResponse,
  V1_deserializeTaskResponse,
  V1_observe_LiteDataContract,
  V1_transformDataContractToLiteDatacontract,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ContractUserEventDataProducerPayload,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type UserSearchService,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  DataAccessRequestStatus,
  type DataAccessRequestState,
  type TimelineStep,
} from './DataAccessRequestState.js';
import { isContractInTerminalState } from '../../../utils/DataContractUtils.js';

export class DataContractViewerState implements DataAccessRequestState {
  liteContract: V1_LiteDataContract;
  readonly getTaskUrl: (contractId: string, taskId: string) => string;
  readonly subscription: V1_DataSubscription | undefined;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService: UserSearchService | undefined;
  associatedTasks: V1_TaskMetadata[] | undefined;
  contractMembers: V1_ContractUserMembership[] = [];

  readonly initializationState = ActionState.create();
  readonly fetchingMembersState = ActionState.create();
  readonly escalatingState = ActionState.create();
  readonly invalidatingState = ActionState.create();

  constructor(
    dataContract: V1_LiteDataContract,
    getTaskUrl: (contractId: string, taskId: string) => string,
    subscription: V1_DataSubscription | undefined,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
    graphManagerState: GraphManagerState,
    userSearchService: UserSearchService | undefined,
  ) {
    makeObservable(this, {
      liteContract: observable,
      associatedTasks: observable,
      contractMembers: observable,
      setAssociatedTasks: action,
      setLiteContract: action,
      setContractMembers: action,
      targetUsers: computed,
      isInProgress: computed,
      init: flow,
      invalidateRequest: flow,
    });

    this.liteContract = V1_observe_LiteDataContract(dataContract);
    this.getTaskUrl = getTaskUrl;
    this.subscription = subscription;
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
  }

  // ---- Delegate getters for DataAccessRequestState ----

  get guid(): string {
    return this.liteContract.guid;
  }

  get description(): string {
    return this.liteContract.description;
  }

  get createdBy(): string {
    return this.liteContract.createdBy;
  }

  get createdAt(): string {
    return this.liteContract.createdAt;
  }

  get resourceId(): string {
    return this.liteContract.resourceId;
  }

  get resourceType(): string {
    return this.liteContract.resourceType;
  }

  get accessPointGroup(): string | undefined {
    return this.liteContract.accessPointGroup;
  }

  get deploymentId(): number {
    return this.liteContract.deploymentId;
  }

  get consumer(): V1_OrganizationalScope {
    return this.liteContract.consumer;
  }

  get status(): DataAccessRequestStatus {
    switch (this.liteContract.state) {
      case V1_ContractState.DRAFT:
        return DataAccessRequestStatus.DRAFT;
      case V1_ContractState.PENDING_DATA_OWNER_APPROVAL:
        return DataAccessRequestStatus.PENDING_DATA_OWNER_APPROVAL;
      case V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL:
        return DataAccessRequestStatus.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL;
      case V1_ContractState.COMPLETED:
        return DataAccessRequestStatus.COMPLETED;
      case V1_ContractState.REJECTED:
        return DataAccessRequestStatus.REJECTED;
      case V1_ContractState.CLOSED:
        return DataAccessRequestStatus.CLOSED;
      default:
        throw new Error(
          `Unsupported contract state: ${this.liteContract.state}`,
        );
    }
  }

  get isInTerminalState(): boolean {
    return isContractInTerminalState(this.liteContract);
  }

  get isInProgress(): boolean {
    return (
      this.associatedTasks?.some(
        (task) => task.rec.status === V1_UserApprovalStatus.PENDING,
      ) ?? false
    );
  }

  get targetUsers(): string[] | undefined {
    if (this.associatedTasks?.length) {
      return Array.from(
        new Set<string>(this.associatedTasks.map((task) => task.rec.consumer)),
      ).sort();
    }
    const consumer = this.liteContract.consumer;
    if (consumer instanceof V1_AdhocTeam) {
      return consumer.users.map((user) => user.name).sort();
    }
    return undefined;
  }

  // ---- Timeline ----

  getTimelineSteps(selectedTargetUser: string | undefined): TimelineStep[] {
    const privilegeManagerApprovalTask = this.associatedTasks?.find(
      (task) =>
        task.rec.consumer === selectedTargetUser &&
        task.rec.type === V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    );
    const dataOwnerApprovalTask = this.associatedTasks?.find(
      (task) =>
        task.rec.consumer === selectedTargetUser &&
        task.rec.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
    );
    const privilegeManagerApprovalPayload =
      privilegeManagerApprovalTask?.rec.eventPayload instanceof
      V1_ContractUserEventPrivilegeManagerPayload
        ? privilegeManagerApprovalTask.rec.eventPayload
        : undefined;
    const dataOwnerApprovalPayload =
      dataOwnerApprovalTask?.rec.eventPayload instanceof
      V1_ContractUserEventDataProducerPayload
        ? dataOwnerApprovalTask.rec.eventPayload
        : undefined;
    const privilegeManagerApprovalStepStatus = privilegeManagerApprovalTask
      ? privilegeManagerApprovalTask.rec.status ===
        V1_UserApprovalStatus.PENDING
        ? ('active' as const)
        : privilegeManagerApprovalTask.rec.status ===
            V1_UserApprovalStatus.APPROVED
          ? ('complete' as const)
          : privilegeManagerApprovalTask.rec.status ===
                V1_UserApprovalStatus.DENIED ||
              privilegeManagerApprovalTask.rec.status ===
                V1_UserApprovalStatus.REVOKED ||
              privilegeManagerApprovalTask.rec.status ===
                V1_UserApprovalStatus.CLOSED
            ? ('denied' as const)
            : ('upcoming' as const)
      : ('skipped' as const);
    const dataOwnerApprovalStepStatus = dataOwnerApprovalTask
      ? dataOwnerApprovalTask.rec.status === V1_UserApprovalStatus.PENDING
        ? ('active' as const)
        : dataOwnerApprovalTask.rec.status === V1_UserApprovalStatus.APPROVED
          ? ('complete' as const)
          : dataOwnerApprovalTask.rec.status === V1_UserApprovalStatus.DENIED ||
              dataOwnerApprovalTask.rec.status ===
                V1_UserApprovalStatus.REVOKED ||
              dataOwnerApprovalTask.rec.status === V1_UserApprovalStatus.CLOSED
            ? ('denied' as const)
            : ('upcoming' as const)
      : ('upcoming' as const);

    const showEscalateButton =
      selectedTargetUser ===
        this.applicationStore.identityService.currentUser ||
      (selectedTargetUser !== undefined &&
        this.getContractUserType(selectedTargetUser) ===
          V1_UserType.SYSTEM_ACCOUNT);
    const isEscalated = privilegeManagerApprovalTask?.rec.isEscalated ?? false;
    const isEscalatable =
      showEscalateButton &&
      privilegeManagerApprovalStepStatus === 'active' &&
      !isEscalated;

    if (this.liteContract.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP) {
      return [];
    }

    return [
      {
        key: 'submitted',
        status: 'complete' as const,
        label: { title: 'Submitted' },
      },
      {
        key: 'privilege-manager-approval',
        label: {
          title: 'Privilege Manager Approval',
          link:
            privilegeManagerApprovalStepStatus === 'active'
              ? this.getTaskUrl(
                  this.guid,
                  privilegeManagerApprovalTask!.rec.taskId,
                )
              : undefined,
          showEscalateButton,
          isEscalatable,
          isEscalated,
        },
        status: privilegeManagerApprovalStepStatus,
        assignees: privilegeManagerApprovalTask?.assignees,
        approvalPayload:
          privilegeManagerApprovalTask && privilegeManagerApprovalPayload
            ? {
                status: privilegeManagerApprovalTask.rec.status,
                approvalTimestamp:
                  privilegeManagerApprovalPayload.eventTimestamp,
                approverId: privilegeManagerApprovalPayload.managerIdentity,
              }
            : undefined,
      },
      {
        key: 'data-producer-approval',
        label: {
          title: 'Data Producer Approval',
          link:
            dataOwnerApprovalStepStatus === 'active'
              ? this.getTaskUrl(this.guid, dataOwnerApprovalTask!.rec.taskId)
              : undefined,
        },
        status: dataOwnerApprovalStepStatus,
        assignees: dataOwnerApprovalTask?.assignees,
        approvalPayload:
          dataOwnerApprovalTask && dataOwnerApprovalPayload
            ? {
                status: dataOwnerApprovalTask.rec.status,
                approvalTimestamp: dataOwnerApprovalPayload.eventTimestamp,
                approverId: dataOwnerApprovalPayload.dataProducerIdentity,
              }
            : undefined,
      },
      {
        key: 'complete',
        status:
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.APPROVED
            ? ('complete' as const)
            : ('upcoming' as const),
        label: { title: 'Complete' },
      },
    ];
  }

  // ---- Mutations ----

  setAssociatedTasks(associatedTasks: V1_TaskMetadata[] | undefined): void {
    this.associatedTasks = associatedTasks;
  }

  setLiteContract(liteContract: V1_LiteDataContract): void {
    this.liteContract = liteContract;
  }

  setContractMembers(
    contractMembers: V1_ContractUserMembership[] | undefined,
  ): void {
    this.contractMembers = contractMembers ?? [];
  }

  async fetchTasks(token: string | undefined): Promise<void> {
    this.setAssociatedTasks(undefined);
    const pendingTasks =
      await this.lakehouseContractServerClient.getContractTasks(
        this.liteContract.guid,
        token,
      );
    const tasks = V1_deserializeTaskResponse(pendingTasks);
    this.setAssociatedTasks(tasks);
  }

  async fetchContractWithMembers(token: string | undefined): Promise<void> {
    this.fetchingMembersState.inProgress();
    try {
      const rawContractsAndSubscriptions =
        await this.lakehouseContractServerClient.getDataContract(
          this.liteContract.guid,
          true,
          token,
        );
      const contractsAndSubscriptions = V1_deserializeDataContractResponse(
        rawContractsAndSubscriptions,
        this.graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
      );

      this.setContractMembers(
        contractsAndSubscriptions[0]?.dataContract?.members ?? [],
      );
      if (contractsAndSubscriptions[0]?.dataContract) {
        this.setLiteContract(
          V1_observe_LiteDataContract(
            V1_transformDataContractToLiteDatacontract(
              contractsAndSubscriptions[0].dataContract,
            ),
          ),
        );
      }
    } finally {
      this.fetchingMembersState.complete();
    }
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      yield Promise.all([
        this.fetchTasks(token),
        this.fetchContractWithMembers(token),
      ]);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }

  getContractUserType(userId: string): V1_UserType | undefined {
    return this.contractMembers.find((member) => member.user.name === userId)
      ?.user.userType;
  }

  *escalateRequest(user: string, token: string | undefined): GeneratorFn<void> {
    try {
      this.escalatingState.inProgress();
      yield this.lakehouseContractServerClient.escalateUserOnContract(
        this.guid,
        user,
        false,
        token,
      );

      this.applicationStore.notificationService.notifySuccess(
        'Contract escalated successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Error escalating contract: ${error.message}`,
      );
    } finally {
      this.escalatingState.complete();
    }
  }

  *invalidateRequest(token: string | undefined): GeneratorFn<void> {
    try {
      this.invalidatingState.inProgress();
      yield this.lakehouseContractServerClient.invalidateContract(
        this.liteContract.guid,
        token,
      );

      this.applicationStore.notificationService.notifySuccess(
        'Contract closed successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Error closing contract: ${error.message}`,
      );
    } finally {
      this.invalidatingState.complete();
    }
  }
}
