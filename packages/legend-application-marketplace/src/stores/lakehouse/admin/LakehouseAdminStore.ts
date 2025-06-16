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

import type { LegendMarketplaceApplicationStore } from '../../LegendMarketplaceBaseStore.js';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { deserialize } from 'serializr';
import {
  type V1_DataSubscription,
  type V1_DataContract,
  V1_DataSubscriptionResponseModelSchema,
  V1_DataContractsRecordModelSchemaToContracts,
} from '@finos/legend-graph';
import { makeObservable, flow, action, observable } from 'mobx';
import type { LakehouseContractServerClient } from '@finos/legend-server-marketplace';

export class LakehouseAdminStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  subscriptionsInitializationState = ActionState.create();
  contractsInitializationState = ActionState.create();
  subscriptions: V1_DataSubscription[] = [];
  contracts: V1_DataContract[] = [];

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseContractServerClient: LakehouseContractServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseContractServerClient;
    makeObservable(this, {
      subscriptions: observable,
      contracts: observable,
      init: flow,
      setSubscriptions: action,
      setContracts: action,
    });
  }

  *init(token: string | undefined): GeneratorFn<void> {
    const fetchSubscriptions = async (): Promise<void> => {
      try {
        this.subscriptionsInitializationState.inProgress();
        const rawSubscriptions =
          await this.lakehouseContractServerClient.getAllSubscriptions(token);
        const subscriptions = deserialize(
          V1_DataSubscriptionResponseModelSchema,
          rawSubscriptions,
        ).subscriptions;
        this.setSubscriptions(subscriptions ?? []);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(
          `Error fetching subscriptions: ${error.message}`,
        );
      } finally {
        this.subscriptionsInitializationState.complete();
      }
    };

    const fetchContracts = async (): Promise<void> => {
      try {
        this.contractsInitializationState.inProgress();
        const rawContracts =
          await this.lakehouseContractServerClient.getDataContracts(token);
        const contracts =
          V1_DataContractsRecordModelSchemaToContracts(rawContracts);
        this.setContracts(contracts);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(
          `Error fetching data contracts: ${error.message}`,
        );
      } finally {
        this.contractsInitializationState.complete();
      }
    };

    yield Promise.all([fetchSubscriptions(), fetchContracts()]);
  }

  setSubscriptions(val: V1_DataSubscription[]): void {
    this.subscriptions = val;
  }

  setContracts(val: V1_DataContract[]): void {
    this.contracts = val;
  }
}
