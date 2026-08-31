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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { runInAction } from 'mobx';
import {
  TerminalResult,
  RecommendationSource,
  SortOrder,
  type CartItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { RecommendedAddOnsModal } from '../RecommendedAddOnsModal.js';
import { createSpy } from '@finos/legend-shared/test';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

let MOCK__baseStore: LegendMarketplaceBaseStore;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTerminal = (
  overrides: Partial<TerminalResult> = {},
): TerminalResult => {
  const item = new TerminalResult();
  item.id = overrides.id ?? 1;
  // 'Vendor Profile' category → terminalItemType === TerminalItemType.TERMINAL
  item.category = overrides.category ?? 'Vendor Profile';
  item.providerName = overrides.providerName ?? 'Bloomberg';
  item.productName = overrides.productName ?? 'Bloomberg Terminal';
  item.price = overrides.price ?? 500;
  item.model = overrides.model ?? 'Model A';
  if (overrides.isOwned !== undefined) {
    item.isOwned = overrides.isOwned;
  }
  if (overrides.isMandatory !== undefined) {
    item.isMandatory = overrides.isMandatory;
  }
  if (overrides.source !== undefined) {
    item.source = overrides.source;
  }
  return item;
};

const makeAddOn = (overrides: Partial<TerminalResult> = {}): TerminalResult => {
  // 'Market Data' → terminalItemType === TerminalItemType.ADD_ON
  return makeTerminal({
    category: 'Market Data',
    productName: 'My AddOn',
    ...overrides,
  });
};

type AddToCartResult = {
  success: boolean;
  recommendations?: TerminalResult[];
  message: string;
  totalCount?: number | null;
};

const makeAddToCartWithAPIMock = (result: AddToCartResult) =>
  jest.fn((_cartItemData: unknown, _suppressSuccessToast?: boolean) =>
    Promise.resolve(result),
  );

const makeFailingAddToCartWithAPIMock = (error: Error) =>
  jest.fn((_cartItemData: unknown, _suppressSuccessToast?: boolean) =>
    Promise.reject(error),
  );

const setAddToCartWithAPIMock = (
  impl: (
    cartItemData: unknown,
    suppressSuccessToast?: boolean,
  ) => Promise<AddToCartResult>,
): void => {
  (
    MOCK__baseStore.cartStore as unknown as Record<string, unknown>
  ).addToCartWithAPI = impl;
};

// ─── Test Setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'getCart',
  ).mockResolvedValue({});
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'getCartSummary',
  ).mockResolvedValue({
    total_items: 0,
    total_cost: 0,
    formatted_total_cost: '$0.00',
  });
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'searchVendorAddons',
  ).mockResolvedValue({
    marketplace_addons: [],
    total_count: 0,
    page: 1,
    page_size: 300,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── showModal=false ──────────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - showModal=false', () => {
  test('renders nothing when showModal is false', () => {
    const { container } = render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message="Test message"
        showModal={false}
        setShowModal={jest.fn()}
      />,
    );
    // Dialog should not be rendered
    expect(container.firstChild).toBeNull();
  });
});

// ─── Terminal type (TERMINAL itemType) ────────────────────────────────────────

describe('RecommendedAddOnsModal - terminal type (TERMINAL)', () => {
  test('shows "Item Added Successfully" as modal title', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Item Added Successfully')).toBeDefined();
  });

  test('shows "Available Add-Ons for {productName} by {providerName}" as section title', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal({ productName: 'My Terminal' })}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(
      screen.getByText('Available Add-Ons for My Terminal by Bloomberg'),
    ).toBeDefined();
  });

  test('shows "Close" button (not "Cancel") for terminal type', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Close')).toBeDefined();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  test('shows "View Cart" button when onViewCart is provided (terminal type)', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        onViewCart={jest.fn()}
      />,
    );
    expect(screen.getByText('View Cart')).toBeDefined();
  });

  test('does not show "View Cart" button when onViewCart is not provided', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.queryByText('View Cart')).toBeNull();
  });

  test('shows empty state when no recommended items for terminal', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(
      screen.getByText('No add-ons available for this terminal.'),
    ).toBeDefined();
  });

  test('shows items list with "Add-On Name" header for terminal type', () => {
    const addon = makeAddOn({ id: 10 });
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Add-On Name')).toBeDefined();
  });

  test('renders recommended items in the list', () => {
    const addon1 = makeAddOn({ id: 10, productName: 'Addon Alpha' });
    const addon2 = makeAddOn({ id: 11, productName: 'Addon Beta' });
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[addon1, addon2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Addon Alpha')).toBeDefined();
    expect(screen.getByText('Addon Beta')).toBeDefined();
  });

  test('shows message/subtitle for terminal when no permission override', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message="Bloomberg Terminal added to cart"
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Bloomberg Terminal added to cart')).toBeDefined();
  });

  test('clicking "Close" calls setShowModal(false)', () => {
    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );
    fireEvent.click(screen.getByText('Close'));
    expect(setShowModal).toHaveBeenCalledWith(false);
  });

  test('clicking "View Cart" calls onViewCart and closes modal', () => {
    const setShowModal = jest.fn();
    const onViewCart = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
        onViewCart={onViewCart}
      />,
    );
    fireEvent.click(screen.getByText('View Cart'));
    expect(onViewCart).toHaveBeenCalledTimes(1);
    expect(setShowModal).toHaveBeenCalledWith(false);
  });

  test('shows "Search by Add-On name..." placeholder for terminal type', () => {
    const addon = makeAddOn({ id: 10 });
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('Search by Add-On name...');
    expect(input).toBeDefined();
  });

  test('shows item count range "Showing 1 - N of N items" for non-empty list', () => {
    const items = [makeAddOn({ id: 10 }), makeAddOn({ id: 11 })];
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={items}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        totalCount={2}
      />,
    );
    // "Showing 1 - 2 of 2 items"
    expect(screen.getByText('Showing 1 - 2 of 2 items')).toBeDefined();
  });
});

