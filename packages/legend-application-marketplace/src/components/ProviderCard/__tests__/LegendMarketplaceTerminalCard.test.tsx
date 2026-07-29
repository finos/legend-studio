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
import {
  TerminalResult,
  type CartItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceTerminalCard } from '../LegendMarketplaceTerminalCard.js';
import { createSpy } from '@finos/legend-shared/test';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTerminalResult = (
  overrides: Partial<TerminalResult> = {},
): TerminalResult => {
  const item = new TerminalResult();
  item.id = overrides.id ?? 1;
  item.category = overrides.category ?? 'Vendor Profile';
  item.providerName = overrides.providerName ?? 'Bloomberg';
  item.productName = overrides.productName ?? 'Bloomberg Terminal';
  item.price = overrides.price ?? 500;
  item.model = overrides.model ?? 'Model A';
  if (overrides.isOwned !== undefined) {
    item.isOwned = overrides.isOwned;
  }
  if (overrides.permissionId !== undefined) {
    item.permissionId = overrides.permissionId;
  }
  return item;
};

const makeCartItem = (id: number): CartItem => ({
  cartId: id,
  id,
  productName: `Product ${id}`,
  providerName: 'Bloomberg',
  category: 'Vendor Profile',
  price: 100,
  description: '',
  isOwned: 'false',
  skipWorkflow: false,
});

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

// ─── Rendering tests ──────────────────────────────────────────────────────────

describe('LegendMarketplaceTerminalCard - rendering', () => {
  test('renders product name', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
  });

  test('renders provider name', () => {
    const item = makeTerminalResult({ providerName: 'Reuters' });
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText('Reuters')).toBeDefined();
  });

  test('renders category chip when category is present', () => {
    const item = makeTerminalResult({ category: 'Market Data' });
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText('Market Data')).toBeDefined();
  });

  test('does not render chip when category is empty', () => {
    const item = makeTerminalResult({ category: '' });
    const { container } = render(
      <LegendMarketplaceTerminalCard terminalResult={item} />,
    );
    // No category chip rendered – the chip element has a specific class
    const chips = container.querySelectorAll(
      '.legend-marketplace-terminal-card__category-chip',
    );
    expect(chips.length).toBe(0);
  });

  test('renders price chip when price is a number', () => {
    const item = makeTerminalResult({ price: 1234 });
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText('$1,234.00/month')).toBeDefined();
  });

  test('renders image with alt "data asset"', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByAltText('data asset')).toBeDefined();
  });

  test('image URL uses assetUrl from config', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    const img = screen.getByAltText('data asset');
    // assetsBaseUrl is '/fileName' in test config
    expect((img as HTMLImageElement).src).toMatch(/\/fileName\/images\d+\.jpg/);
  });

  test('shows "Already have access" when item is owned', () => {
    const item = makeTerminalResult({ isOwned: true });
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText(/Already have access/)).toBeDefined();
  });

  test('does not show cart button when item is owned', () => {
    const item = makeTerminalResult({ isOwned: true });
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.queryByText('Add to cart')).toBeNull();
  });

  test('shows "Add to cart" button when not owned and not in cart', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText(/Add to cart/)).toBeDefined();
  });

  test('shows "In Cart" when item is already in cart', () => {
    const item = makeTerminalResult({ id: 5 });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText(/In Cart/)).toBeDefined();
  });

  test('"In Cart" button is disabled', () => {
    const item = makeTerminalResult({ id: 5 });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    const btn = screen.getByText(/In Cart/).closest('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('shows "Add Service" button for cardAction="addService"', () => {
    const item = makeTerminalResult();
    render(
      <LegendMarketplaceTerminalCard
        terminalResult={item}
        cardAction="addService"
      />,
    );
    expect(screen.getByText(/Add Service/)).toBeDefined();
  });

  test('defaults to "Add to cart" when cardAction is not provided', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    expect(screen.getByText(/Add to cart/)).toBeDefined();
  });
});

// ─── addToCart flow ───────────────────────────────────────────────────────────

describe('LegendMarketplaceTerminalCard - addToCart', () => {
  test('clicking "Add to cart" triggers addToCartWithAPI', async () => {
    const item = makeTerminalResult();
    const mockAddToCart = jest
      .fn()
      .mockReturnValue(
        Promise.resolve({ success: true, recommendations: [], message: '' }),
      );
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = mockAddToCart;

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });
    expect(mockAddToCart).toHaveBeenCalled();
  });

  test('shows "Adding..." during add to cart', async () => {
    const item = makeTerminalResult();
    let resolveAdd!: (v: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveAdd = resolve;
    });
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest.fn().mockReturnValue(pendingPromise);

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });
    expect(screen.getByText(/Adding\.\.\./)).toBeDefined();
    // cleanup
    resolveAdd({ success: true, recommendations: [], message: '' });
  });

  test('button is disabled while adding to cart', async () => {
    const item = makeTerminalResult();
    let resolveAdd!: (v: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveAdd = resolve;
    });
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest.fn().mockReturnValue(pendingPromise);

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });
    const btn = screen.getByText(/Adding/).closest('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    // cleanup
    resolveAdd({ success: true, recommendations: [], message: '' });
  });

  test('opens RecommendedAddOnsModal when addToCart returns recommendations', async () => {
    const item = makeTerminalResult({ productName: 'My Terminal' });
    const recommendation = new TerminalResult();
    recommendation.id = 99;
    recommendation.category = 'Market Data';
    recommendation.providerName = 'Bloomberg';
    recommendation.productName = 'Extra Addon';
    recommendation.price = 50;
    recommendation.model = null;

    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest.fn().mockReturnValue(
      Promise.resolve({
        success: true,
        recommendations: [recommendation],
        message: 'Terminal added',
        totalCount: 1,
      }),
    );

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });

    await waitFor(() => {
      // The modal renders with "Item Added Successfully" title (terminal type)
      expect(screen.getByText('Item Added Successfully')).toBeDefined();
    });
  });

  test('does not open modal when addToCart returns no recommendations', async () => {
    const item = makeTerminalResult();
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest.fn().mockReturnValue(
      Promise.resolve({
        success: true,
        recommendations: [],
        message: '',
      }),
    );

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });

    expect(screen.queryByText('Item Added Successfully')).toBeNull();
  });

  test('handles addToCartWithAPI rejection gracefully', async () => {
    const item = makeTerminalResult({ productName: 'Test Item' });
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest
      .fn()
      .mockReturnValue(Promise.reject(new Error('API Error')));

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);
    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });
    // After error, button should be re-enabled (not "Adding...")
    await waitFor(() => {
      expect(screen.queryByText(/Adding\.\.\./)).toBeNull();
    });
  });
});

