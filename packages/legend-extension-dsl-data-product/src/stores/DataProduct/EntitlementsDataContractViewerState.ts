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
  type V1_ContractUserEventPayload,
  type V1_DataSubscription,
  type V1_LiteDataContract,
  type V1_OrganizationalScope,
  type V1_TaskMetadata,
  type V1_UserType,
  type V1_ContractState,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ResourceType,
  V1_UserApprovalStatus,
  V1_deserializeDataContractResponse,
  V1_deserializeTaskResponse,
  V1_observe_LiteDataContract,
  V1_transformDataContractToLiteDatacontract,
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
import { isContractInTerminalState } from '../../utils/DataContractUtils.js';

export type TimelineStep = {
  key: string;
  label: React.ReactNode;
  status: 'active' | 'complete' | 'denied' | 'skipped' | 'upcoming';
  description?: React.ReactNode;
  // Optional task metadata for rendering interactive elements
  taskId?: string | undefined;
  taskStatus?: string | undefined;
  assignees?: string[] | undefined;
  isEscalated?: boolean | undefined;
  approvalPayload?: V1_ContractUserEventPayload | undefined;
};

export interface DataAccessRequestState {
  // Identity
  readonly guid: string;
  readonly description: string;
  readonly createdBy: string;
  readonly createdAt: string;

  // Resource info
  readonly resourceId: string;
  readonly resourceType: string;
  readonly accessPointGroup: string | undefined;
  readonly deploymentId: number;

  // Consumer info
  readonly consumer: V1_OrganizationalScope;

  // Status
  readonly state: V1_ContractState;
  readonly isInTerminalState: boolean;
  readonly isInProgress: boolean;

  // Subscription
  readonly subscription: V1_DataSubscription | undefined;

  // Services
  readonly applicationStore: GenericLegendApplicationStore;
  readonly userSearchService: UserSearchService | undefined;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;

  // Action states
  readonly initializationState: ActionState;
  readonly invalidatingContractState: ActionState;

  // Data
  readonly contractMembers: V1_ContractUserMembership[];
  readonly targetUsers: string[] | undefined;

  // Timeline
  getTimelineSteps(selectedTargetUser: string | undefined): TimelineStep[];

  // Actions
  init(token: string | undefined): GeneratorFn<void>;
  invalidateContract(token: string | undefined): GeneratorFn<void>;
  getContractUserType(userId: string): V1_UserType | undefined;
}

export class DataContractViewerState implements DataAccessRequestState {
  liteContract: V1_LiteDataContract;
  readonly subscription: V1_DataSubscription | undefined;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly userSearchService: UserSearchService | undefined;
  associatedTasks: V1_TaskMetadata[] | undefined;
  contractMembers: V1_ContractUserMembership[] = [];

  readonly initializationState = ActionState.create();
  readonly fetchingMembersState = ActionState.create();
  readonly invalidatingContractState = ActionState.create();

  constructor(
    dataContract: V1_LiteDataContract,
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
      invalidateContract: flow,
    });

    this.liteContract = V1_observe_LiteDataContract(dataContract);
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

  get state(): V1_ContractState {
    return this.liteContract.state;
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

    if (this.liteContract.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP) {
      return [];
    }

    return [
      { key: 'submitted', status: 'complete' as const, label: 'Submitted' },
      {
        key: 'privilege-manager-approval',
        label: 'Privilege Manager Approval',
        status:
          privilegeManagerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING
            ? ('active' as const)
            : privilegeManagerApprovalTask?.rec.status ===
                V1_UserApprovalStatus.APPROVED
              ? ('complete' as const)
              : privilegeManagerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.DENIED ||
                  privilegeManagerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.REVOKED ||
                  privilegeManagerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.CLOSED
                ? ('denied' as const)
                : privilegeManagerApprovalTask === undefined
                  ? ('skipped' as const)
                  : ('upcoming' as const),
        taskId: privilegeManagerApprovalTask?.rec.taskId,
        taskStatus: privilegeManagerApprovalTask?.rec.status,
        assignees: privilegeManagerApprovalTask?.assignees,
        isEscalated: privilegeManagerApprovalTask?.rec.isEscalated,
        approvalPayload: privilegeManagerApprovalTask?.rec.eventPayload,
      },
      {
        key: 'data-producer-approval',
        label: 'Data Producer Approval',
        status:
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.PENDING
            ? ('active' as const)
            : dataOwnerApprovalTask?.rec.status ===
                V1_UserApprovalStatus.APPROVED
              ? ('complete' as const)
              : dataOwnerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.DENIED ||
                  dataOwnerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.REVOKED ||
                  dataOwnerApprovalTask?.rec.status ===
                    V1_UserApprovalStatus.CLOSED
                ? ('denied' as const)
                : ('upcoming' as const),
        taskId: dataOwnerApprovalTask?.rec.taskId,
        taskStatus: dataOwnerApprovalTask?.rec.status,
        assignees: dataOwnerApprovalTask?.assignees,
        approvalPayload: dataOwnerApprovalTask?.rec.eventPayload,
      },
      {
        key: 'complete',
        status:
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.APPROVED
            ? ('complete' as const)
            : ('upcoming' as const),
        label: 'Complete',
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

  *invalidateContract(token: string | undefined): GeneratorFn<void> {
    try {
      this.invalidatingContractState.inProgress();
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
      this.invalidatingContractState.complete();
    }
  }

  getContractUserType(userId: string): V1_UserType | undefined {
    return this.contractMembers.find((member) => member.user.name === userId)
      ?.user.userType;
  }
}

/**
 * @deprecated Use {@link DataContractViewerState} instead.
 */
export const EntitlementsDataContractViewerState = DataContractViewerState;
/**
 * @deprecated Use {@link DataContractViewerState} instead.
 */
export type EntitlementsDataContractViewerState = DataContractViewerState;
