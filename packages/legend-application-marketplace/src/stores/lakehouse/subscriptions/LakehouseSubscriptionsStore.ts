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
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_DataSubscription,
  V1_dataSubscriptionModelSchema,
} from '@finos/legend-graph';
import { makeObservable, flow, action } from 'mobx';

export class LakehouseSubscriptionsStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseServerClient: LakehouseContractServerClient;
  initializationState = ActionState.create();
  subscriptions: V1_DataSubscription[] = [];

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    makeObservable(this, {
      init: flow,
      setSubscriptions: action,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      const rawSubscriptions =
        (yield this.lakehouseServerClient.getAllSubscriptions(
          token,
        )) as PlainObject<V1_DataSubscription>[];
      const subscriptions = rawSubscriptions.map((rawSubscription) =>
        deserialize(V1_dataSubscriptionModelSchema, rawSubscription),
      );
      this.setSubscriptions(subscriptions);
    } catch (error) {
      assertErrorThrown(error);
      // TODO: show user error
    } finally {
      this.initializationState.complete();
    }
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }
}
