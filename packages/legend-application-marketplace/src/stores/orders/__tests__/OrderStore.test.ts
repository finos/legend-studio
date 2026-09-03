/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { flowResult } from 'mobx';
import { LegendUser } from '@finos/legend-shared';
import {
  OrderSearchStatus,
  type TerminalProductOrder,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../LegendMarketplaceBaseStore.js';
import { OrdersStore, type OrderSearchFormValues } from '../OrderStore.js';

const makeOrder = (orderId: string): TerminalProductOrder =>
  ({
    order_id: orderId,
    ordered_by: 'adishar',
    ordered_by_name: 'A. Dishar',
    ordered_for: 'adishar',
    ordered_for_name: 'A. Dishar',
    created_at: '2026-06-01T10:00:00',
    updated_at: '2026-06-02T09:00:00',
    order_cost: 100,
    order_category: 'TERMINAL',
    order_type: 'PROVISION',
    bbg_terminal_flag: false,
    vendor_profile_id: 1,
    vendor_profile_name: 'Bloomberg',
    permid: null,
    vendor_name: 'Bloomberg',
    reason_code_id: 1,
    business_justification: 'New User',
    status: 'APPROVED',
    service_pricing_items: [],
  }) as unknown as TerminalProductOrder;

const buildMockBaseStore = (): {
  baseStore: LegendMarketplaceBaseStore;
  searchOrders: jest.Mock;
  notifyError: jest.Mock;
  notifyWarning: jest.Mock;
} => {
  const searchOrders = jest.fn();
  const notifyError = jest.fn();
  const notifyWarning = jest.fn();

  const baseStore = {
    applicationStore: {
      identityService: { currentUser: 'adishar' },
      notificationService: {
        notifyError,
        notifyWarning,
        notifySuccess: jest.fn(),
      },
      logService: { error: jest.fn() },
    },
    marketplaceServerClient: {
      searchOrders,
      fetchOrders: jest.fn(),
      cancelOrder: jest.fn(),
    },
  } as unknown as LegendMarketplaceBaseStore;

  return { baseStore, searchOrders, notifyError, notifyWarning };
};

describe('OrdersStore - advanced order search', () => {
  let baseStore: LegendMarketplaceBaseStore;
  let searchOrders: jest.Mock;
  let notifyError: jest.Mock;
  let notifyWarning: jest.Mock;
  let ordersStore: OrdersStore;

  beforeEach(() => {
    ({ baseStore, searchOrders, notifyError, notifyWarning } =
      buildMockBaseStore());
    ordersStore = new OrdersStore(baseStore);
  });

  test('isAdvancedSearchActive is false and currentOrders/currentFetchState fall back to tab state before any search', () => {
    expect(ordersStore.isAdvancedSearchActive).toBe(false);
    expect(ordersStore.currentOrders).toBe(ordersStore.openOrders);
    expect(ordersStore.currentFetchState).toBe(
      ordersStore.fetchOpenOrdersState,
    );
  });

  test('rejects the search and shows a warning when neither Ordered By nor Ordered For is set', async () => {
    const filters: OrderSearchFormValues = {
      orderedBy: undefined,
      orderedFor: undefined,
      status: OrderSearchStatus.ALL,
      lastDays: undefined,
    };

    await flowResult(ordersStore.searchOrders(filters));

    expect(searchOrders).not.toHaveBeenCalled();
    expect(notifyWarning).toHaveBeenCalledTimes(1);
    expect(ordersStore.isAdvancedSearchActive).toBe(false);
  });

  test('searches with the provided filters, applying the default last_days/limit/offset', async () => {
    searchOrders.mockResolvedValue({
      orders: [makeOrder('1'), makeOrder('2')],
      total_count: 2,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });

    const filters: OrderSearchFormValues = {
      orderedBy: new LegendUser('adishar', 'A. Dishar'),
      orderedFor: undefined,
      status: OrderSearchStatus.PENDING_APPROVAL,
      lastDays: undefined,
    };

    await flowResult(ordersStore.searchOrders(filters));

    expect(searchOrders).toHaveBeenCalledWith({
      ordered_by: 'adishar',
      status: OrderSearchStatus.PENDING_APPROVAL,
      last_days: 365,
      limit: 100,
      offset: 0,
    });
    expect(ordersStore.isAdvancedSearchActive).toBe(true);
    expect(ordersStore.searchResults).toHaveLength(2);
    expect(ordersStore.searchTotalCount).toBe(2);
    expect(ordersStore.currentOrders).toBe(ordersStore.searchResults);
    expect(ordersStore.currentFetchState).toBe(ordersStore.searchOrdersState);
    expect(ordersStore.appliedSearchFilters).toEqual({
      orderedByLabel: 'A. Dishar',
      orderedForLabel: undefined,
      status: OrderSearchStatus.PENDING_APPROVAL,
      lastDays: 365,
      isLastDaysDefaulted: true,
    });
  });

  test('sends an explicit last_days value when provided and marks it as not defaulted', async () => {
    searchOrders.mockResolvedValue({
      orders: [],
      total_count: 0,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });

    await flowResult(
      ordersStore.searchOrders({
        orderedBy: undefined,
        orderedFor: new LegendUser('bsmith'),
        status: OrderSearchStatus.ALL,
        lastDays: 30,
      }),
    );

    expect(searchOrders).toHaveBeenCalledWith({
      ordered_for: 'bsmith',
      status: OrderSearchStatus.ALL,
      last_days: 30,
      limit: 100,
      offset: 0,
    });
    expect(ordersStore.appliedSearchFilters?.isLastDaysDefaulted).toBe(false);
    expect(ordersStore.appliedSearchFilters?.lastDays).toBe(30);
  });

  test('notifies an error and leaves advanced search inactive when the API call fails', async () => {
    searchOrders.mockRejectedValue(new Error('Failed to search orders: 500'));

    await flowResult(
      ordersStore.searchOrders({
        orderedBy: new LegendUser('adishar'),
        orderedFor: undefined,
        status: OrderSearchStatus.ALL,
        lastDays: undefined,
      }),
    );

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(ordersStore.isAdvancedSearchActive).toBe(false);
    expect(ordersStore.searchOrdersState.hasFailed).toBe(true);
  });

  test('clearSearch resets advanced search state back to the default tab-based view', async () => {
    searchOrders.mockResolvedValue({
      orders: [makeOrder('1')],
      total_count: 1,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });
    await flowResult(
      ordersStore.searchOrders({
        orderedBy: new LegendUser('adishar'),
        orderedFor: undefined,
        status: OrderSearchStatus.ALL,
        lastDays: undefined,
      }),
    );
    expect(ordersStore.isAdvancedSearchActive).toBe(true);

    ordersStore.clearSearch();

    expect(ordersStore.isAdvancedSearchActive).toBe(false);
    expect(ordersStore.searchResults).toHaveLength(0);
    expect(ordersStore.searchTotalCount).toBe(0);
    expect(ordersStore.appliedSearchFilters).toBeUndefined();
    expect(ordersStore.currentOrders).toBe(ordersStore.openOrders);
    expect(ordersStore.searchOffset).toBe(0);
  });
});

describe('OrdersStore - advanced order search pagination', () => {
  let baseStore: LegendMarketplaceBaseStore;
  let searchOrders: jest.Mock;
  let ordersStore: OrdersStore;
  const filters: OrderSearchFormValues = {
    orderedBy: new LegendUser('adishar'),
    orderedFor: undefined,
    status: OrderSearchStatus.ALL,
    lastDays: undefined,
  };

  beforeEach(() => {
    ({ baseStore, searchOrders } = buildMockBaseStore());
    ordersStore = new OrdersStore(baseStore);
  });

  test('hasPreviousSearchPage/hasNextSearchPage are false before any search', () => {
    expect(ordersStore.hasPreviousSearchPage).toBe(false);
    expect(ordersStore.hasNextSearchPage).toBe(false);
  });

  test('hasNextSearchPage is true when a full page is returned, false for a partial page', async () => {
    searchOrders.mockResolvedValueOnce({
      orders: Array.from({ length: 100 }, (_, i) => makeOrder(String(i))),
      total_count: 100,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });
    await flowResult(ordersStore.searchOrders(filters));
    expect(ordersStore.hasNextSearchPage).toBe(true);
    expect(ordersStore.hasPreviousSearchPage).toBe(false);

    searchOrders.mockResolvedValueOnce({
      orders: [makeOrder('a')],
      total_count: 1,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 100,
    });
    await flowResult(ordersStore.goToSearchOffset(100));
    expect(ordersStore.hasNextSearchPage).toBe(false);
    expect(ordersStore.hasPreviousSearchPage).toBe(true);
    expect(ordersStore.searchOffset).toBe(100);
  });

  test('goToSearchOffset re-issues the last search with the new offset', async () => {
    searchOrders.mockResolvedValue({
      orders: [makeOrder('1')],
      total_count: 1,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });
    await flowResult(ordersStore.searchOrders(filters));
    searchOrders.mockClear();

    await flowResult(ordersStore.goToSearchOffset(100));

    expect(searchOrders).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 100, limit: 100 }),
    );
    expect(ordersStore.searchOffset).toBe(100);
  });

  test('goToSearchOffset is a no-op when no search has been submitted yet', async () => {
    await flowResult(ordersStore.goToSearchOffset(100));
    expect(searchOrders).not.toHaveBeenCalled();
  });

  test('setSearchPageSize updates the page size and re-searches from offset 0 when a search is active', async () => {
    searchOrders.mockResolvedValue({
      orders: [makeOrder('1')],
      total_count: 1,
      status_filter: OrderSearchStatus.ALL,
      limit: 100,
      offset: 0,
    });
    await flowResult(ordersStore.searchOrders(filters));
    await flowResult(ordersStore.goToSearchOffset(100));
    searchOrders.mockClear();

    await flowResult(ordersStore.setSearchPageSize(25));

    expect(ordersStore.searchPageSize).toBe(25);
    expect(searchOrders).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 25 }),
    );
    expect(ordersStore.searchOffset).toBe(0);
  });

  test('setSearchPageSize updates the page size without searching when no search is active', async () => {
    await flowResult(ordersStore.setSearchPageSize(25));

    expect(ordersStore.searchPageSize).toBe(25);
    expect(searchOrders).not.toHaveBeenCalled();
  });
});
