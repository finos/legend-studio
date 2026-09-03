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
  type LegendUser,
  assertErrorThrown,
  ActionState,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  OrderStatusCategory,
  type OrderSearchStatus,
  type TerminalProductOrder,
  type TerminalProductOrderResponse,
  type OrderSearchRequest,
  type OrderSearchResponse,
} from '@finos/legend-server-marketplace';
import {
  getUserDisplayLabel,
  ORDER_SEARCH_DEFAULT_LAST_DAYS,
  ORDER_SEARCH_DEFAULT_LIMIT,
} from './OrderHelpers.js';

export enum OrderTab {
  OPEN = 'open',
  CLOSED = 'closed',
}

/** Input to `OrdersStore.searchOrders`, gathered from the advanced search form. */
export interface OrderSearchFormValues {
  orderedBy: LegendUser | undefined;
  orderedFor: LegendUser | undefined;
  status: OrderSearchStatus;
  lastDays: number | undefined;
}

/** A snapshot of the last-applied advanced search filters, kept for rendering the filter summary bar. */
export interface AppliedOrderSearchFilters {
  orderedByLabel: string | undefined;
  orderedForLabel: string | undefined;
  status: OrderSearchStatus;
  lastDays: number;
  isLastDaysDefaulted: boolean;
}

export class OrdersStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  openOrders: TerminalProductOrder[] = [];
  closedOrders: TerminalProductOrder[] = [];
  totalOpen = 0;
  totalClosed = 0;
  readonly fetchOpenOrdersState = ActionState.create();
  readonly fetchClosedOrdersState = ActionState.create();
  readonly cancelOrderState = ActionState.create();
  selectedTab: OrderTab = OrderTab.OPEN;

  searchResults: TerminalProductOrder[] = [];
  searchTotalCount = 0;
  appliedSearchFilters: AppliedOrderSearchFilters | undefined = undefined;
  readonly searchOrdersState = ActionState.create();

  constructor(baseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      openOrders: observable,
      closedOrders: observable,
      totalOpen: observable,
      totalClosed: observable,
      selectedTab: observable,
      searchResults: observable,
      searchTotalCount: observable,
      appliedSearchFilters: observable,
      setSelectedTab: action,
      clearSearch: action,
      fetchOpenOrders: flow,
      fetchClosedOrders: flow,
      refreshCurrentOrders: flow,
      cancelOrder: flow,
      searchOrders: flow,
      currentOrders: computed,
      currentFetchState: computed,
      isAdvancedSearchActive: computed,
    });
    this.baseStore = baseStore;
  }

  setSelectedTab(tab: OrderTab): void {
    this.selectedTab = tab;
  }

  get isAdvancedSearchActive(): boolean {
    return this.appliedSearchFilters !== undefined;
  }

  get currentOrders(): TerminalProductOrder[] {
    if (this.isAdvancedSearchActive) {
      return this.searchResults;
    }
    return this.selectedTab === OrderTab.OPEN
      ? this.openOrders
      : this.closedOrders;
  }

  get currentFetchState(): ActionState {
    if (this.isAdvancedSearchActive) {
      return this.searchOrdersState;
    }
    return this.selectedTab === OrderTab.OPEN
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
    // Refresh both open and closed orders since cancelled orders move from open to closed
    yield Promise.all([this.fetchOpenOrders(), this.fetchClosedOrders()]);
  }

  *cancelOrder(
    orderId: string,
    processInstanceId: string,
    comments?: string,
  ): GeneratorFn<boolean> {
    const user = this.baseStore.applicationStore.identityService.currentUser;

    if (!user) {
      this.baseStore.applicationStore.notificationService.notifyError(
        'User not authenticated',
      );
      return false;
    }

    this.cancelOrderState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.cancelOrder({
        order_id: orderId,
        kerberos: user,
        comments: comments ?? '',
        process_instance_id: processInstanceId,
      });

      this.baseStore.applicationStore.notificationService.notifySuccess(
        `Order #${orderId} cancelled successfully`,
      );
      this.cancelOrderState.complete();

      // Refresh orders after successful cancellation
      this.refreshCurrentOrders();

      return true;
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.ORDER_CANCELLATION_FAILURE,
        ),
        `Failed to cancel order: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to cancel order: ${error.message}`,
      );
      this.cancelOrderState.fail();
      return false;
    }
  }

  *searchOrders(filters: OrderSearchFormValues): GeneratorFn<void> {
    const orderedById = filters.orderedBy?.id.trim();
    const orderedForId = filters.orderedFor?.id.trim();

    if (!orderedById && !orderedForId) {
      this.baseStore.applicationStore.notificationService.notifyWarning(
        'Enter a value for Ordered By and/or Ordered For to search.',
      );
      return;
    }

    const lastDays = filters.lastDays ?? ORDER_SEARCH_DEFAULT_LAST_DAYS;
    const request: OrderSearchRequest = {
      ...(orderedById ? { ordered_by: orderedById } : {}),
      ...(orderedForId ? { ordered_for: orderedForId } : {}),
      status: filters.status,
      last_days: lastDays,
      limit: ORDER_SEARCH_DEFAULT_LIMIT,
      offset: 0,
    };

    this.searchOrdersState.inProgress();
    try {
      const response =
        (yield this.baseStore.marketplaceServerClient.searchOrders(
          request,
        )) as OrderSearchResponse;

      this.searchResults = response.orders;
      this.searchTotalCount = response.total_count;
      this.appliedSearchFilters = {
        orderedByLabel: getUserDisplayLabel(filters.orderedBy),
        orderedForLabel: getUserDisplayLabel(filters.orderedFor),
        status: filters.status,
        lastDays,
        isLastDaysDefaulted: filters.lastDays === undefined,
      };
      this.searchOrdersState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(
          LEGEND_MARKETPLACE_APP_EVENT.ADVANCED_SEARCH_ORDERS_FAILURE,
        ),
        `Failed to search orders: ${error.message}`,
      );
      this.baseStore.applicationStore.notificationService.notifyError(
        `Failed to search orders: ${error.message}`,
      );
      this.searchOrdersState.fail();
    }
  }

  clearSearch(): void {
    this.searchResults = [];
    this.searchTotalCount = 0;
    this.appliedSearchFilters = undefined;
    this.searchOrdersState.reset();
  }
}
