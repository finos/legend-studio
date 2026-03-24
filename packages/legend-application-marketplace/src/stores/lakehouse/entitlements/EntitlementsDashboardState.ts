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
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
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
  allContractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails> =
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
      allContractsCreatedByUserMap: observable,
      pendingTaskContractMap: observable,
      pendingTaskContracts: computed,
      allContractsCreatedByUser: computed,
      init: flow,
      approve: flow,
      deny: flow,
      fetchPendingTasks: flow,
      fetchPendingTaskContracts: flow,
      fetchContractsForUser: flow,
      fetchContractsCreatedByUser: flow,
      fetchContractDeploymentEnvironments: flow,
      updateContract: flow,
    });
  }

  get pendingTaskContracts(): V1_LiteDataContract[] {
    return Array.from(this.pendingTaskContractMap.values());
  }

  get allContractsCreatedByUser(): ContractCreatedByUserDetails[] {
    return Array.from(this.allContractsCreatedByUserMap.values());
  }

  *init(token: string | undefined): GeneratorFn<void> {
    this.initializationState.inProgress();
    try {
      this.fetchingPendingTasksState.inProgress();
      this.fetchingContractsForUserState.inProgress();
      this.fetchingContractsByUserState.inProgress();

      const [pendingTasksData, contractsForUser, contractsCreatedByUserMap] =
        (yield Promise.all([
          (async () => {
            try {
              const tasks = await flowResult(this.fetchPendingTasks(token));
              const taskContractMap = await flowResult(
                this.fetchPendingTaskContracts(token, tasks),
              );
              return { tasks, taskContractMap };
            } catch (error) {
              assertErrorThrown(error);
              this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
                error,
              );
              return {
                tasks: [] as V1_ContractUserEventRecord[],
                taskContractMap: new Map<string, V1_LiteDataContract>(),
              };
            }
          })(),
          flowResult(this.fetchContractsForUser(token)),
          flowResult(this.fetchContractsCreatedByUser(token)),
        ])) as [
          {
            tasks: V1_ContractUserEventRecord[];
            taskContractMap: Map<string, V1_LiteDataContract>;
          },
          V1_LiteDataContractWithUserStatus[],
          Map<string, ContractCreatedByUserDetails>,
        ];

      const allContracts: V1_LiteDataContract[] = [
        ...Array.from(pendingTasksData.taskContractMap.values()),
        ...contractsForUser.map((c) => c.contractResultLite),
        ...Array.from(contractsCreatedByUserMap.values()).map(
          (c) => c.contractResultLite,
        ),
      ];
      const envMap = (yield flowResult(
        this.fetchContractDeploymentEnvironments(token, allContracts),
      )) as Map<number, string>;

      const {
        filteredTasks,
        filteredContractsForUser,
        filteredCreatedByUserMap,
      } = this.filterByUserEnvironment(
        pendingTasksData,
        contractsForUser,
        contractsCreatedByUserMap,
        envMap,
      );
      this.pendingTaskContractMap = pendingTasksData.taskContractMap;
      this.pendingTasks = filteredTasks;
      this.allContractsForUser = filteredContractsForUser;
      this.allContractsCreatedByUserMap = filteredCreatedByUserMap;

      this.fetchingPendingTasksState.complete();
      this.fetchingContractsForUserState.complete();
      this.fetchingContractsByUserState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.alertUnhandledError(
        error,
      );
    } finally {
      this.initializationState.complete();
    }
  }

  *fetchPendingTasks(
    token: string | undefined,
  ): GeneratorFn<V1_ContractUserEventRecord[]> {
    try {
      const rawTasks =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getPendingTasks(
          TEST_USER,
          token,
        )) as PlainObject<V1_PendingTasksResponse>;
      const tasks = deserialize(V1_pendingTasksResponseModelSchema, rawTasks);
      return [...tasks.dataOwner, ...tasks.privilegeManager];
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching pending tasks: ${error.message}`,
      );
      return [];
    }
  }

  *fetchPendingTaskContracts(
    token: string | undefined,
    pendingTasks: V1_ContractUserEventRecord[],
  ): GeneratorFn<Map<string, V1_LiteDataContract>> {
    const pendingTaskContractIds = Array.from(
      new Set(pendingTasks.map((t) => t.dataContractId)),
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
    const resultMap = new Map<string, V1_LiteDataContract>();
    pendingTaskContractIds.forEach((contractId) => {
      const contract = pendingTaskContracts.find((c) => c.guid === contractId);
      if (contract) {
        resultMap.set(contractId, contract);
      }
    });
    return resultMap;
  }

  *fetchContractsForUser(
    token: string | undefined,
  ): GeneratorFn<V1_LiteDataContractWithUserStatus[]> {
    try {
      const rawContracts =
        (yield this.lakehouseEntitlementsStore.lakehouseContractServerClient.getContractsForUser(
          this.lakehouseEntitlementsStore.applicationStore.identityService
            .currentUser,
          token,
        )) as PlainObject<V1_LiteDataContractWithUserStatus>[];
      return rawContracts.map((rawContract) =>
        deserialize(
          V1_liteDataContractWithUserStatusModelSchema(
            this.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          rawContract,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts for user: ${error.message}`,
      );
      return [];
    }
  }

  *fetchContractsCreatedByUser(
    token: string | undefined,
  ): GeneratorFn<Map<string, ContractCreatedByUserDetails>> {
    try {
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
      const resultMap = new Map<string, ContractCreatedByUserDetails>();
      contracts.forEach((contract) => {
        if (!resultMap.has(contract.contractResultLite.guid)) {
          resultMap.set(
            contract.contractResultLite.guid,
            new ContractCreatedByUserDetails(contract.contractResultLite),
          );
        }
        const entry = guaranteeNonNullable(
          resultMap.get(contract.contractResultLite.guid),
        );
        entry.addAssignees(contract.pendingTaskWithAssignees?.assignees ?? []);
        entry.addMember(contract.user, contract.status);
      });
      return resultMap;
    } catch (error) {
      assertErrorThrown(error);
      this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
        `Error fetching data contracts created by user: ${error.message}`,
      );
      return new Map();
    }
  }

  *fetchContractDeploymentEnvironments(
    token: string | undefined,
    allContracts: V1_LiteDataContract[],
  ): GeneratorFn<Map<number, string>> {
    const uniqueDIDToDataProduct = new Map<number, string>();
    for (const contract of allContracts) {
      uniqueDIDToDataProduct.set(contract.deploymentId, contract.resourceId);
    }

    const didToEnvType = new Map<number, string>();
    yield Promise.all(
      Array.from(uniqueDIDToDataProduct.entries()).map(
        async ([deploymentId, resourceId]) => {
          try {
            const raw =
              await this.lakehouseEntitlementsStore.lakehouseContractServerClient.getDataProductByIdAndDID(
                resourceId,
                deploymentId,
                token,
              );
            const details =
              V1_entitlementsDataProductDetailsResponseToDataProductDetails(
                raw,
              );
            const env = details[0]?.lakehouseEnvironment?.type;
            if (env) {
              didToEnvType.set(deploymentId, env);
            }
          } catch (error) {
            assertErrorThrown(error);
            this.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
              `Error fetching deployment environment for deployment ${deploymentId}: ${error.message}`,
            );
          }
        },
      ),
    );
    return didToEnvType;
  }

  private filterByUserEnvironment(
    pendingData: {
      tasks: V1_ContractUserEventRecord[];
      taskContractMap: Map<string, V1_LiteDataContract>;
    },
    contractsForUser: V1_LiteDataContractWithUserStatus[],
    contractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails>,
    envMap: Map<number, string>,
  ): {
    filteredTasks: V1_ContractUserEventRecord[];
    filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
    filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
  } {
    const userEnv =
      this.lakehouseEntitlementsStore.marketplaceBaseStore.envState
        .lakehouseEnvironment;
    const envMatchesForDeploymentId = (deploymentId: number): boolean => {
      const env = envMap.get(deploymentId);
      return !env || env === userEnv;
    };

    const filteredTasks = pendingData.tasks.filter((task) => {
      const contract = pendingData.taskContractMap.get(task.dataContractId);
      return !contract || envMatchesForDeploymentId(contract.deploymentId);
    });
    const filteredContractsForUser = contractsForUser.filter((c) =>
      envMatchesForDeploymentId(c.contractResultLite.deploymentId),
    );
    const filteredCreatedByUserMap = new Map<
      string,
      ContractCreatedByUserDetails
    >();
    for (const [guid, details] of contractsCreatedByUserMap.entries()) {
      if (envMatchesForDeploymentId(details.contractResultLite.deploymentId)) {
        filteredCreatedByUserMap.set(guid, details);
      }
    }
    return {
      filteredTasks,
      filteredContractsForUser,
      filteredCreatedByUserMap,
    };
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
    this.allContractsCreatedByUserMap.delete(contractId);
    const updatedCreatedByUserContracts = newCreatedByUserContracts.filter(
      (c) => c.contractResultLite.guid === contractId,
    );

    updatedCreatedByUserContracts.forEach((contract) => {
      if (
        !this.allContractsCreatedByUserMap.has(contract.contractResultLite.guid)
      ) {
        this.allContractsCreatedByUserMap.set(
          contract.contractResultLite.guid,
          new ContractCreatedByUserDetails(contract.contractResultLite),
        );
      }
      const entry = guaranteeNonNullable(
        this.allContractsCreatedByUserMap.get(contract.contractResultLite.guid),
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
