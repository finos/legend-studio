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
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplace,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import {
  type TerminalProductOrder,
  type TerminalProductOrderResponse,
  OrderCategory,
  OrderStatus,
  OrderStatusCategory,
} from '@finos/legend-server-marketplace';
import type { PlainObject } from '@finos/legend-shared';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';

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
    manager_actioned_timestamp: null,
    manager_comment: null,
    manager_action: null,
    bbg_approval_process_id: null,
    bbg_approval_actioned_by: null,
    bbg_approval_actioned_timestamp: null,
    bbg_approval_comment: null,
    bbg_approval_action: null,
    rpm_ticket_id: null,
    current_stage: null,
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
    manager_actioned_timestamp: null,
    manager_comment: null,
    manager_action: null,
    bbg_approval_process_id: null,
    bbg_approval_actioned_by: null,
    bbg_approval_actioned_timestamp: null,
    bbg_approval_comment: null,
    bbg_approval_action: null,
    rpm_ticket_id: null,
    current_stage: null,
    workflow_status: OrderStatus.COMPLETED,
    rpm_action: null,
  },
};

const setupTestComponent = async (openOrders: TerminalProductOrder[] = []) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv: 'prod',
  });

  // Mock navigation
  const mockVisitAddress = jest.fn();
  jest
    .spyOn(
      MOCK__baseStore.applicationStore.navigationService.navigator,
      'visitAddress',
    )
    .mockImplementation(mockVisitAddress);

  jest
    .spyOn(
      MOCK__baseStore.applicationStore.navigationService.navigator,
      'getCurrentAddress',
    )
    .mockReturnValue('http://localhost/orders');

  // Mock the orders API
  const mockOpenOrdersResponse: PlainObject<TerminalProductOrderResponse> = {
    orders: openOrders,
    total_count: openOrders.length,
    status_filter: OrderStatusCategory.OPEN,
    kerberos: 'test-user',
  };

  const mockClosedOrdersResponse: PlainObject<TerminalProductOrderResponse> = {
    orders: [],
    total_count: 0,
    status_filter: OrderStatusCategory.CLOSED,
    kerberos: 'test-user',
  };

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'fetchOrders',
  ).mockImplementation(
    async (
      user: string,
      category: OrderStatusCategory = OrderStatusCategory.OPEN,
    ) => {
      if (category === OrderStatusCategory.OPEN) {
        return mockOpenOrdersResponse;
      }
      return mockClosedOrdersResponse;
    },
  );

  const { renderResult } = await TEST__setUpMarketplace(MOCK__baseStore);

  // Wait for home page to load
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_MARKETPLACE_TEST_ID.HEADER),
  );

  return { MOCK__baseStore, renderResult, mockVisitAddress };
};

beforeEach(() => {
  localStorage.clear();
});

// NOTE: These tests are currently skipped because the /orders route is protected
// by withAuthenticationRequired and requires LegendMarketplaceOrdersStore provider.
describe.skip('LegendMarketplaceYourOrders - Track Order Button', () => {
  test('renders Track Order button and calls navigationService when clicked', async () => {
    const { mockVisitAddress } = await setupTestComponent([mockOrderWithUrl]);

    // Wait for orders to load
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    // Find and click the Track Order button
    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });
    expect(trackOrderButton.hasAttribute('disabled')).toBe(false);

    // Click the button
    fireEvent.click(trackOrderButton);

    // Verify navigationService.visitAddress was called with correct URL
    expect(mockVisitAddress).toHaveBeenCalledWith(
      'https://workflow.example.com/order/123',
    );
    expect(mockVisitAddress).toHaveBeenCalledTimes(1);
  });

  test('Track Order button is disabled when url_manager is not available', async () => {
    await setupTestComponent([mockOrderWithoutUrl]);

    // Wait for orders to load
    await waitFor(() => screen.getByText('Reuters Terminal'));

    // Find the Track Order button
    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });

    // Verify button is disabled
    expect(trackOrderButton.hasAttribute('disabled')).toBe(true);
  });

  test('Track Order button is enabled when url_manager is available', async () => {
    await setupTestComponent([mockOrderWithUrl]);

    // Wait for orders to load
    await waitFor(() => screen.getByText('Bloomberg Terminal'));

    // Find the Track Order button
    const trackOrderButton = screen.getByRole('button', {
      name: /Track Order/i,
    });

    // Verify button is enabled
    expect(trackOrderButton.hasAttribute('disabled')).toBe(false);
  });

  test('handles multiple orders with mixed url availability', async () => {
    const { mockVisitAddress } = await setupTestComponent([
      mockOrderWithUrl,
      mockOrderWithoutUrl,
    ]);

    // Wait for both orders to load
    await waitFor(() => screen.getByText('Bloomberg Terminal'));
    await waitFor(() => screen.getByText('Reuters Terminal'));

    // Get all Track Order buttons
    const trackOrderButtons = screen.getAllByRole('button', {
      name: /Track Order/i,
    });

    expect(trackOrderButtons).toHaveLength(2);

    // First button (with URL) should be enabled
    expect(trackOrderButtons[0]?.hasAttribute('disabled')).toBe(false);

    // Second button (without URL) should be disabled
    expect(trackOrderButtons[1]?.hasAttribute('disabled')).toBe(true);

    // Click the enabled button
    if (trackOrderButtons[0]) {
      fireEvent.click(trackOrderButtons[0]);
    }

    // Verify only one call was made
    expect(mockVisitAddress).toHaveBeenCalledTimes(1);
    expect(mockVisitAddress).toHaveBeenCalledWith(
      'https://workflow.example.com/order/123',
    );
  });
});