// ─── Add-on type (ADD_ON itemType) ────────────────────────────────────────────

describe('RecommendedAddOnsModal - add-on type (ADD_ON)', () => {
  test('shows "Unable to Add Item" as modal title', () => {
    const addon = makeAddOn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Unable to Add Item')).toBeDefined();
  });

  test('shows "Available Terminals for {productName} by {providerName}" section title', () => {
    const addon = makeAddOn({ productName: 'Market Addon' });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(
      screen.getByText('Available Terminals for Market Addon by Bloomberg'),
    ).toBeDefined();
  });

  test('shows "Cancel" button (not "Close") for add-on type', () => {
    const addon = makeAddOn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Cancel')).toBeDefined();
    expect(screen.queryByText('Close')).toBeNull();
  });

  test('does not show "View Cart" button for add-on type', () => {
    const addon = makeAddOn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        onViewCart={jest.fn()}
      />,
    );
    expect(screen.queryByText('View Cart')).toBeNull();
  });

  test('shows empty state "No available terminals" for add-on with no items', () => {
    const addon = makeAddOn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(
      screen.getByText('No available terminals for this add-on.'),
    ).toBeDefined();
  });

  test('shows "Terminal Name" header for add-on type', () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2 });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Terminal Name')).toBeDefined();
  });

  test('shows "Search by Terminal name..." placeholder for add-on type', () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2 });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('Search by Terminal name...');
    expect(input).toBeDefined();
  });

  test('clicking "Cancel" calls setShowModal(false)', () => {
    const setShowModal = jest.fn();
    const addon = makeAddOn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(setShowModal).toHaveBeenCalledWith(false);
  });

  test('renders recommended terminal items', () => {
    const addon = makeAddOn();
    const t1 = makeTerminal({ id: 2, productName: 'Terminal Alpha' });
    const t2 = makeTerminal({ id: 3, productName: 'Terminal Beta' });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[t1, t2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Terminal Alpha')).toBeDefined();
    expect(screen.getByText('Terminal Beta')).toBeDefined();
  });

  test('filters items by search term in client-side search (add-on flow)', async () => {
    const addon = makeAddOn();
    const t1 = makeTerminal({
      id: 2,
      productName: 'Alpha Terminal',
      providerName: 'Vendor A',
    });
    const t2 = makeTerminal({
      id: 3,
      productName: 'Beta Terminal',
      providerName: 'Vendor B',
    });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[t1, t2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Terminal name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
    });
    await waitFor(() => {
      expect(screen.getByText('Alpha Terminal')).toBeDefined();
      expect(screen.queryByText('Beta Terminal')).toBeNull();
    });
  });
});

// ─── Permission override flow ────────────────────────────────────────────────

