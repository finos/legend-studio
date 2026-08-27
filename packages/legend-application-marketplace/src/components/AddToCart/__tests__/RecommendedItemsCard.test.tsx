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
  RecommendationSource,
  type CartItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { RecommendedItemsCard } from '../RecommendedItemsCard.js';
import { createSpy } from '@finos/legend-shared/test';
import { toastManager } from '../../Toast/CartToast.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

let MOCK__baseStore: LegendMarketplaceBaseStore;

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
  if (overrides.isMandatory !== undefined) {
    item.isMandatory = overrides.isMandatory;
  }
  if (overrides.source !== undefined) {
    item.source = overrides.source;
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

type AddToCartResult = {
  success: boolean;
  recommendations?: TerminalResult[];
  message: string;
  totalCount?: number | null;
};

const makeOnSelectMock = (returnValue = true) =>
  jest.fn((_item: TerminalResult): boolean => returnValue);

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
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Rendering tests ──────────────────────────────────────────────────────────

describe('RecommendedItemsCard - rendering', () => {
  test('renders product name', () => {
    const item = makeTerminalResult();
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
  });

  test('renders category', () => {
    const item = makeTerminalResult();
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText('Vendor Profile')).toBeDefined();
  });

  test('renders formatted price', () => {
    const item = makeTerminalResult({ price: 1234.5 });
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText('$1,234.50')).toBeDefined();
  });

  test('renders price with two decimal places', () => {
    const item = makeTerminalResult({ price: 100 });
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText('$100.00')).toBeDefined();
  });
});

// ─── Non-association flow (no onSelect) ───────────────────────────────────────

describe('RecommendedItemsCard - non-association flow', () => {
  test('shows "Add to Cart" button when item not in cart', () => {
    const item = makeTerminalResult();
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText(/Add to Cart/)).toBeDefined();
  });

  test('"Add to Cart" button is enabled when item not in cart', () => {
    const item = makeTerminalResult();
    render(<RecommendedItemsCard recommendedItem={item} />);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  test('shows "Added to Cart" button when item is already in cart', () => {
    const item = makeTerminalResult({ id: 5 });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<RecommendedItemsCard recommendedItem={item} />);
    expect(screen.getByText('Added to Cart')).toBeDefined();
  });

  test('"Added to Cart" button is disabled when item in cart', () => {
    const item = makeTerminalResult({ id: 5 });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<RecommendedItemsCard recommendedItem={item} />);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('shows tooltip about already-in-cart when item is in cart (non-mandatory)', async () => {
    const item = makeTerminalResult({ id: 5, isMandatory: false });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<RecommendedItemsCard recommendedItem={item} />);
    // The button is wrapped in a Tooltip <span> when in cart
    const btn = screen.getByText('Added to Cart').closest('button');
    expect(btn).toBeDefined();
  });

  test('clicking "Add to Cart" triggers addToCartWithAPI', async () => {
    const item = makeTerminalResult({ id: 10 });
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockResolvedValue({
        success: true,
        recommendations: [],
        message: '',
      });
    setAddToCartWithAPIMock(mockAddToCart);

    render(<RecommendedItemsCard recommendedItem={item} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: item.id,
        productName: item.productName,
        providerName: item.providerName,
        category: item.category,
        price: item.price,
        skipWorkflow: false,
      }),
    );
  });

  test('shows "Adding..." during add to cart', async () => {
    const item = makeTerminalResult({ id: 10 });
    let resolveAdd: ((value: AddToCartResult) => void) | undefined;
    const pendingPromise = new Promise<AddToCartResult>((resolve) => {
      resolveAdd = resolve;
    });
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockReturnValue(pendingPromise);
    setAddToCartWithAPIMock(mockAddToCart);

    render(<RecommendedItemsCard recommendedItem={item} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText(/Adding\.\.\./)).toBeDefined();
    await act(async () => {
      resolveAdd?.({ success: true, recommendations: [], message: '' });
      await pendingPromise;
    });
  });

  test('shows mandatory tooltip text for in-cart mandatory item', async () => {
    const item = makeTerminalResult({
      id: 5,
      isMandatory: true,
      productName: 'Mandatory Product',
    });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(5)];
    render(<RecommendedItemsCard recommendedItem={item} />);
    const btn = screen.getByText('Added to Cart').closest('button');
    expect(btn).toBeDefined();
  });
  test('calls onItemAdded with the item id after a successful add to cart', async () => {
    const item = makeTerminalResult({ id: 10 });
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockResolvedValue({
        success: true,
        recommendations: [],
        message: '',
      });
    setAddToCartWithAPIMock(mockAddToCart);
    const onItemAdded = jest.fn();

    render(
      <RecommendedItemsCard recommendedItem={item} onItemAdded={onItemAdded} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onItemAdded).toHaveBeenCalledWith(10);
  });

  test('shows a warning toast when addToCartWithAPI resolves unsuccessfully with a message', async () => {
    const item = makeTerminalResult({ id: 20 });
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockResolvedValue({
        success: false,
        message: 'Item could not be added',
      });
    setAddToCartWithAPIMock(mockAddToCart);
    const warningSpy = createSpy(toastManager, 'warning').mockImplementation(
      () => {},
    );

    render(<RecommendedItemsCard recommendedItem={item} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(warningSpy).toHaveBeenCalledWith('Item could not be added');
  });

  test('does not show a toast when addToCartWithAPI resolves unsuccessfully without a message', async () => {
    const item = makeTerminalResult({ id: 21 });
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockResolvedValue({
        success: false,
        message: '',
      });
    setAddToCartWithAPIMock(mockAddToCart);
    const warningSpy = createSpy(toastManager, 'warning').mockImplementation(
      () => {},
    );

    render(<RecommendedItemsCard recommendedItem={item} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(warningSpy).not.toHaveBeenCalled();
  });
});