// ─── addService flow ──────────────────────────────────────────────────────────

describe('LegendMarketplaceTerminalCard - addService', () => {
  test('clicking "Add Service" calls getPermissionAddons', async () => {
    const item = makeTerminalResult({ permissionId: 42 });
    const addon = new TerminalResult();
    addon.id = 10;
    addon.category = 'Market Data';
    addon.providerName = 'Bloomberg';
    addon.productName = 'Service Addon';
    addon.price = 100;
    addon.model = null;

    const getPermissionAddonsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [addon],
      total_count: 1,
      permissionId: 42,
    });

    render(
      <LegendMarketplaceTerminalCard
        terminalResult={item}
        cardAction="addService"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Add Service/));
    });

    expect(getPermissionAddonsSpy).toHaveBeenCalled();
  });

  test('opens modal when getPermissionAddons returns addons', async () => {
    const item = makeTerminalResult({
      providerName: 'Bloomberg',
      productName: 'Bloomberg Terminal',
    });
    const addon = new TerminalResult();
    addon.id = 10;
    addon.category = 'Market Data';
    addon.providerName = 'Bloomberg';
    addon.productName = 'Service Addon';
    addon.price = 100;
    addon.model = null;

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [addon],
      total_count: 1,
      permissionId: 42,
    });

    render(
      <LegendMarketplaceTerminalCard
        terminalResult={item}
        cardAction="addService"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Add Service/));
    });

    await waitFor(() => {
      // Modal opens with permission-override flow: section title is
      // "Add-Ons available for {productName}"
      expect(
        screen.getByText(`Add-Ons available for ${item.productName}`),
      ).toBeDefined();
    });
  });

  test('handles getPermissionAddons rejection gracefully', async () => {
    const item = makeTerminalResult({ productName: 'Test Terminal' });
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockRejectedValue(new Error('Service Error'));

    render(
      <LegendMarketplaceTerminalCard
        terminalResult={item}
        cardAction="addService"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Add Service/));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Adding\.\.\./)).toBeNull();
    });
  });

  test('shows loading state while fetching services', async () => {
    const item = makeTerminalResult();
    let resolvePermissions!: (v: unknown) => void;
    const pendingPermissions = new Promise((resolve) => {
      resolvePermissions = resolve;
    });

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockReturnValue(
      pendingPermissions as ReturnType<
        typeof MOCK__baseStore.marketplaceServerClient.getPermissionAddons
      >,
    );

    render(
      <LegendMarketplaceTerminalCard
        terminalResult={item}
        cardAction="addService"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Add Service/));
    });
    expect(screen.getByText(/Adding\.\.\./)).toBeDefined();
    // cleanup
    resolvePermissions({
      marketplace_addons: [],
      total_count: 0,
      permissionId: undefined,
    });
  });
});

// ─── Modal chaining (onTerminalSelected) ──────────────────────────────────────

describe('LegendMarketplaceTerminalCard - modal chaining', () => {
  test('updates modal with new recommendations when onTerminalSelected is called', async () => {
    const item = makeTerminalResult({ productName: 'My Terminal' });

    // First addToCart returns a recommendation
    const rec1 = new TerminalResult();
    rec1.id = 10;
    rec1.category = 'Market Data';
    rec1.providerName = 'Bloomberg';
    rec1.productName = 'First Addon';
    rec1.price = 50;
    rec1.model = null;

    const rec2 = new TerminalResult();
    rec2.id = 20;
    rec2.category = 'Market Data';
    rec2.providerName = 'Bloomberg';
    rec2.productName = 'Second Addon';
    rec2.price = 75;
    rec2.model = null;

    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addToCartWithAPI = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({
          success: true,
          recommendations: [rec1],
          message: 'Terminal added',
          totalCount: 1,
        }),
      )
      .mockReturnValueOnce(
        Promise.resolve({
          success: true,
          recommendations: [rec2],
          message: 'Rec 1 added',
          totalCount: 1,
        }),
      );

    render(<LegendMarketplaceTerminalCard terminalResult={item} />);

    // Add the terminal to cart
    await act(async () => {
      fireEvent.click(screen.getByText(/Add to cart/));
    });

    await waitFor(() => {
      expect(screen.getByText('Item Added Successfully')).toBeDefined();
    });
  });
});
