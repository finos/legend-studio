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
  type V1_LiteDataContract,
  type V1_TaskMetadata,
  type V1_TaskResponse,
  V1_deserializeTaskResponse,
  V1_observe_LiteDataContract,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

export class EntitlementsDataContractViewerState {
  readonly value: V1_LiteDataContract;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly lakehouseContractServerClient:
    | LakehouseContractServerClient
    | undefined;
  associatedTasks: V1_TaskMetadata[] | undefined;
  initializationState = ActionState.create();

  constructor(
    dataContract: V1_LiteDataContract,
    applicationStore: GenericLegendApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient | undefined,
  ) {
    this.value = V1_observe_LiteDataContract(dataContract);
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    makeObservable(this, {
      value: observable,
      associatedTasks: observable,
      setAssociatedTasks: action,
      init: flow,
    });
  }

  setAssociatedTasks(associatedTasks: V1_TaskMetadata[] | undefined): void {
    this.associatedTasks = associatedTasks;
  }

  *init(token: string | undefined): GeneratorFn<void> {
    if (!this.lakehouseContractServerClient) {
      this.applicationStore.notificationService.notifyWarning(
        'Cannot initialize data contract viewer: lakehouse contract server client not configured',
      );
      return;
    }

    try {
      this.initializationState.inProgress();
      this.setAssociatedTasks(undefined);
      const pendingTasks =
        (yield this.lakehouseContractServerClient.getContractTasks(
          this.value.guid,
          token,
        )) as PlainObject<V1_TaskResponse>;
      const tasks = V1_deserializeTaskResponse(pendingTasks);
      this.setAssociatedTasks(tasks);
    } catch (error) {
      assertErrorThrown(error);
    } finally {
      this.initializationState.complete();
    }
  }
}