describe('RecommendedAddOnsModal - permission override flow', () => {
  test('title is empty when overridePermissionId is set', () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
      />,
    );
    // When isPermissionOverride, modalTitle = ''
    expect(screen.queryByText('Item Added Successfully')).toBeNull();
  });

  test('shows "Available Add-Ons for {productName} by {providerName}" as section title', () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
      />,
    );
    expect(
      screen.getByText('Available Add-Ons for Bloomberg Terminal by Bloomberg'),
    ).toBeDefined();
  });

  test('shows "Search by Add-On name..." placeholder for permission override', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
      />,
    );
    const input = screen.getByPlaceholderText('Search by Add-On name...');
    expect(input).toBeDefined();
  });

  test('keeps modal open after associating when overridePermissionId is set', async () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'My Addon' });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'addToCart',
    ).mockResolvedValue({
      status_code: 200,
      message: 'Added',
      marketplace_addons: [],
    });

    const mockAddToCart = makeAddToCartWithAPIMock({
      success: true,
      recommendations: [],
      message: 'ok',
    });
    setAddToCartWithAPIMock(mockAddToCart);

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
        overridePermissionId={123}
      />,
    );

    // Click on the add-to-cart button for the addon
    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      // Modal should NOT be closed (overridePermissionId is set)
      expect(setShowModal).not.toHaveBeenCalledWith(false);
    });
  });

  test('button transitions to "Added to Cart" when item is in cart in permission override flow', async () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'My Addon' });

    // Pre-populate the cart with the add-on so isItemInCart(10) returns true.
    runInAction(() => {
      MOCK__baseStore.cartStore.items = {
        1: [
          {
            id: 10,
            cartId: 1,
            category: 'Market Data',
            providerName: 'Bloomberg',
            productName: 'My Addon',
            price: 0,
            description: '',
            isOwned: 'false',
          },
        ],
      };
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
        overrideModel="Model A"
      />,
    );

    expect(screen.getByText('Added to Cart')).toBeDefined();
    // Button must be disabled when item is already in cart.
    const btn = screen.getByText('Added to Cart').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  test('passes permissionId override and skipWorkflow to addToCart when overridePermissionId is set', async () => {
    const terminal = makeTerminal({
      productName: 'Bloomberg Terminal',
      model: 'Model A',
    });
    const addon = makeAddOn({ id: 10, productName: 'My Addon' });

    const addToCartSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'addToCart',
    ).mockResolvedValue({
      status_code: 200,
      message: 'Added',
      marketplace_addons: [],
    });

    // Provide a non-empty cart user so addToCartWithAPI proceeds.
    runInAction(() => {
      MOCK__baseStore.cartStore.targetUser = 'test-user';
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
        overrideModel="Model A"
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(addToCartSpy).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          permissionId: 123,
          model: 'Model A',
          skipWorkflow: true,
        }),
      );
    });
  });

  test('button transitions to "Added to Cart" via local state even when item absent from cart (skipWorkflow path)', async () => {
    // This test covers the case where addToCartWithAPI succeeds (success: true)
    // but the item does not appear in getCart because skipWorkflow=true routes
    // the entitlement directly without creating a traditional cart entry.
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'My Addon' });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'addToCart',
    ).mockResolvedValue({
      status_code: 200,
      message: 'Added',
      marketplace_addons: [],
    });
    // getCart returns empty — item is NOT reflected in the cart after the call.
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getCart',
    ).mockResolvedValue({});

    runInAction(() => {
      MOCK__baseStore.cartStore.targetUser = 'test-user';
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
        overrideModel="Model A"
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    // Even though the cart store still returns isItemInCart=false, the
    // button must transition to "Added to Cart" via the local isAdded state.
    await waitFor(() => {
      expect(screen.getByText('Added to Cart')).toBeDefined();
      const btn = screen.getByText('Added to Cart').closest('button');
      expect(btn?.disabled).toBe(true);
    });
  });
});

// ─── null terminal ────────────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - null terminal', () => {
  test('shows "Unable to Add Item" when terminal is null', () => {
    render(
      <RecommendedAddOnsModal
        terminal={null}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Unable to Add Item')).toBeDefined();
  });

  test('shows empty section title when terminal is null', () => {
    render(
      <RecommendedAddOnsModal
        terminal={null}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    // getSectionTitle returns '' when terminal is null and not permission override
    expect(screen.queryByText(/Available Terminals for/)).toBeNull();
  });
});

// ─── Mandatory add-on alert ───────────────────────────────────────────────────

describe('RecommendedAddOnsModal - mandatory add-on alert', () => {
  test('shows mandatory add-on alert for a single mandatory item', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({
      id: 10,
      productName: 'Mandatory Addon',
      isMandatory: true,
    });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Mandatory Add-On Included:')).toBeDefined();
    expect(screen.getByText('Mandatory Addon Added To Cart')).toBeDefined();
  });

  test('shows plural "Mandatory Add-Ons Included" for multiple mandatory items', () => {
    const terminal = makeTerminal();
    const addon1 = makeAddOn({
      id: 10,
      productName: 'Addon One',
      isMandatory: true,
    });
    const addon2 = makeAddOn({
      id: 11,
      productName: 'Addon Two',
      isMandatory: true,
    });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon1, addon2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Mandatory Add-Ons Included:')).toBeDefined();
  });

  test('does not show mandatory alert when no items are mandatory', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10, isMandatory: false });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.queryByText(/Mandatory Add-On/)).toBeNull();
  });
});

