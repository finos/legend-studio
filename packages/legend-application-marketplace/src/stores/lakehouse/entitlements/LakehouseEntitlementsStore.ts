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

import type { LakehouseContractServerClient } from '../../LakehouseContractServerClient.js';
import type { LegendMarketplaceApplicationStore } from '../../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_PendingTasksRespond,
  type V1_ContractUserEventRecord,
  type V1_DataContract,
  type V1_DataContractsRecord,
  type V1_TaskStatusChangeResponse,
  V1_pendingTasksRespondModelSchema,
  V1_TaskStatusChangeResponseModelSchema,
  V1_DataContractsRecordModelSchema,
  type V1_TaskStatus,
} from '@finos/legend-graph';
import { makeObservable, flow, observable, action, flowResult } from 'mobx';
import {
  buildDataContractDetail,
  DataContractState,
} from './DataContractState.js';

export const TEST_USER = undefined;

export type GridItemDetail = {
  name: string;
  value: string | number;
  onClick?: () => void;
};

export class ContractUserEventState {
  readonly state: LakehouseEntitlementsStore;
  readonly value: V1_ContractUserEventRecord;
  canApprove: boolean | undefined;
  dataContract: V1_DataContract | undefined;

  constructor(
    value: V1_ContractUserEventRecord,
    state: LakehouseEntitlementsStore,
  ) {
    this.value = value;
    this.state = state;
    makeObservable(this, {
      value: observable,
      canApprove: observable,
      setCanApprove: observable,
      approve: flow,
      deny: flow,
      init: flow,
      calculateApprovalRights: flow,
      fetchContract: flow,
      dataContract: observable,
    });
    this.observeContract();
  }

  get id(): string {
    return this.value.taskId;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    flowResult(this.calculateApprovalRights(token)).catch(
      this.state.applicationStore.alertUnhandledError,
    );
    flowResult(this.fetchContract(token)).catch(
      this.state.applicationStore.alertUnhandledError,
    );
  }

  setCanApprove(val: boolean | undefined): void {
    this.canApprove = val;
  }

  observeContract(): void {
    makeObservable(this.value, {
      status: observable,
    });
  }

