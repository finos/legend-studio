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
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  type V1_DataSubscription,
  type V1_DataSubscriptionResponse,
  type V1_DataSubscriptionTarget,
  V1_CreateSubscriptionInput,
  V1_CreateSubscriptionInputModelSchema,
  V1_dataSubscriptionModelSchema,
  V1_DataSubscriptionResponseModelSchema,
} from '@finos/legend-graph';
import { makeObservable, flow, action, observable } from 'mobx';

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
      subscriptions: observable,
      init: flow,
      setSubscriptions: action,
      createSubscription: action,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    try {
      this.initializationState.inProgress();
      const rawSubscriptions =
        (yield this.lakehouseServerClient.getAllSubscriptions(
          token,
        )) as V1_DataSubscriptionResponse;
      const subscriptions = rawSubscriptions.subscriptions?.map(
        (rawSubscription) =>
          deserialize(V1_dataSubscriptionModelSchema, rawSubscription),
      );
      this.setSubscriptions(subscriptions ?? []);
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

  async createSubscription(
    contractId: string,
    target: V1_DataSubscriptionTarget,
    token: string | undefined,
  ): Promise<V1_DataSubscription> {
    const input = new V1_CreateSubscriptionInput();
    input.contractId = contractId;
    input.target = target;
    const response = await this.lakehouseServerClient.createSubscription(
      serialize(V1_CreateSubscriptionInputModelSchema, input),
      token,
    );
    const subscription = guaranteeNonNullable(
      deserialize(V1_DataSubscriptionResponseModelSchema, response)
        .subscriptions?.[0],
      'No subsription returned from server',
    );
    return subscription;
  }
}