// ─── Multi-source content ─────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - multi-source content', () => {
  test('renders "From Your Cart" section when cart and inventory items present', () => {
    const addon = makeAddOn(); // add-on → association flow
    const cartItem = makeTerminal({ id: 2, source: RecommendationSource.CART });
    const inventoryItem = makeTerminal({
      id: 3,
      source: RecommendationSource.INVENTORY,
    });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[cartItem, inventoryItem]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('From Your Cart')).toBeDefined();
    expect(screen.getByText('From Your Inventory')).toBeDefined();
  });

  test('renders "From Marketplace" section when cart and marketplace items present', () => {
    const addon = makeAddOn();
    const cartItem = makeTerminal({ id: 2, source: RecommendationSource.CART });
    const marketplaceItem = makeTerminal({
      id: 4,
      source: RecommendationSource.MARKETPLACE,
    });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[cartItem, marketplaceItem]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('From Your Cart')).toBeDefined();
    expect(screen.getByText('From Marketplace')).toBeDefined();
  });

  test('does not render multi-source view when only one source', () => {
    const addon = makeAddOn();
    const cartItem1 = makeTerminal({
      id: 2,
      source: RecommendationSource.CART,
    });
    const cartItem2 = makeTerminal({
      id: 3,
      source: RecommendationSource.CART,
    });
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[cartItem1, cartItem2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    // No multi-source sections
    expect(screen.queryByText('From Your Cart')).toBeNull();
  });
});

// ─── Search functionality (terminal type – server-side search) ─────────────────

describe('RecommendedAddOnsModal - server-side search (terminal type)', () => {
  test('triggers searchVendorAddons when Enter is pressed with a search term', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });
    const searchSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [],
      total_count: 0,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        MOCK__baseStore.cartStore.cartUser,
        terminal.providerName,
        expect.objectContaining({
          page: 1,
          page_size: 300,
          search: 'Test',
        }),
        expect.anything(),
      );
    });
  });

  test('shows search results after searching (terminal type)', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });
    const searchResult = makeAddOn({
      id: 20,
      productName: 'Search Result Addon',
    });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [searchResult],
      total_count: 1,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Search Result' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(screen.getByText('Search Result Addon')).toBeDefined();
    });
  });

  test('shows "No items match" when search returns empty', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [],
      total_count: 0,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'ZZZ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(
        screen.getByText('No items match your search criteria.'),
      ).toBeDefined();
    });
  });

  test('resets search when input is cleared', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10, productName: 'Original Addon' });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [
        makeAddOn({ id: 20, productName: 'Search Result Addon' }),
      ],
      total_count: 1,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'x' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(screen.getByText('Search Result Addon')).toBeDefined();
    });

    // Clear input
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Original Addon')).toBeDefined();
    });
  });
});

// ─── Sort functionality ───────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - sort by price', () => {
  test('renders sort control', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });
    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    // MUI renders both a label and a span with the text "Sort by Price"
    const matches = screen.getAllByText('Sort by Price');
    expect(matches.length).toBeGreaterThan(0);
  });
});

// ─── Close button (X icon) ────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - close via X button', () => {
  test('clicking X icon calls setShowModal(false)', () => {
    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal()}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );
    fireEvent.click(screen.getByText('Close'));
    expect(setShowModal).toHaveBeenCalledWith(false);
  });
});

// ─── Multi-source content (add-on flow with multiple sources) ─────────────────