  *approve(token: string | undefined): GeneratorFn<void> {
    try {
      const response = (yield this.state.lakehouseServerClient.approveTask(
        this.value.taskId,
        token,
      )) as PlainObject<V1_TaskStatusChangeResponse>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to approve task: ${this.value.taskId}: ${change.errorMessage}`,
        );
      }
      this.value.status = change.status;
      this.setCanApprove(false);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  *deny(token: string | undefined): GeneratorFn<void> {
    try {
      const response = (yield this.state.lakehouseServerClient.denyTaskTask(
        this.value.taskId,
        token,
      )) as PlainObject<V1_TaskStatus>;
      const change = deserialize(
        V1_TaskStatusChangeResponseModelSchema,
        response,
      );
      if (change.errorMessage) {
        throw new Error(
          `Unable to deny task: ${this.value.taskId}: ${change.errorMessage}`,
        );
      }
      this.value.status = change.status;
      this.setCanApprove(false);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  *calculateApprovalRights(token: string | undefined): GeneratorFn<void> {
    this.canApprove = undefined;
    try {
      const rawTasks = (yield this.state.lakehouseServerClient.getPendingTasks(
        TEST_USER,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = deserialize(V1_pendingTasksRespondModelSchema, rawTasks);
      const allTasks = [...tasks.dataOwner, ...tasks.privilegeManager];
      const canApprove = Boolean(
        allTasks.find((e) => e.taskId === this.value.taskId),
      );
      this.setCanApprove(canApprove);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  *fetchContract(token: string | undefined): GeneratorFn<void> {
    try {
      const contractId = this.value.dataContractId;
      const dataContracts =
        (yield this.state.lakehouseServerClient.getDataContract(
          contractId,
          token,
        )) as PlainObject<V1_DataContractsRecord>;

      const dataContract = deserialize(
        V1_DataContractsRecordModelSchema,
        dataContracts,
      ).dataContracts[0]?.dataContract;
      this.dataContract = dataContract;
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  get taskDetails(): GridItemDetail[] {
    return [
      {
        name: 'Task ID',
        value: this.value.taskId,
      },
      {
        name: 'Task Status',
        value: this.value.status.toString(),
      },
      {
        name: 'Task Consumer',
        value: this.value.consumer,
      },
      ...(this.dataContract ? buildDataContractDetail(this.dataContract) : []),
    ];
  }
}

export class LakehouseEntitlementsStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseServerClient: LakehouseContractServerClient;
  tasks: ContractUserEventState[] | undefined;
  fetchingTasks = ActionState.create();
  // TODO: make current rendering more robust
  currentTask: ContractUserEventState | undefined;
  currentDataContract: DataContractState | undefined;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    makeObservable(this, {
      init: flow,
      initWithId: flow,
      initWithContract: flow,
      currentTask: observable,
      fetchingTasks: observable,
      currentDataContract: observable,
      tasks: observable,
      setTasks: action,
      setDataContract: action,
      clear: action,
    });
  }

  setTasks(val: ContractUserEventState[] | undefined): void {
    this.tasks = val;
  }

  setCurrentTask(val: ContractUserEventState | undefined): void {
    this.currentTask = val;
  }

  setDataContract(val: DataContractState | undefined): void {
    this.currentDataContract = val;
  }

  clear(): void {
    this.setCurrentTask(undefined);
    this.setTasks(undefined);
    this.setDataContract(undefined);
  }

  *init(
    taskId: string | undefined,
    contractId: string | undefined,
    token: string | undefined,
  ): GeneratorFn<void> {
    this.clear();
    if (taskId) {
      flowResult(this.initWithId(taskId, token)).catch(
        this.applicationStore.alertUnhandledError,
      );
      return;
    } else if (contractId) {
      flowResult(this.initWithContract(contractId, token)).catch(
        this.applicationStore.alertUnhandledError,
      );
      return;
    }
    try {
      this.fetchingTasks.inProgress();
      const rawTasks = (yield this.lakehouseServerClient.getPendingTasks(
        TEST_USER,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = deserialize(V1_pendingTasksRespondModelSchema, rawTasks);
      this.setTasks(
        [...tasks.dataOwner, ...tasks.privilegeManager].map(
          (_contract) => new ContractUserEventState(_contract, this),
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.fetchingTasks.complete();
    }
  }

  *initWithId(taskId: string, token: string | undefined): GeneratorFn<void> {
    this.setTasks(undefined);
    try {
      this.fetchingTasks.inProgress();
      // TEMP: for now we will assume task id is in pending user.
      // Once 'getTaskId` is added in server we will use that to query task
      const rawTasks = (yield this.lakehouseServerClient.getPendingTasks(
        TEST_USER,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = deserialize(V1_pendingTasksRespondModelSchema, rawTasks);
      const allTasks = [...tasks.dataOwner, ...tasks.privilegeManager];
      const task = guaranteeNonNullable(
        allTasks.find((e) => e.taskId === taskId),
      );
      const currentTask = new ContractUserEventState(task, this);
      this.setCurrentTask(currentTask);
      flowResult(currentTask.init(token)).catch(
        this.applicationStore.alertUnhandledError,
      );
    } catch (error) {
      assertErrorThrown(error);
      // TODO: show user error
    } finally {
      this.fetchingTasks.complete();
    }
  }

  *initWithContract(id: string, token: string | undefined): GeneratorFn<void> {
    try {
      const dataContracts = (yield this.lakehouseServerClient.getDataContract(
        id,
        token,
      )) as PlainObject<V1_DataContractsRecord>;

      const dataContract = deserialize(
        V1_DataContractsRecordModelSchema,
        dataContracts,
      ).dataContracts[0]?.dataContract;
      const contract = guaranteeNonNullable(
        dataContract,
        'Data Contract not found',
      );
      this.currentDataContract = new DataContractState(contract, this);
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}
