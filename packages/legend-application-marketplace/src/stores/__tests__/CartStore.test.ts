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

import { describe, expect, test } from '@jest/globals';
import { CartStore } from '../cart/CartStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import {
  TraderProfile,
  TraderProfileItem,
  TerminalResult,
  RecommendationSource,
  type CartItem,
} from '@finos/legend-server-marketplace';

describe('CartStore - isItemInCart', () => {
  test('returns false for empty cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);

    expect(cartStore.isItemInCart(123)).toBe(false);
  });

  test('returns true when item exists in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);

    // Manually add item to cart (vendor profile ID 1)
    const mockCartItem: CartItem = {
      cartId: 1,
      id: 123,
      productName: 'Test Product',
      providerName: 'Test Provider',
      category: 'Terminal',
      price: 100,
      description: 'Test Description',
      isOwned: 'false',
      model: 'Test Model',
      skipWorkflow: false,
    };

    cartStore.items[1] = [mockCartItem];

    expect(cartStore.isItemInCart(123)).toBe(true);
  });

  test('returns false for different item ID', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);

    const mockCartItem: CartItem = {
      cartId: 1,
      id: 123,
      productName: 'Test Product',
      providerName: 'Test Provider',
      category: 'Terminal',
      price: 100,
      description: 'Test Description',
      isOwned: 'false',
      model: 'Test Model',
      skipWorkflow: false,
    };

    cartStore.items[1] = [mockCartItem];

    expect(cartStore.isItemInCart(456)).toBe(false);
  });

  test('correctly iterates through for-in loop without redundant check', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);

    // Add multiple items across different vendors
    cartStore.items[1] = [
      {
        cartId: 1,
        id: 101,
        productName: 'Product 1',
        providerName: 'Provider 1',
        category: 'Terminal',
        price: 100,
        description: 'Desc 1',
        isOwned: 'false',
        model: 'Model 1',
        skipWorkflow: false,
      },
      {
        cartId: 2,
        id: 102,
        productName: 'Product 2',
        providerName: 'Provider 1',
        category: 'Add-On',
        price: 50,
        description: 'Desc 2',
        isOwned: 'false',
        model: 'Model 2',
        skipWorkflow: false,
      },
    ];

    cartStore.items[2] = [
      {
        cartId: 3,
        id: 201,
        productName: 'Product 3',
        providerName: 'Provider 2',
        category: 'Terminal',
        price: 200,
        description: 'Desc 3',
        isOwned: 'false',
        model: 'Model 3',
        skipWorkflow: false,
      },
    ];

    // Test that all items can be found
    expect(cartStore.isItemInCart(101)).toBe(true);
    expect(cartStore.isItemInCart(102)).toBe(true);
    expect(cartStore.isItemInCart(201)).toBe(true);

    // Test that non-existent items return false
    expect(cartStore.isItemInCart(999)).toBe(false);
  });

  test('handles multiple items with same vendor efficiently', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);

    // Add multiple items for the same vendor
    cartStore.items[1] = Array.from({ length: 5 }, (_, i) => ({
      cartId: i + 1,
      id: i + 1,
      productName: `Product ${i + 1}`,
      providerName: 'Provider 1',
      category: 'Terminal',
      price: 100,
      description: `Desc ${i + 1}`,
      isOwned: 'false',
      model: `Model ${i + 1}`,
      skipWorkflow: false,
    }));

    // Verify for-in loop correctly iterates and finds items
    expect(cartStore.isItemInCart(1)).toBe(true);
    expect(cartStore.isItemInCart(3)).toBe(true);
    expect(cartStore.isItemInCart(5)).toBe(true);
    expect(cartStore.isItemInCart(10)).toBe(false);
  });
});

// ─── Helper factories ─────────────────────────────────────────────────────────

const makeCartItem = (
  cartId: number,
  id: number,
  category: string,
): CartItem => ({
  cartId,
  id,
  productName: `Product ${id}`,
  providerName: 'Provider',
  category,
  price: 100,
  description: '',
  isOwned: 'false',
  skipWorkflow: false,
});

