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
  type V1_ContractUserEventRecord,
  type V1_PendingTasksRespond,
  type V1_DataContract,
  V1_deserializeTaskResponse,
} from '@finos/legend-graph';
import { type LakehouseEntitlementsStore } from './LakehouseEntitlementsStore.js';
import { LakehouseViewerState } from './LakehouseViewerState.js';
import {
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  buildDataContractDetail,
  buildTaskGridItemDetail,
  convertMutilGridItemDetail,
  type GridItemDetail,
} from '../LakehouseUtils.js';

export class EntitlementsDataContractViewerState extends LakehouseViewerState {
  readonly value: V1_DataContract;
  associatedTasks: V1_ContractUserEventRecord[] | undefined;

  constructor(value: V1_DataContract, state: LakehouseEntitlementsStore) {
    super(state);
    this.value = value;
    makeObservable(this, {
      associatedTasks: observable,
      setAssociatedTasks: action,
      init: flow,
      tasksDetails: computed,
    });
  }

  get contractDetails(): GridItemDetail[] {
    return [
      ...buildDataContractDetail(this.value, {
        openDirectoryHandler: this.state.directoryCallBack,
        openApplicationIdHandler: this.state.applicationCallBack,
      }),
      ...this.tasksDetails,
    ];
  }

  get tasksDetails(): GridItemDetail[] {
    return convertMutilGridItemDetail(
      this.associatedTasks?.map((task) =>
        buildTaskGridItemDetail(
          task,
          [],
          undefined,
          undefined,
          this.state.directoryCallBack,
          this.state.applicationCallBack,
        ),
      ) ?? [],
    ).map((e) => {
      e.name = `Contract ${e.name}`;
      return e;
    });
  }

  setAssociatedTasks(
    associatedTasks: V1_ContractUserEventRecord[] | undefined,
  ): void {
    this.associatedTasks = associatedTasks;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      this.setAssociatedTasks(undefined);
      const pendingContracts =
        (yield this.state.lakehouseServerClient.getContractTasks(
          this.value.guid,
          token,
        )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = V1_deserializeTaskResponse(pendingContracts);
      this.setAssociatedTasks(tasks.map((e) => e.rec));
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }
}
