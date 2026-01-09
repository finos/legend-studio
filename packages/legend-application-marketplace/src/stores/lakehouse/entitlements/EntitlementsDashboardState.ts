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
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_ContractUserEventRecord,
  type V1_DataContract,
  type V1_EnrichedUserApprovalStatus,
  type V1_LiteDataContract,
  type V1_LiteDataContractWithUserStatus,
  type V1_PendingTasksResponse,
  type V1_TaskStatus,
  type V1_TaskStatusChangeResponse,
  V1_dataContractsResponseModelSchema,
  V1_liteDataContractWithUserStatusModelSchema,
  V1_pendingTasksResponseModelSchema,
  V1_TaskStatusChangeResponseModelSchema,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import {
  makeObservable,
  flow,
  observable,
  flowResult,
  action,
  computed,
} from 'mobx';
import {
  TEST_USER,
  type LakehouseEntitlementsStore,
} from './LakehouseEntitlementsStore.js';

export class ContractCreatedByUserDetails {
  readonly contractResultLite: V1_LiteDataContract;
  assignees: Set<string> = new Set();
  members: Map<string, V1_EnrichedUserApprovalStatus> = new Map();

  constructor(contract: V1_LiteDataContract) {
    this.contractResultLite = contract;

    makeObservable(this, {
      assignees: observable,
      members: observable,
      sortedAssigneeIds: computed,
      sortedMemberIds: computed,
      addAssignees: action,
      addMember: action,
    });
  }

  get sortedAssigneeIds(): string[] {
    return Array.from(this.assignees).toSorted();
  }

  get sortedMemberIds(): string[] {
    return Array.from(this.members.keys()).toSorted();
  }

  addAssignees(assignees: string[]): void {
    assignees.forEach((assignee) => this.assignees.add(assignee));
  }

  addMember(id: string, status: V1_EnrichedUserApprovalStatus): void {
    this.members.set(id, status);
  }
}

export class EntitlementsDashboardState {
  readonly lakehouseEntitlementsStore: LakehouseEntitlementsStore;
  pendingTasks: V1_ContractUserEventRecord[] | undefined;
  pendingTaskContractMap: Map<string, V1_LiteDataContract> = new Map();
  allContractsForUser: V1_LiteDataContractWithUserStatus[] | undefined;
  // The contracts createdBy user API returns an entry for each task, not just for each contract.
  // To consolidate this information, we store a map of contract ID to the contract details + the
  // consolidated user information from the tasks.
  allContractsCreatedByUser: Map<string, ContractCreatedByUserDetails> =
    new Map();

  readonly initializationState = ActionState.create();
  readonly fetchingPendingTasksState = ActionState.create();
  readonly fetchingContractsForUserState = ActionState.create();
  readonly fetchingContractsByUserState = ActionState.create();
  readonly changingState = ActionState.create();

  constructor(state: LakehouseEntitlementsStore) {
    this.lakehouseEntitlementsStore = state;

    makeObservable(this, {
      pendingTasks: observable,
      allContractsForUser: observable,
      allContractsCreatedByUser: observable,
      pendingTaskContractMap: observable,
      init: flow,
      approve: flow,
      deny: flow,
      fetchPendingTasks: flow,
      fetchPendingTaskContracts: flow,
      fetchContractsForUser: flow,
      fetchContractsCreatedByUser: flow,
      updateContract: flow,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initializationState.inProgress();
    try {
      yield Promise.all([
        (async () => {
          this.fetchingPendingTasksState.inProgress();
          try {
            await flowResult(this.fetchPendingTasks(token));
            await flowResult(this.fetchPendingTaskContracts(token));
          } catch (error) {
            assertErrorThrown(error);
            this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
              error,
            );
          } finally {
            this.fetchingPendingTasksState.complete();
          }
        })(),
        flowResult(this.fetchContractsForUser(token)).catch(
          this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError,
        ),
        flowResult(this.fetchContractsCreatedByUser(token)).catch(
          this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError,
        ),
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
        error,
      );
    } finally {
      this.initializationState.complete();
    }
  }

  *fetchPendingTasks(token: string | undefined): GeneratorFn<void> {
    try {
      this.pendingTasks = undefined;
      const rawTasks =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getPendingTasks(
          TEST_USER,
          token,
        )) as PlainObject<V1_PendingTasksResponse>;
      const tasks = deserialize(V1_pendingTasksResponseModelSchema, rawTasks);
      this.pendingTasks = [...tasks.dataOwner, ...tasks.privilegeManager];
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching pending tasks: ${error.message}`,
      );
    }
  }

  *fetchPendingTaskContracts(token: string | undefined): GeneratorFn<void> {
    const pendingTaskContractIds = Array.from(
      new Set(this.pendingTasks?.map((t) => t.dataContractId) ?? []),
    );
    const pendingTaskContracts = (
      (yield Promise.all(
        pendingTaskContractIds.map(async (contractId) => {
          const rawContractResponse =
            await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getDataContract(
              contractId,
              false,
              token,
            );
          const contractResponse = deserialize(
            V1_dataContractsResponseModelSchema(
              this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            ),
            rawContractResponse,
          );
          return contractResponse.dataContracts?.[0]?.dataContract;
        }),
      )) as (V1_DataContract | undefined)[]
    )
      .filter(isNonNullable)
      .map(V1_transformDataContractToLiteDatacontract);
    pendingTaskContractIds.forEach((contractId) => {
      const contract = pendingTaskContracts.find((c) => c.guid === contractId);
      if (contract) {
        this.pendingTaskContractMap.set(contractId, contract);
      }
    });
  }

  *fetchContractsForUser(token: string | undefined): GeneratorFn<void> {
    this.fetchingContractsForUserState.inProgress();
    try {
      this.allContractsForUser = undefined;
      const rawContracts =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsForUser(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_LiteDataContractWithUserStatus>[];
      const contracts = rawContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );
      this.allContractsForUser = [...contracts];
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts for user: ${error.message}`,
      );
    } finally {
      this.fetchingContractsForUserState.complete();
    }
  }