const makeTraderProfileItem = (
  id: number,
  category: string,
  model: string | null = null,
  isOwned = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = category;
  item.providerName = 'Bloomberg';
  item.productName = `Item ${id}`;
  item.price = 100;
  item.model = model;
  item.isOwned = isOwned;
  return item;
};

const makeTraderProfile = (
  items: TraderProfileItem[],
  multiselect = false,
  isOwned = false,
): TraderProfile => {
  const profile = new TraderProfile();
  profile.id = 1;
  profile.productName = 'Test Bundle';
  profile.providerName = 'Bloomberg';
  profile.price = 300;
  profile.multiselect = multiselect;
  profile.isOwned = isOwned;
  profile.items = items;
  return profile;
};

// ─── CartStore - cartItemIds ───────────────────────────────────────────────────

describe('CartStore - cartItemIds', () => {
  test('returns empty set for empty cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    expect(cartStore.cartItemIds.size).toBe(0);
  });

  test('returns all item IDs across all vendor profiles', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[1] = [
      makeCartItem(1, 101, 'Terminal'),
      makeCartItem(2, 102, 'Add-On'),
    ];
    cartStore.items[2] = [makeCartItem(3, 201, 'Terminal')];
    const ids = cartStore.cartItemIds;
    expect(ids.size).toBe(3);
    expect(ids.has(101)).toBe(true);
    expect(ids.has(102)).toBe(true);
    expect(ids.has(201)).toBe(true);
  });
});

// ─── CartStore - setOpen ──────────────────────────────────────────────────────

describe('CartStore - setOpen', () => {
  test('sets open to true', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    expect(cartStore.open).toBe(false);
    cartStore.setOpen(true);
    expect(cartStore.open).toBe(true);
  });

  test('sets open to false', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.setOpen(true);
    cartStore.setOpen(false);
    expect(cartStore.open).toBe(false);
  });
});

// ─── CartStore - setBusinessReason ───────────────────────────────────────────

describe('CartStore - setBusinessReason', () => {
  test('sets business reason', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.setBusinessReason('New Hire');
    expect(cartStore.businessReason).toBe('New Hire');
  });

  test('clears business reason with undefined', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.setBusinessReason('New Hire');
    cartStore.setBusinessReason(undefined);
    expect(cartStore.businessReason).toBeUndefined();
  });
});

// ─── CartStore - getDependentAddOns ───────────────────────────────────────────

describe('CartStore - getDependentAddOns', () => {
  test('returns empty array when cart is empty', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    expect(cartStore.getDependentAddOns(999)).toEqual([]);
  });

  test('returns empty array when cartId does not exist', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[1] = [makeCartItem(1, 101, 'Terminal')];
    expect(cartStore.getDependentAddOns(999)).toEqual([]);
  });

  test('returns empty array when target item is not a Terminal', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Add-On item (not a Terminal)
    cartStore.items[1] = [makeCartItem(1, 101, 'Add-On')];
    expect(cartStore.getDependentAddOns(1)).toEqual([]);
  });

  test('returns add-ons associated with a Terminal', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeCartItem(10, 101, 'Terminal');
    const addOn1 = makeCartItem(11, 102, 'Add-On');
    const addOn2 = makeCartItem(12, 103, 'Add-On');
    cartStore.items[1] = [terminal, addOn1, addOn2];
    const dependents = cartStore.getDependentAddOns(10);
    expect(dependents).toHaveLength(2);
    expect(dependents.some((i) => i.id === 102)).toBe(true);
    expect(dependents.some((i) => i.id === 103)).toBe(true);
  });

  test('does not include the terminal itself in returned add-ons', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeCartItem(10, 101, 'Terminal');
    const addOn = makeCartItem(11, 102, 'Add-On');
    cartStore.items[1] = [terminal, addOn];
    const dependents = cartStore.getDependentAddOns(10);
    expect(dependents.every((i) => i.cartId !== 10)).toBe(true);
  });

  test('returns empty array when Terminal has no add-ons', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeCartItem(10, 101, 'Terminal');
    cartStore.items[1] = [terminal];
    expect(cartStore.getDependentAddOns(10)).toEqual([]);
  });
});

