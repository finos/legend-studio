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
  type V1_PendingTasksRespond,
  type V1_DataContract,
  type V1_TaskMetadata,
  V1_deserializeTaskResponse,
} from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-marketplace';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { DataProductViewerState } from '../DataProductViewerState.js';

export class EntitlementsDataContractViewerState {
  readonly dataProductViewerState: DataProductViewerState;
  readonly value: V1_DataContract;
  readonly lakeServerClient: LakehouseContractServerClient;
  associatedTasks: V1_TaskMetadata[] | undefined;
  initializationState = ActionState.create();

  constructor(
    dataProductViewerState: DataProductViewerState,
    lakeServerClient: LakehouseContractServerClient,
  ) {
    this.dataProductViewerState = dataProductViewerState;
    this.value = guaranteeNonNullable(
      dataProductViewerState.dataContract,
      'Unable to show data contract. No data contract selected',
    );
    this.lakeServerClient = lakeServerClient;
    makeObservable(this, {
      associatedTasks: observable,
      setAssociatedTasks: action,
      init: flow,
    });
  }

  setAssociatedTasks(associatedTasks: V1_TaskMetadata[] | undefined): void {
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
      this.setAssociatedTasks(tasks);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }
}
