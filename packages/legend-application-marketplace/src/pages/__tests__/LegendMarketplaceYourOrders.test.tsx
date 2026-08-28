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

import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import {
  type TerminalProductOrder,
  type TerminalProductOrderResponse,
  OrderCategory,
  OrderStatus,
  OrderStatusCategory,
} from '@finos/legend-server-marketplace';
import type { PlainObject } from '@finos/legend-shared';
import { LegendMarketplaceYourOrders } from '../Profile/LegendMarketplaceYourOrders.js';
import { WorkflowCurrentStage } from '../../stores/orders/OrderHelpers.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const mockOrderWithUrl: TerminalProductOrder = {
  order_id: 'ORD-123',
  ordered_by: 'test-user',
  ordered_by_name: 'Test User',
  ordered_for: 'test-user',
  ordered_for_name: 'Test User',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  order_cost: 2000,
  order_category: OrderCategory.TERMINAL,
  order_type: 'New',
  bbg_terminal_flag: true,
  vendor_profile_id: 1,
  vendor_profile_name: 'Bloomberg',
  permid: null,
  vendor_name: 'Bloomberg',
  reason_code_id: 1,
  business_justification: 'Business need',
  status: 'Pending Approval',
  service_pricing_items: [
    {
      entity_id: 1,
      entity_name: 'Bloomberg Terminal',
      entity_category: 'Terminal',
      entity_type: 'Standard',
      entity_cost: 2000,
    },
  ],
  workflow_details: {
    url_manager: 'https://workflow.example.com/order/123',
    piid_manager: 'proc-456',
    taskid_manager: 'task-456',
    manager_actioned_by: null,
    manager_actioned_by_name: null,
    manager_actioned_timestamp: null,
    manager_comment: null,
    manager_action: null,
    url_fa_approval: null,
    piid_fa_approval: null,
    taskid_fa_approval: null,
    fa_approval_actioned_by: null,
    fa_approval_actioned_by_name: null,
    fa_approval_actioned_timestamp: null,
    fa_approval_comment: null,
    fa_approval_action: null,
    url_ffa_approval: null,
    piid_ffa_approval: null,
    taskid_ffa_approval: null,
    ffa_approval_actioned_by: null,
    ffa_approval_actioned_by_name: null,
    ffa_approval_actioned_timestamp: null,
    ffa_approval_comment: null,
    ffa_approval_action: null,
    url_bbg_approval: null,
    bbg_approval_process_id: null,
    bbg_approval_actioned_by: null,
    bbg_approval_actioned_by_name: null,
    bbg_approval_actioned_timestamp: null,
    bbg_approval_comment: null,
    bbg_approval_action: null,
    rpm_ticket_id: null,
    rpm_comment: null,
    current_stage: WorkflowCurrentStage.DIRECT_MANAGER,
    workflow_status: OrderStatus.IN_PROGRESS,
    rpm_action: null,
  },
};

const mockOrderWithoutUrl: TerminalProductOrder = {
  order_id: 'ORD-456',
  ordered_by: 'test-user',
  ordered_by_name: 'Test User',
  ordered_for: 'test-user',
  ordered_for_name: 'Test User',
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-01-10T09:00:00Z',
  order_cost: 1500,
  order_category: OrderCategory.TERMINAL,
  order_type: 'New',
  bbg_terminal_flag: false,
  vendor_profile_id: 2,
  vendor_profile_name: 'Reuters',
  permid: null,
  vendor_name: 'Reuters',
  reason_code_id: 1,
  business_justification: 'Business need',
  status: 'Completed',
  service_pricing_items: [
    {
      entity_id: 2,
      entity_name: 'Reuters Terminal',
      entity_category: 'Terminal',
      entity_type: 'Basic',
      entity_cost: 1500,
    },
  ],
  workflow_details: {
    url_manager: '',
    piid_manager: 'proc-789',
    taskid_manager: 'task-789',
    manager_actioned_by: null,
    manager_actioned_by_name: null,
    manager_actioned_timestamp: null,
    manager_comment: null,
    manager_action: null,
    url_fa_approval: null,
    piid_fa_approval: null,
    taskid_fa_approval: null,
    fa_approval_actioned_by: null,
    fa_approval_actioned_by_name: null,
    fa_approval_actioned_timestamp: null,
    fa_approval_comment: null,
    fa_approval_action: null,
    url_ffa_approval: null,
    piid_ffa_approval: null,
    taskid_ffa_approval: null,
    ffa_approval_actioned_by: null,
    ffa_approval_actioned_by_name: null,
    ffa_approval_actioned_timestamp: null,
    ffa_approval_comment: null,
    ffa_approval_action: null,
    url_bbg_approval: null,
    bbg_approval_process_id: null,
    bbg_approval_actioned_by: null,
    bbg_approval_actioned_by_name: null,
    bbg_approval_actioned_timestamp: null,
    bbg_approval_comment: null,
    bbg_approval_action: null,
    rpm_ticket_id: null,
    rpm_comment: null,
    current_stage: WorkflowCurrentStage.DIRECT_MANAGER,
    workflow_status: OrderStatus.COMPLETED,
    rpm_action: null,
  },
};