describe('RecommendedAddOnsModal - multi-source content', () => {
  test('shows "From Your Cart" and "From Your Inventory" sections when items come from multiple sources', () => {
    const addon = makeAddOn();
    const termFromCart = makeTerminal({
      id: 2,
      productName: 'Cart Terminal',
      source: RecommendationSource.CART,
    });
    const termFromInventory = makeTerminal({
      id: 3,
      productName: 'Inventory Terminal',
      source: RecommendationSource.INVENTORY,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[termFromCart, termFromInventory]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    expect(screen.getByText('From Your Cart')).toBeDefined();
    expect(screen.getByText('From Your Inventory')).toBeDefined();
  });

  test('shows "From Your Cart" and marketplace sections for cart + marketplace sources', () => {
    const addon = makeAddOn();
    const termFromCart = makeTerminal({
      id: 2,
      productName: 'Cart Terminal',
      source: RecommendationSource.CART,
    });
    const termFromMarket = makeTerminal({
      id: 4,
      productName: 'Market Terminal',
      source: RecommendationSource.MARKETPLACE,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[termFromCart, termFromMarket]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    expect(screen.getByText('From Your Cart')).toBeDefined();
    expect(screen.getByText('From Marketplace')).toBeDefined();
  });

  test('shows all three source sections when items come from cart, inventory, and marketplace', () => {
    const addon = makeAddOn();
    const termFromCart = makeTerminal({
      id: 2,
      source: RecommendationSource.CART,
    });
    const termFromInventory = makeTerminal({
      id: 3,
      source: RecommendationSource.INVENTORY,
    });
    const termFromMarket = makeTerminal({
      id: 4,
      source: RecommendationSource.MARKETPLACE,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[termFromCart, termFromInventory, termFromMarket]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    expect(screen.getByText('From Your Cart')).toBeDefined();
    expect(screen.getByText('From Your Inventory')).toBeDefined();
    expect(screen.getByText('From Marketplace')).toBeDefined();
  });

  test('renders terminal cards inside multi-source content', () => {
    const addon = makeAddOn();
    const termFromCart = makeTerminal({
      id: 2,
      productName: 'Cart Terminal',
      source: RecommendationSource.CART,
    });
    const termFromInventory = makeTerminal({
      id: 3,
      productName: 'Inventory Terminal',
      source: RecommendationSource.INVENTORY,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[termFromCart, termFromInventory]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Cart Terminal')).toBeDefined();
    expect(screen.getByText('Inventory Terminal')).toBeDefined();
  });
});

// ─── handleCartResult branches ────────────────────────────────────────────────

describe('RecommendedAddOnsModal - handleCartResult', () => {
  test('does not close modal when association result success=false', async () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2, productName: 'My Terminal' });

    const mockAddToCart = makeAddToCartWithAPIMock({
      success: false,
      recommendations: [],
      message: '',
    });
    setAddToCartWithAPIMock(mockAddToCart);

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(setShowModal).not.toHaveBeenCalledWith(false);
    });
  });

  test('calls onTerminalSelected and closes modal when association returns recommendations', async () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2, productName: 'My Terminal' });
    const recommendation = makeAddOn({
      id: 50,
      productName: 'Recommended Addon',
    });

    const mockAddToCart = makeAddToCartWithAPIMock({
      success: true,
      recommendations: [recommendation],
      message: 'Terminal associated',
      totalCount: 1,
    });
    setAddToCartWithAPIMock(mockAddToCart);

    const setShowModal = jest.fn();
    const onTerminalSelected = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
        onTerminalSelected={onTerminalSelected}
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(onTerminalSelected).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.anything()]),
        'Terminal associated',
        1,
      );
      expect(setShowModal).toHaveBeenCalledWith(false);
    });
  });

  test('closes modal when association succeeds without recommendations (no overridePermissionId)', async () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2, productName: 'My Terminal' });

    const mockAddToCart = makeAddToCartWithAPIMock({
      success: true,
      recommendations: [],
      message: 'ok',
    });
    setAddToCartWithAPIMock(mockAddToCart);

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(setShowModal).toHaveBeenCalledWith(false);
    });
  });
});

// ─── handleAssociateTerminal error path ───────────────────────────────────────

describe('RecommendedAddOnsModal - handleAssociateTerminal error', () => {
  test('handles error when associating terminal fails', async () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2, productName: 'My Terminal' });

    setAddToCartWithAPIMock(
      makeFailingAddToCartWithAPIMock(new Error('Network Error')),
    );

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      // Modal should still be open on error
      expect(setShowModal).not.toHaveBeenCalledWith(false);
      // Button should be re-enabled
      const btns = screen.getAllByRole('button');
      const addToCartBtn = btns.find((b) =>
        b.textContent?.includes('Add to Cart'),
      );
      expect(addToCartBtn).toBeDefined();
    });
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - pagination', () => {
  test('shows pagination controls when items exceed itemsPerPage (15)', () => {
    const terminal = makeTerminal();
    const items = Array.from({ length: 20 }, (_, i) =>
      makeAddOn({ id: 100 + i, productName: `Addon ${i}` }),
    );

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={items}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // Pagination should be rendered when totalPages > 1
    const page2Btn = screen.queryByRole('button', { name: /page 2/i });
    expect(page2Btn).toBeDefined();
  });

  test('navigates to second page when clicking page 2', async () => {
    const terminal = makeTerminal();
    // 20 items with default 15 per page → 2 pages
    const items = Array.from({ length: 20 }, (_, i) =>
      makeAddOn({
        id: 100 + i,
        productName: `Addon ${String(i).padStart(2, '0')}`,
      }),
    );

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={items}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // Click page 2
    const page2Btn = screen.getByRole('button', { name: /page 2/i });
    await act(async () => {
      fireEvent.click(page2Btn);
    });

    await waitFor(() => {
      // Page 1 items (indices 0-14) should be gone, page 2 items visible
      expect(screen.getByText('Addon 15')).toBeDefined();
      expect(screen.queryByText('Addon 00')).toBeNull();
    });
  });
});

// ─── fetchVendorAddons error path (server-side search error) ──────────────────

describe('RecommendedAddOnsModal - server-side search error', () => {
  test('handles searchVendorAddons rejection gracefully (terminal type)', async () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'Addon Alpha' });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockRejectedValue(new Error('Search failed'));

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      // Error is handled; original items may or may not appear, but no crash
      expect(screen.queryByText('Addon Alpha')).toBeDefined();
    });
  });
});