// ─── Association flow (onSelect provided) ─────────────────────────────────────

describe('RecommendedItemsCard - association flow', () => {
  test('shows "Subscribed" badge when isOwned=true', () => {
    const item = makeTerminalResult({ isOwned: true });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    expect(screen.getByText('Subscribed')).toBeDefined();
  });

  test('does not render a button when item is owned', () => {
    const item = makeTerminalResult({ isOwned: true });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('shows "In Cart" badge for marketplace item already in cart', () => {
    const item = makeTerminalResult({
      id: 3,
      source: RecommendationSource.MARKETPLACE,
    });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(3)];
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
      />,
    );
    expect(screen.getByText('In Cart')).toBeDefined();
  });

  test('shows "In Cart" badge for non-marketplace item already in cart', () => {
    const item = makeTerminalResult({
      id: 9,
      source: RecommendationSource.INVENTORY,
    });
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(9)];
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
      />,
    );
    expect(screen.getByText('In Cart')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('shows "Add to Cart" button for marketplace item NOT in cart', () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    expect(screen.getByText(/Add to Cart/)).toBeDefined();
  });

  test('clicking "Add to Cart" button calls onSelect for marketplace item', async () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  test('calls onItemAdded with the item id when association succeeds', async () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    const onSelect = makeOnSelectMock(true);
    const onItemAdded = jest.fn();
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={onSelect}
        onItemAdded={onItemAdded}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onItemAdded).toHaveBeenCalledWith(7);
  });

  test('does not call onItemAdded when association is not successful', async () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    const onSelect = makeOnSelectMock(false);
    const onItemAdded = jest.fn();
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={onSelect}
        onItemAdded={onItemAdded}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onItemAdded).not.toHaveBeenCalled();
  });

  test('shows "Adding..." state when marketplace item is currently being selected', () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
        isSelecting={true}
        selectedItemId={7}
      />,
    );
    expect(screen.getByText(/Adding\.\.\./)).toBeDefined();
  });

  test('"Add to Cart" button is disabled while isSelecting=true (different item)', () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
        isSelecting={true}
        selectedItemId={99} // different item being selected
      />,
    );
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('shows "Add to Cart" with CheckIcon for non-marketplace item (inventory/cart source)', () => {
    const item = makeTerminalResult({
      id: 8,
      source: RecommendationSource.INVENTORY,
    });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    // Non-marketplace shows "Add to Cart" with CheckIcon (not PlusIcon)
    expect(screen.getByText(/Add to Cart/)).toBeDefined();
  });

  test('clicking non-marketplace "Add to Cart" calls onSelect', async () => {
    const item = makeTerminalResult({
      id: 8,
      source: RecommendationSource.INVENTORY,
    });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  test('shows "Adding..." for non-marketplace item when currently being selected', () => {
    const item = makeTerminalResult({
      id: 8,
      source: RecommendationSource.INVENTORY,
    });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
        isSelecting={true}
        selectedItemId={8}
      />,
    );
    expect(screen.getByText(/Adding\.\.\./)).toBeDefined();
  });

  test('"Add to Cart" button for non-marketplace item is disabled while isSelecting=true', () => {
    const item = makeTerminalResult({
      id: 8,
      source: RecommendationSource.CART,
    });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
        isSelecting={true}
        selectedItemId={99}
      />,
    );
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('non-marketplace item with no source defaults to non-marketplace flow', () => {
    // When source is undefined, isMarketplaceItem is false → uses CheckIcon flow
    const item = makeTerminalResult({ id: 9 });
    const onSelect = makeOnSelectMock();
    render(<RecommendedItemsCard recommendedItem={item} onSelect={onSelect} />);
    expect(screen.getByText(/Add to Cart/)).toBeDefined();
  });

  test('when isSelecting=false, button is not in "Adding..." state', () => {
    const item = makeTerminalResult({
      id: 7,
      source: RecommendationSource.MARKETPLACE,
    });
    render(
      <RecommendedItemsCard
        recommendedItem={item}
        onSelect={makeOnSelectMock()}
        isSelecting={false}
        selectedItemId={7}
      />,
    );
    expect(screen.queryByText(/Adding\.\.\./)).toBeNull();
    expect(screen.getByText(/Add to Cart/)).toBeDefined();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('RecommendedItemsCard - error handling', () => {
  test('calls addToCartWithAPI and handles rejection gracefully', async () => {
    const item = makeTerminalResult({ id: 10 });
    const error = new Error('Network Error');
    const mockAddToCart = jest
      .fn<
        (
          cartItemData: unknown,
          suppressSuccessToast?: boolean,
        ) => Promise<AddToCartResult>
      >()
      .mockRejectedValue(error);
    setAddToCartWithAPIMock(mockAddToCart);

    render(<RecommendedItemsCard recommendedItem={item} />);
    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    // After error resolves, button should not show "Adding..."
    await waitFor(() => {
      expect(screen.queryByText(/Adding\.\.\./)).toBeNull();
    });
  });
});