  *fetchContractsCreatedByUser(token: string | undefined): GeneratorFn<void> {
    this.fetchingContractsByUserState.inProgress();
    try {
      this.allContractsCreatedByUser = new Map();
      const rawContracts =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsCreatedByUser(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_LiteDataContractWithUserStatus>[];
      const contracts = rawContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );
      contracts.forEach((contract) => {
        if (
          !this.allContractsCreatedByUser.has(contract.contractResultLite.guid)
        ) {
          this.allContractsCreatedByUser.set(
            contract.contractResultLite.guid,
            new ContractCreatedByUserDetails(contract.contractResultLite),
          );
        }
        const entry = guaranteeNonNullable(
          this.allContractsCreatedByUser.get(contract.contractResultLite.guid),
        );
        entry.addAssignees(contract.pendingTaskWithAssignees?.assignees ?? []);
        entry.addMember(contract.user, contract.status);
      });
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts created by user: ${error.message}`,
      );
    } finally {
      this.fetchingContractsByUserState.complete();
    }
  }

  *updateContract(
    contractId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    const [newUserContracts, newCreatedByUserContracts] = (yield Promise.all([
      (async () => {
        const rawContracts =
          await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsForUser(
            this.lakehouseEntitlementsStore.applicationStore.identityService
              .currentUser,
            token,
          );
        return rawContracts.map((rawContract) =>
          deserialize(
            V1_liteDataContractWithUserStatusModelSchema(
              this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            ),
            rawContract,
          ),
        );
      })(),
      (async () => {
        const rawContracts =
          await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsCreatedByUser(
            this.lakehouseEntitlementsStore.applicationStore.identityService
              .currentUser,
            token,
          );
        return rawContracts.map((rawContract) =>
          deserialize(
            V1_liteDataContractWithUserStatusModelSchema(
              this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            ),
            rawContract,
          ),
        );
      })(),
    ])) as [
      V1_LiteDataContractWithUserStatus[],
      V1_LiteDataContractWithUserStatus[],
    ];

    // Update the contract for the user
    this.allContractsForUser = this.allContractsForUser
      ?.map((contract) =>
        contract.contractResultLite.guid === contractId
          ? newUserContracts.find(
              (c) => c.contractResultLite.guid === contractId,
            )
          : contract,
      )
      .filter(isNonNullable);

    // Update the contract + all related data for contract created by the user
    this.allContractsCreatedByUser.delete(contractId);
    const updatedCreatedByUserContracts = newCreatedByUserContracts.filter(
      (c) => c.contractResultLite.guid === contractId,
    );

    updatedCreatedByUserContracts.forEach((contract) => {
      if (
        !this.allContractsCreatedByUser.has(contract.contractResultLite.guid)
      ) {
        this.allContractsCreatedByUser.set(
          contract.contractResultLite.guid,
          new ContractCreatedByUserDetails(contract.contractResultLite),
        );
      }
      const entry = guaranteeNonNullable(
        this.allContractsCreatedByUser.get(contract.contractResultLite.guid),
      );
      entry.addAssignees(contract.pendingTaskWithAssignees?.assignees ?? []);
      entry.addMember(contract.user, contract.status);
    });
  }

  *approve(
    task: V1_ContractUserEventRecord,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.changingState.inProgress();
      this.changingState.setMessage('Approving Task');
      const response =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.approveTask(
          task.taskId,
          token,
        )) as PlainObject<V1_TaskStatusChangeResponse>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to approve task: ${task.taskId}: ${change.errorMessage}`,
        );
      }
      task.status = change.status;
      this.pendingTasks = [...(this.pendingTasks ?? [])];
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `Task has been Approved`,
      );
    } finally {
      this.changingState.complete();
      this.changingState.setMessage(undefined);
    }
  }

  *deny(
    task: V1_ContractUserEventRecord,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.changingState.inProgress();
      this.lakehouseEntitlementsStore.applicationStore.alertService.setBlockingAlert(
        {
          message: 'Denying Task',
          prompt: 'Denying task...',
          showLoading: true,
        },
      );
      const response =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.denyTask(
          task.taskId,
          token,
        )) as PlainObject<V1_TaskStatus>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to deny task: ${task.taskId}: ${change.errorMessage}`,
        );
      }
      task.status = change.status;
      this.pendingTasks = [...(this.pendingTasks ?? [])];
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `Task has been denied`,
      );
    } finally {
      this.changingState.complete();
      this.changingState.setMessage(undefined);
      this.lakehouseEntitlementsStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }
}