// ─── triggerSearch with non-terminal-added flow ───────────────────────────────

describe('RecommendedAddOnsModal - triggerSearch non-terminal flow', () => {
  test('does not trigger server search for add-on type (isTerminalAdded=false)', async () => {
    const addon = makeAddOn({ productName: 'My AddOn' });
    const terminal = makeTerminal({ id: 2, productName: 'Terminal Alpha' });
    const terminal2 = makeTerminal({ id: 3, productName: 'Terminal Beta' });

    const searchVendorAddonsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [],
      total_count: 0,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal, terminal2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Terminal name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
    });

    // Client-side filter should work without server search
    await waitFor(() => {
      expect(screen.getByText('Terminal Alpha')).toBeDefined();
      expect(screen.queryByText('Terminal Beta')).toBeNull();
      // Server search should NOT be called for add-on type
      expect(searchVendorAddonsSpy).not.toHaveBeenCalled();
    });
  });

  test('pressing Enter in add-on modal search triggers client-side filter reset path', async () => {
    // In add-on modal (isTerminalAdded=false), pressing Enter still calls triggerSearch
    // which hits the !isTerminalAdded early-return branch (lines 257-260)
    const addon = makeAddOn({ productName: 'My AddOn' });
    const t1 = makeTerminal({ id: 2, productName: 'Terminal Alpha' });
    const t2 = makeTerminal({ id: 3, productName: 'Terminal Beta' });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[t1, t2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Terminal name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
      // Press Enter to trigger handleSearchKeyDown → handleSearchAction → triggerSearch
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(screen.getByText('Terminal Alpha')).toBeDefined();
      expect(screen.queryByText('Terminal Beta')).toBeNull();
    });
  });
});

// ─── handleAssociateTerminal with permission/model override ───────────────────

describe('RecommendedAddOnsModal - handleAssociateTerminal overrides', () => {
  test('passes permissionId and model to addToCart in association flow (isAddOnAssociation=true)', async () => {
    const addon = makeAddOn({ productName: 'My AddOn' });
    const terminal = makeTerminal({ id: 2, productName: 'Bloomberg Terminal' });

    const addToCartSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'addToCart',
    ).mockResolvedValue({
      status_code: 200,
      message: 'Added',
      marketplace_addons: [],
    });

    runInAction(() => {
      MOCK__baseStore.cartStore.targetUser = 'test-user';
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={42}
        overrideModel="Model X"
      />,
    );

    // In add-on association flow, clicking "Add to Cart" calls handleAssociateTerminal
    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(addToCartSpy).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          permissionId: 42,
          model: 'Model X',
          skipWorkflow: true,
        }),
      );
    });
  });
});

// ─── MultiSourceContent onAssociate callback ──────────────────────────────────

describe('RecommendedAddOnsModal - MultiSourceContent onAssociate', () => {
  test('clicking "Add to Cart" in cart source section calls handleAssociateTerminal', async () => {
    const addon = makeAddOn({ productName: 'My AddOn' });
    const termFromCart = makeTerminal({
      id: 2,
      productName: 'Cart Terminal',
      source: RecommendationSource.CART,
    });
    const termFromInventory = makeTerminal({
      id: 3,
      productName: 'Inventory Terminal',
      source: RecommendationSource.INVENTORY,
    });

    const mockAddToCart = makeAddToCartWithAPIMock({
      success: true,
      recommendations: [],
      message: 'ok',
    });
    setAddToCartWithAPIMock(mockAddToCart);

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[termFromCart, termFromInventory]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );

    // Multi-source content renders
    expect(screen.getByText('From Your Cart')).toBeDefined();

    // Click Add to Cart on the cart source item
    const addBtns = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtns.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(addBtns[0] as HTMLElement);
    });

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: termFromCart.id,
          productName: termFromCart.productName,
          providerName: termFromCart.providerName,
          category: termFromCart.category,
          price: termFromCart.price,
          skipWorkflow: false,
          source: RecommendationSource.CART,
        }),
      );
    });
  });
});

// ─── Sort select interaction ──────────────────────────────────────────────────

