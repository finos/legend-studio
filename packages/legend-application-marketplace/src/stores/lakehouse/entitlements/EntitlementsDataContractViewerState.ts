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
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { LakehouseContractServerClient } from '../../LakehouseContractServerClient.js';

export class EntitlementsDataContractViewerState {
  readonly value: V1_DataContract;
  readonly lakeServerClient: LakehouseContractServerClient;
  associatedTasks: V1_ContractUserEventRecord[] | undefined;
  initializationState = ActionState.create();

  constructor(
    value: V1_DataContract,
    lakeServerClient: LakehouseContractServerClient,
  ) {
    this.value = value;
    this.lakeServerClient = lakeServerClient;
    makeObservable(this, {
      associatedTasks: observable,
      setAssociatedTasks: action,
      init: flow,
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
      const pendingTasks = (yield this.lakeServerClient.getContractTasks(
        this.value.guid,
        token,
      )) as PlainObject<V1_PendingTasksRespond>;
      const tasks = V1_deserializeTaskResponse(pendingTasks);
      this.setAssociatedTasks(tasks.map((e) => e.rec));
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }
}
