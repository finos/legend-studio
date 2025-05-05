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
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_ContractUserEventRecord,
  type V1_TaskStatusChangeResponse,
  V1_TaskStatusChangeResponseModelSchema,
  type V1_PendingTasksRespond,
  type V1_UserPendingContractsRecord,
  type V1_UserPendingContractsResponse,
  type V1_TaskStatus,
  V1_pendingTasksRespondModelSchema,
} from '@finos/legend-graph';
import { makeObservable, flow, observable, action } from 'mobx';
import {
  TEST_USER,
  TEST_USER2,
  type LakehouseEntitlementsStore,
} from './LakehouseEntitlementsStore.js';
import { LakehouseViewerState } from './LakehouseViewerState.js';

export class LakehousePendingTasksViewer extends LakehouseViewerState {
  tasks: V1_ContractUserEventRecord[] | undefined;
  pendingContracts: V1_UserPendingContractsRecord[] | undefined;
  changingState = ActionState.create();

  constructor(state: LakehouseEntitlementsStore) {
    super(state);
    makeObservable(this, {
      tasks: observable,
      setTasks: action,
      changingState: observable,
      pendingContracts: observable,
      initializationState: observable,
      approve: flow,
      setPendingTasks: action,
      init: flow,
      deny: flow,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.setPendingTasks(undefined);
      this.setTasks(undefined);
      const rawTasks = (yield this.state.lakehouseServerClient.getPendingTasks(
        TEST_USER,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;

      const pendingContracts =
        (yield this.state.lakehouseServerClient.getPendingContracts(
          TEST_USER2,
          token,
        )) as V1_UserPendingContractsResponse;
      this.setPendingTasks(pendingContracts.records ?? []);
      const tasks = deserialize(V1_pendingTasksRespondModelSchema, rawTasks);
      this.setTasks([...tasks.dataOwner, ...tasks.privilegeManager]);
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  setTasks(val: V1_ContractUserEventRecord[] | undefined): void {
    this.tasks = val;
  }

  setPendingTasks(val: V1_UserPendingContractsRecord[] | undefined): void {
    this.pendingContracts = val;
  }

  *approve(
    task: V1_ContractUserEventRecord,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.changingState.inProgress();
      this.changingState.setMessage('Approving Task');
      const response = (yield this.state.lakehouseServerClient.approveTask(
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
      this.setTasks([...(this.tasks ?? [])]);
    } catch (error) {
      assertErrorThrown(error);
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
      this.changingState.setMessage('Denying Task');
      const response = (yield this.state.lakehouseServerClient.denyTaskTask(
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
      this.setTasks([...(this.tasks ?? [])]);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.changingState.complete();
      this.changingState.setMessage(undefined);
    }
  }
}