// ─── CartStore - isOrderProfileInCart ────────────────────────────────────────

describe('CartStore - isOrderProfileInCart', () => {
  test('returns false for empty cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeTraderProfileItem(1, 'Vendor Profile');
    const profile = makeTraderProfile([terminal]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns true when all non-owned items are in cart (non-multiselect)', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[99] = [
      makeCartItem(1, 1, 'Terminal'),
      makeCartItem(2, 2, 'Add-On'),
    ];
    const terminal = makeTraderProfileItem(1, 'Vendor Profile');
    const addOn = makeTraderProfileItem(2, 'Market Data');
    const profile = makeTraderProfile([terminal, addOn]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });

  test('returns false when some items are missing from cart (non-multiselect)', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[99] = [makeCartItem(1, 1, 'Terminal')]; // Only terminal, not add-on
    const terminal = makeTraderProfileItem(1, 'Vendor Profile');
    const addOn = makeTraderProfileItem(2, 'Market Data');
    const profile = makeTraderProfile([terminal, addOn]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns false when all items are owned (non-multiselect)', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeTraderProfileItem(1, 'Vendor Profile', null, true);
    const profile = makeTraderProfile([terminal]);
    // nonOwnedItems is empty → length === 0 → returns false
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns true for multiselect when one terminal bundle is fully in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Terminal 1 with Model A in cart, Terminal 2 with Model B not in cart
    cartStore.items[99] = [
      makeCartItem(1, 1, 'Terminal'),
      makeCartItem(2, 2, 'Add-On'),
    ];
    const t1 = makeTraderProfileItem(1, 'Vendor Profile', 'Model A');
    const t2 = makeTraderProfileItem(3, 'Vendor Profile', 'Model B');
    const addOnA = makeTraderProfileItem(2, 'Market Data', 'Model A');
    const addOnB = makeTraderProfileItem(4, 'Market Data', 'Model B');
    const profile = makeTraderProfile([t1, t2, addOnA, addOnB], true);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });

  test('returns false for multiselect when no terminal bundle is fully in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Nothing in cart
    const t1 = makeTraderProfileItem(1, 'Vendor Profile', 'Model A');
    const addOnA = makeTraderProfileItem(2, 'Market Data', 'Model A');
    const profile = makeTraderProfile([t1, addOnA], true);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns false for multiselect when terminal in cart but add-on missing', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[99] = [makeCartItem(1, 1, 'Terminal')]; // Terminal only, no add-on
    const t1 = makeTraderProfileItem(1, 'Vendor Profile', 'Model A');
    const addOnA = makeTraderProfileItem(2, 'Market Data', 'Model A');
    const profile = makeTraderProfile([t1, addOnA], true);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });
});

// ─── CartStore - providerToCartRequest ───────────────────────────────────────