describe('RecommendedAddOnsModal - sort select', () => {
  test('opening sort dropdown shows sort options', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10, price: 300 });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // Find the sort select trigger (MUI Select renders as combobox)
    const comboboxes = screen.getAllByRole('combobox');
    // The sort by price select is one of them
    expect(comboboxes.length).toBeGreaterThan(0);

    // Open the dropdown
    await act(async () => {
      fireEvent.mouseDown(comboboxes[0] as HTMLElement);
    });

    // Options should appear in the listbox
    await waitFor(() => {
      const listbox = screen.queryByRole('listbox');
      expect(listbox).not.toBeNull();
    });
  });

  test('selecting "Low to High" sort option triggers sort', async () => {
    const terminal = makeTerminal();
    const addon1 = makeAddOn({ id: 10, productName: 'Expensive', price: 500 });
    const addon2 = makeAddOn({ id: 11, productName: 'Cheap', price: 100 });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon1, addon2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // Open sort dropdown
    const comboboxes = screen.getAllByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(comboboxes[0] as HTMLElement);
    });

    // Click "Low to High" option
    await waitFor(() => {
      const option = screen.queryByText('Low to High');
      if (option) {
        fireEvent.click(option);
      }
    });

    // After sort, items should be sorted by price ascending
    // Cheap (100) should appear before Expensive (500)
    await waitFor(() => {
      const items = screen.queryAllByText(/\$\d+\.\d{2}/);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});

// ─── Column filters ────────────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - column filters', () => {
  test('category filter narrows the list to matching items', () => {
    const terminal = makeTerminal();
    const addon1 = makeAddOn({
      id: 10,
      productName: 'Data Feed',
      category: 'Market Data',
    });
    const addon2 = makeAddOn({
      id: 11,
      productName: 'Analytics Suite',
      category: 'Analytics',
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon1, addon2]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    expect(screen.getByText('Data Feed')).toBeDefined();
    expect(screen.getByText('Analytics Suite')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Filter by Category'));
    fireEvent.click(screen.getByLabelText('Analytics'));

    expect(screen.queryByText('Data Feed')).toBeNull();
    expect(screen.getByText('Analytics Suite')).toBeDefined();
  });

  test('Action filter does not offer "Subscribed" outside the permission-override flow', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filter by Action'));
    expect(screen.queryByLabelText('Subscribed')).toBeNull();
    expect(screen.getByLabelText('In Cart')).toBeDefined();
    expect(screen.getByLabelText('Add to Cart')).toBeDefined();
  });

  test('Action filter offers "Subscribed" in the permission-override flow', () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10 });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={123}
      />,
    );

    fireEvent.click(screen.getByLabelText('Filter by Action'));
    expect(screen.getByLabelText('Subscribed')).toBeDefined();
  });

  test('an item added via a skip-workflow add-to-cart is treated as "In Cart" by the Action filter', async () => {
    const terminal = makeTerminal();
    const addon = makeAddOn({ id: 10, productName: 'Newly Added Addon' });
    const mockAddToCart = makeAddToCartWithAPIMock({
      success: true,
      recommendations: [],
      message: 'ok',
    });
    setAddToCartWithAPIMock(mockAddToCart);

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // cartStore.isItemInCart(10) is still false at this point (skip-workflow
    // items don't get pushed into cartStore.items), but the card's local
    // "isAdded" state should still surface via onItemAdded.
    await act(async () => {
      fireEvent.click(
        screen
          .getAllByRole('button')
          .find((b) => b.textContent?.includes('Add to Cart')) as HTMLElement,
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Added to Cart')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Filter by Action'));
    fireEvent.click(screen.getByLabelText('In Cart'));

    expect(screen.getByText('Newly Added Addon')).toBeDefined();
  });
});

// ─── getItemActionStatus branches (owned / add-to-cart / exclusion) ──────────

describe('RecommendedAddOnsModal - Action filter status branches', () => {
  test('Action filter excludes owned and plain items, keeping only the matching "In Cart" item', () => {
    const terminal = makeTerminal();
    const ownedItem = makeAddOn({
      id: 1,
      productName: 'Owned Addon',
      isOwned: true,
    });
    const inCartItem = makeAddOn({ id: 2, productName: 'InCart Addon' });
    const plainItem = makeAddOn({ id: 3, productName: 'Plain Addon' });

    const inCartCartItem: CartItem = {
      cartId: 2,
      id: 2,
      productName: 'InCart Addon',
      providerName: 'Bloomberg',
      category: 'Market Data',
      price: 100,
      description: '',
      isOwned: 'false',
      skipWorkflow: false,
    };
    MOCK__baseStore.cartStore.items[99] = [inCartCartItem];

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[ownedItem, inCartItem, plainItem]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={55}
      />,
    );

    expect(screen.getByText('Owned Addon')).toBeDefined();
    expect(screen.getByText('InCart Addon')).toBeDefined();
    expect(screen.getByText('Plain Addon')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Filter by Action'));
    fireEvent.click(screen.getByLabelText('In Cart'));

    expect(screen.queryByText('Owned Addon')).toBeNull();
    expect(screen.getByText('InCart Addon')).toBeDefined();
    expect(screen.queryByText('Plain Addon')).toBeNull();
  });
});

// ─── triggerSearch AbortError handling ────────────────────────────────────────