beforeEach(() => {
  localStorage.clear();
});

// ─── Shared render helper ───────────────────────────────────────────────────
//
// These tests render `LegendMarketplaceYourOrders` directly (rather than through
// the full app router) since `useLegendMarketplaceBaseStore` is already mocked
// by `TEST__provideMockLegendMarketplaceBaseStore`, and the component itself is
// not behind any auth wrapper - only the route is.

const makeBloombergOrder = (
  overrides: Partial<TerminalProductOrder> = {},
): TerminalProductOrder => ({
  ...mockOrderWithUrl,
  order_id: 'ORD-123',
  ordered_by_name: 'Alice Anderson',
  vendor_name: 'Bloomberg',
  service_pricing_items: [
    {
      entity_id: 1,
      entity_name: 'Bloomberg Terminal',
      entity_category: 'Terminal',
      entity_type: 'Standard',
      entity_cost: 2000,
    },
  ],
  ...overrides,
});

const makeReutersOrder = (
  overrides: Partial<TerminalProductOrder> = {},
): TerminalProductOrder => ({
  ...mockOrderWithoutUrl,
  order_id: 'ORD-456',
  ordered_by_name: 'Bob Brown',
  vendor_name: 'Reuters',
  service_pricing_items: [
    {
      entity_id: 2,
      entity_name: 'Reuters Terminal',
      entity_category: 'Terminal',
      entity_type: 'Basic',
      entity_cost: 1500,
    },
  ],
  ...overrides,
});

const renderYourOrdersPage = async (
  openOrders: TerminalProductOrder[] = [],
) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();

  const mockVisitAddress = jest.fn();
  jest
    .spyOn(
      MOCK__baseStore.applicationStore.navigationService.navigator,
      'visitAddress',
    )
    .mockImplementation(mockVisitAddress);

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'fetchOrders',
  ).mockImplementation(
    async (
      _user: string,
      category: OrderStatusCategory = OrderStatusCategory.OPEN,
    ): Promise<PlainObject<TerminalProductOrderResponse>> => ({
      orders: category === OrderStatusCategory.OPEN ? openOrders : [],
      total_count:
        category === OrderStatusCategory.OPEN ? openOrders.length : 0,
      status_filter: category,
      kerberos: 'test-user',
    }),
  );

  await act(async () => {
    render(<LegendMarketplaceYourOrders />);
  });

  return { MOCK__baseStore, mockVisitAddress };
};

describe('LegendMarketplaceYourOrders - Track Order Button', () => {
  // An open order (workflow still in progress) with no tracking URL available
  // for its current stage - distinct from `makeReutersOrder`'s base fixture,
  // which represents a completed order.
  const makeOpenOrderWithoutUrl = (): TerminalProductOrder =>
    makeReutersOrder({
      workflow_details: {
        ...mockOrderWithoutUrl.workflow_details,
        workflow_status: OrderStatus.IN_PROGRESS,
        current_stage: WorkflowCurrentStage.DIRECT_MANAGER,
      },
    });

  test('renders Track Order button and calls navigationService when clicked', async () => {
    const { mockVisitAddress } = await renderYourOrdersPage([
      makeBloombergOrder(),
    ]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });
    expect(trackOrderButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(trackOrderButton);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      'https://workflow.example.com/order/123',
    );
    expect(mockVisitAddress).toHaveBeenCalledTimes(1);
  });

  test('Track Order button is disabled when url_manager is not available', async () => {
    await renderYourOrdersPage([makeOpenOrderWithoutUrl()]);
    await waitFor(() => screen.getByText('Reuters Terminal'));

    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });

    expect(trackOrderButton.hasAttribute('disabled')).toBe(true);
  });

  test('Track Order button is enabled when url_manager is available', async () => {
    await renderYourOrdersPage([makeBloombergOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });

    expect(trackOrderButton.hasAttribute('disabled')).toBe(false);
  });

  test('handles multiple orders with mixed url availability', async () => {
    const { mockVisitAddress } = await renderYourOrdersPage([
      makeBloombergOrder(),
      makeOpenOrderWithoutUrl(),
    ]);

    await waitFor(() => screen.getByText('Bloomberg Terminal'));
    await waitFor(() => screen.getByText('Reuters Terminal'));

    const trackOrderButtons = screen.getAllByRole('button', {
      name: /Track Order/i,
    });

    expect(trackOrderButtons).toHaveLength(2);
    expect(trackOrderButtons[0]?.hasAttribute('disabled')).toBe(false);
    expect(trackOrderButtons[1]?.hasAttribute('disabled')).toBe(true);

    if (trackOrderButtons[0]) {
      fireEvent.click(trackOrderButtons[0]);
    }

    expect(mockVisitAddress).toHaveBeenCalledTimes(1);
    expect(mockVisitAddress).toHaveBeenCalledWith(
      'https://workflow.example.com/order/123',
    );
  });
});

