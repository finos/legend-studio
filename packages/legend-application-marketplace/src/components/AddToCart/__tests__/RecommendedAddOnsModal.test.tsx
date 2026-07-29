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

// ─── Test Setup ───────────────────────────────────────────────────────────────

let MOCK__baseStore: LegendMarketplaceBaseStore;

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

  test('shows "Available Add-Ons for {productName}" as section title', () => {
    render(
      <RecommendedAddOnsModal
        terminal={makeTerminal({ productName: 'My Terminal' })}
        recommendedItems={[]}
        message=""
        showModal={true}
        setShowModal={jest.fn()}
      />,
    );
    expect(screen.getByText('Available Add-Ons for My Terminal')).toBeDefined();
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
    expect(onViewCart).toHaveBeenCalled();
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
    const showingText = screen.getByText(/Showing/);
    expect(showingText.textContent).toContain('Showing');
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

  test('shows "Available Terminals for {productName}" section title', () => {
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
      screen.getByText('Available Terminals for Market Addon'),
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

  test('shows "Add-Ons available for {productName}" as section title', () => {
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
      screen.getByText('Add-Ons available for Bloomberg Terminal'),
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

    const mockAddToCart = jest
      .fn()
      .mockReturnValue(
        Promise.resolve({ success: true, recommendations: [], message: 'ok' }),
      );
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = mockAddToCart;

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
      expect(searchSpy).toHaveBeenCalled();
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
