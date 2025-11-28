/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { makeObservable, observable, action, flow, computed } from 'mobx';
import {
  LogEvent,
  type GeneratorFn,
  assertErrorThrown,
  ActionState,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  OrderStatusCategory,
  type TerminalProductOrder,
  type TerminalProductOrderResponse,
} from '@finos/legend-server-marketplace';

export class OrdersStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  openOrders: TerminalProductOrder[] = [];
  closedOrders: TerminalProductOrder[] = [];
  totalOpen = 0;
  totalClosed = 0;
  readonly fetchOpenOrdersState = ActionState.create();
  readonly fetchClosedOrdersState = ActionState.create();
  selectedTab: 'open' | 'closed' = 'open';

  constructor(baseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      openOrders: observable,
      closedOrders: observable,
      totalOpen: observable,
      totalClosed: observable,
      selectedTab: observable,
      setSelectedTab: action,
      fetchOpenOrders: flow,
      fetchClosedOrders: flow,
      currentOrders: computed,
      currentFetchState: computed,
    });
    this.baseStore = baseStore;
  }

  setSelectedTab(tab: 'open' | 'closed'): void {
    this.selectedTab = tab;
  }

  get currentOrders(): TerminalProductOrder[] {
    return this.selectedTab === 'open' ? this.openOrders : this.closedOrders;
  }

  get currentFetchState(): ActionState {
    return this.selectedTab === 'open'
      ? this.fetchOpenOrdersState
      : this.fetchClosedOrdersState;
  }

  *fetchOpenOrders(): GeneratorFn<void> {
    const user = this.baseStore.applicationStore.identityService.currentUser;

    if (!user) {
      return;
    }

    this.fetchOpenOrdersState.inProgress();
    try {
      const response: TerminalProductOrderResponse =
        (yield this.baseStore.marketplaceServerClient.fetchOrders(
          user,
          OrderStatusCategory.OPEN,
        )) as TerminalProductOrderResponse;

      this.openOrders = response.orders;
      this.totalOpen = response.total_count;
      this.fetchOpenOrdersState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Failed to fetch open orders: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to fetch open orders: ${error.message}`,
      );
      this.fetchOpenOrdersState.fail();
    }
  }

  *fetchClosedOrders(): GeneratorFn<void> {
    const user = this.baseStore.applicationStore.identityService.currentUser;

    if (!user) {
      return;
    }

    this.fetchClosedOrdersState.inProgress();
    try {
      const response =
        (yield this.baseStore.marketplaceServerClient.fetchOrders(
          user,
          OrderStatusCategory.CLOSED,
        )) as TerminalProductOrderResponse;

      this.closedOrders = response.orders;
      this.totalClosed = response.total_count;
      this.fetchClosedOrdersState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Failed to fetch closed orders: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to fetch closed orders: ${error.message}`,
      );
      this.fetchClosedOrdersState.fail();
    }
  }

  *refreshCurrentOrders(): GeneratorFn<void> {
    if (this.selectedTab === 'open') {
      yield* this.fetchOpenOrders();
    } else {
      yield* this.fetchClosedOrders();
    }
  }
}
