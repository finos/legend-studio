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
  type V1_DataContractsRecord,
  V1_pendingTasksRespondModelSchema,
  V1_DataContractsRecordModelSchema,
} from '@finos/legend-graph';
import { makeObservable, flow, observable, flowResult, action } from 'mobx';
import { DataContractState } from './DataContractState.js';
import { LakehouseEntitlementsMainViewState } from './LakehouseEntitlementsMainViewState.js';
import { DataContractTaskState } from './DataContractTaskState.js';
import type { LakehouseViewerState } from './LakehouseViewerState.js';

export const TEST_USER = undefined;
export const TEST_USER2 = undefined;

export type GridItemDetail = {
  name: string;
  value: string | number;
  onClick?: () => void;
};

export class LakehouseEntitlementsStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseServerClient: LakehouseContractServerClient;
  initializationState = ActionState.create();
  currentViewer: LakehouseViewerState | undefined;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    makeObservable(this, {
      init: flow,
      initWithTaskId: flow,
      initWithContract: flow,
      currentViewer: observable,
      setCurrentViewer: action,
    });
  }

  setCurrentViewer(val: LakehouseViewerState | undefined): void {
    this.currentViewer = val;
  }

  *init(
    taskId: string | undefined,
    contractId: string | undefined,
    token: string | undefined,
  ): GeneratorFn<void> {
    if (taskId) {
      flowResult(this.initWithTaskId(taskId, token)).catch(
        this.applicationStore.alertUnhandledError,
      );
      return;
    } else if (contractId) {
      flowResult(this.initWithContract(contractId, token)).catch(
        this.applicationStore.alertUnhandledError,
      );
      return;
    }
    // TODO: similiar logic should be used above ^
    const currentViewer = new LakehouseEntitlementsMainViewState(this);
    this.setCurrentViewer(currentViewer);
    currentViewer.init(token);
  }

  *initWithTaskId(
    taskId: string,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
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
      const currentTask = new DataContractTaskState(task, this);
      this.setCurrentViewer(currentTask);
      flowResult(currentTask.init(token)).catch(
        this.applicationStore.alertUnhandledError,
      );
    } catch (error) {
      assertErrorThrown(error);
      // TODO: show user error
    } finally {
      this.initializationState.complete();
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
      this.setCurrentViewer(new DataContractState(contract, this));
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}