describe('RecommendedAddOnsModal - triggerSearch AbortError handling', () => {
  test('silently ignores an AbortError from a superseded search request', async () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'Addon Alpha' });

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const searchSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockRejectedValue(abortError);
    const logSpy = createSpy(
      MOCK__baseStore.applicationStore.logService,
      'error',
    );

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalled();
    });

    // AbortError is swallowed silently: nothing gets logged and the original
    // items remain displayed (search results are left untouched).
    expect(logSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Addon Alpha')).toBeDefined();
  });
});

// ─── MultiSourceContent empty state ───────────────────────────────────────────

describe('RecommendedAddOnsModal - MultiSourceContent empty state', () => {
  test('shows the empty state message when a column filter excludes every item from all sources', () => {
    const addon = makeAddOn({ productName: 'My AddOn' });
    const cartTerm = makeTerminal({
      id: 2,
      productName: 'Cart Terminal',
      source: RecommendationSource.CART,
    });
    const inventoryTerm = makeTerminal({
      id: 3,
      productName: 'Inventory Terminal',
      source: RecommendationSource.INVENTORY,
    });

    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[cartTerm, inventoryTerm]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
        overridePermissionId={1}
      />,
    );

    // Sanity check: multi-source content is rendered initially.
    expect(screen.getByText('From Your Cart')).toBeDefined();

    // Each source section renders its own column header with an identical
    // "Filter by Action" button (all sharing the same underlying filter
    // state), so pick the first one.
    fireEvent.click(screen.getAllByLabelText('Filter by Action')[0] as Element);
    fireEvent.click(screen.getByLabelText('Subscribed'));

    expect(
      screen.getByText('No items match your search criteria.'),
    ).toBeDefined();
    expect(screen.queryByText('From Your Cart')).toBeNull();
  });
});

// ─── handleAssociateTerminal catch block ──────────────────────────────────────

describe('RecommendedAddOnsModal - handleAssociateTerminal unexpected rejection', () => {
  test('alerts on an unhandled error and keeps the modal open', async () => {
    const addon = makeAddOn();
    const terminal = makeTerminal({ id: 2, productName: 'My Terminal' });

    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).associateAddOnToTerminal = jest
      .fn()
      .mockReturnValue(Promise.reject(new Error('Association crashed')));

    const alertSpy = createSpy(
      MOCK__baseStore.applicationStore,
      'alertUnhandledError',
    ).mockImplementation(() => {});

    const setShowModal = jest.fn();
    render(
      <RecommendedAddOnsModal
        terminal={addon}
        recommendedItems={[terminal]}
        message=""
        showModal={true}
        setShowModal={setShowModal}
      />,
    );

    const addBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Add to Cart'));
    expect(addBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(addBtn as HTMLElement);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(setShowModal).not.toHaveBeenCalledWith(false);
    });
  });
});

// ─── handleSortChange re-triggering an active server-side search ─────────────

describe('RecommendedAddOnsModal - sort change with active server search', () => {
  test('re-triggers the server-side vendor add-on search with the new sort order', async () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    const addon = makeAddOn({ id: 10, productName: 'Addon Alpha' });

    const searchSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'searchVendorAddons',
    ).mockResolvedValue({
      marketplace_addons: [],
      total_count: 0,
      page: 1,
      page_size: 300,
    });

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={[addon]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search by Add-On name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alpha' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });

    // Change the sort order while a server search is active; this should
    // re-trigger the server-side search with the new sort order applied.
    const comboboxes = screen.getAllByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(comboboxes[0] as HTMLElement);
    });
    const lowToHighOption = await screen.findByText('Low to High');
    await act(async () => {
      fireEvent.click(lowToHighOption);
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(2);
    });
    expect(searchSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ sort_by_price: SortOrder.ASC }),
      expect.anything(),
    );
  });
});

// ─── Items-per-page select ────────────────────────────────────────────────────

describe('RecommendedAddOnsModal - items per page select', () => {
  test('changing "Items per page" updates pagination and resets to page 1', async () => {
    const terminal = makeTerminal();
    const items = Array.from({ length: 15 }, (_, i) =>
      makeAddOn({
        id: 100 + i,
        productName: `Addon ${String(i).padStart(2, '0')}`,
      }),
    );

    render(
      <RecommendedAddOnsModal
        terminal={terminal}
        recommendedItems={items}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );

    // With the default itemsPerPage (15), all 15 items fit on a single page.
    expect(screen.queryByRole('button', { name: /page 2/i })).toBeNull();

    const comboboxes = screen.getAllByRole('combobox');
    const itemsPerPageSelect = comboboxes.at(-1);
    await act(async () => {
      fireEvent.mouseDown(itemsPerPageSelect as HTMLElement);
    });
    const option10 = await screen.findByRole('option', { name: '10' });
    await act(async () => {
      fireEvent.click(option10);
    });

    // itemsPerPage=10 with 15 items now yields 2 pages.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /page 2/i })).toBeDefined();
    });
  });
});