describe('CartStore - providerToCartRequest', () => {
  const makeProvider = (
    overrides: Partial<TerminalResult> = {},
  ): TerminalResult => {
    const provider = new TerminalResult();
    provider.id = overrides.id ?? 1;
    provider.category = overrides.category ?? 'Vendor Profile';
    provider.providerName = overrides.providerName ?? 'Bloomberg';
    provider.productName = overrides.productName ?? 'Bloomberg Terminal';
    provider.description = overrides.description ?? 'A terminal';
    provider.price = overrides.price ?? 2000;
    provider.phystr = overrides.phystr ?? 'phystr-1';
    // Use !== undefined so that explicit null is preserved (not swallowed by ??)
    provider.model =
      overrides.model !== undefined ? overrides.model : 'Model X';
    provider.isOwned = overrides.isOwned ?? false;
    provider.skipWorkflow = overrides.skipWorkflow ?? false;
    if (overrides.vendorProfileId !== undefined) {
      provider.vendorProfileId = overrides.vendorProfileId;
    }
    if (overrides.permissionId !== undefined) {
      provider.permissionId = overrides.permissionId;
    }
    if (overrides.source !== undefined) {
      provider.source = overrides.source;
    }
    return provider;
  };

  test('builds cart request from provider', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider();
    const request = cartStore.providerToCartRequest(provider);
    expect(request.id).toBe(1);
    expect(request.productName).toBe('Bloomberg Terminal');
    expect(request.providerName).toBe('Bloomberg');
    expect(request.price).toBe(2000);
    expect(request.model).toBe('Model X');
    expect(request.skipWorkflow).toBe(false);
  });

  test('uses permissionId as id when source is INVENTORY', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({
      id: 10,
      permissionId: 99,
      source: RecommendationSource.INVENTORY,
    });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.id).toBe(99); // Uses permissionId
  });

  test('uses provider id when source is not INVENTORY', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({
      id: 10,
      permissionId: 99,
      source: RecommendationSource.MARKETPLACE,
    });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.id).toBe(10); // Uses provider id
  });

  test('falls back to productName when model is null', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({ model: null });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.model).toBe('Bloomberg Terminal'); // productName fallback
  });

  test('includes vendorProfileId when present', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({ vendorProfileId: 42 });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.vendorProfileId).toBe(42);
  });

  test('omits vendorProfileId when undefined', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({});
    const request = cartStore.providerToCartRequest(provider);
    expect('vendorProfileId' in request).toBe(false);
  });

  test('includes permissionId when present', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({ permissionId: 77 });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.permissionId).toBe(77);
  });

  test('includes source when present', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({ source: RecommendationSource.CART });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.source).toBe(RecommendationSource.CART);
  });

  test('omits source when undefined', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({});
    const request = cartStore.providerToCartRequest(provider);
    expect('source' in request).toBe(false);
  });

  test('encodes isOwned as string', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const ownedProvider = makeProvider({ isOwned: true });
    const req = cartStore.providerToCartRequest(ownedProvider);
    expect(req.isOwned).toBe('true');

    const notOwnedProvider = makeProvider({ isOwned: false });
    const req2 = cartStore.providerToCartRequest(notOwnedProvider);
    expect(req2.isOwned).toBe('false');
  });

  test('uses provider id when INVENTORY source but no permissionId', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const provider = makeProvider({
      id: 55,
      source: RecommendationSource.INVENTORY,
    });
    const request = cartStore.providerToCartRequest(provider);
    expect(request.id).toBe(55); // Falls back to provider.id
  });
});

// ─── CartStore - cartUser ──────────────────────────────────────────────────────

describe('CartStore - cartUser', () => {
  test('returns currentUser when targetUser is undefined', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // targetUser is undefined by default
    const user = cartStore.cartUser;
    // currentUser from identityService (empty string in test env)
    expect(typeof user).toBe('string');
  });

  test('returns targetUser when set', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.targetUser = 'custom-user';
    expect(cartStore.cartUser).toBe('custom-user');
  });
});

// ─── CartStore - BUSINESS_REASONS ─────────────────────────────────────────────

describe('CartStore - BUSINESS_REASONS', () => {
  test('exposes BUSINESS_REASONS static enum', async () => {
    expect(CartStore.BUSINESS_REASONS.NEW_HIRE).toBe('New Hire');
    expect(CartStore.BUSINESS_REASONS.NEW_ROLE).toBe('New Role');
    expect(CartStore.BUSINESS_REASONS.USER_MOVE).toBe('User Move');
    expect(CartStore.BUSINESS_REASONS.TRANSFER).toBe('Transfer');
    expect(CartStore.BUSINESS_REASONS.OTHER_REASON).toBe('Other Reason');
  });
});