describe('LegendMarketplaceYourOrders - search', () => {
  test('filters orders by order id', async () => {
    await renderYourOrdersPage([makeBloombergOrder(), makeReutersOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));
    expect(screen.getByText('Reuters Terminal')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'ORD-123' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Reuters Terminal')).toBeNull(),
    );
    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
  });

  test('filters orders by ordered-by name', async () => {
    await renderYourOrdersPage([makeBloombergOrder(), makeReutersOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'brown' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Bloomberg Terminal')).toBeNull(),
    );
    expect(screen.getByText('Reuters Terminal')).toBeDefined();
  });

  test('filters orders by service pricing item entity name', async () => {
    await renderYourOrdersPage([makeBloombergOrder(), makeReutersOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'reuters terminal' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Bloomberg Terminal')).toBeNull(),
    );
    expect(screen.getByText('Reuters Terminal')).toBeDefined();
  });

  test('search is case-insensitive and matches on partial text', async () => {
    await renderYourOrdersPage([makeBloombergOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'BLOOM' },
    });

    await waitFor(() =>
      expect(screen.getByText('Bloomberg Terminal')).toBeDefined(),
    );
  });

  test('shows a "no orders match your search" empty state when nothing matches', async () => {
    await renderYourOrdersPage([makeBloombergOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'nonexistent-order' },
    });

    await waitFor(() =>
      expect(screen.getByText('No orders match your search')).toBeDefined(),
    );
    expect(
      screen.getByText('Try adjusting your search terms and try again.'),
    ).toBeDefined();
  });

  test('clear button appears once text is entered and clears the search term', async () => {
    await renderYourOrdersPage([makeBloombergOrder(), makeReutersOrder()]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    expect(screen.queryByLabelText('Clear search')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search Your Orders'), {
      target: { value: 'ORD-123' },
    });

    const clearButton = await waitFor(() =>
      screen.getByLabelText('Clear search'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Reuters Terminal')).toBeNull(),
    );

    fireEvent.click(clearButton);

    await waitFor(() =>
      expect(screen.getByText('Reuters Terminal')).toBeDefined(),
    );
    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
  });
});

describe('LegendMarketplaceYourOrders - empty states', () => {
  test('shows default (no-search) empty state when there are no open orders', async () => {
    await renderYourOrdersPage([]);

    await waitFor(() =>
      expect(screen.getByText('No active orders found')).toBeDefined(),
    );
    expect(
      screen.getByText(
        "You don't have any orders in progress. Start shopping to place your first order!",
      ),
    ).toBeDefined();
  });
});

describe('LegendMarketplaceYourOrders - copy order id', () => {
  test('copies the order id to clipboard and shows a success notification', async () => {
    const { MOCK__baseStore } = await renderYourOrdersPage([
      makeBloombergOrder(),
    ]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    const copySpy = jest
      .spyOn(
        MOCK__baseStore.applicationStore.clipboardService,
        'copyTextToClipboard',
      )
      .mockResolvedValue(undefined);
    const notifySuccessSpy = jest.spyOn(
      MOCK__baseStore.applicationStore.notificationService,
      'notifySuccess',
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy Order ID'));
    });

    await waitFor(() => expect(copySpy).toHaveBeenCalledWith('ORD-123'));
    expect(notifySuccessSpy).toHaveBeenCalledWith(
      'Order ID copied to clipboard',
      undefined,
      2500,
    );
  });

  test('surfaces clipboard failures via alertUnhandledError instead of failing silently', async () => {
    const { MOCK__baseStore } = await renderYourOrdersPage([
      makeBloombergOrder(),
    ]);
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    jest
      .spyOn(
        MOCK__baseStore.applicationStore.clipboardService,
        'copyTextToClipboard',
      )
      .mockRejectedValue(new Error('clipboard unavailable'));
    const alertSpy = jest.spyOn(
      MOCK__baseStore.applicationStore,
      'alertUnhandledError',
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy Order ID'));
    });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });
});
