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
import { flowResult } from 'mobx';
import { CartStore } from '../cart/CartStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import {
  TraderProfile,
  TraderProfileItem,
  TerminalResult,
  RecommendationSource,
  type CartItem,
  type CartItemRequest,
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
  model?: string,
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
  ...(model === undefined ? {} : { model }),
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
      makeCartItem(1, 1, 'Terminal', 'Model A'),
      makeCartItem(2, 2, 'Add-On', 'Model A'),
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
    // Use === undefined so that explicit null is preserved (not swallowed by ??)
    provider.model =
      overrides.model === undefined ? 'Model X' : overrides.model;
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

// ─── Helpers for permissionId tests ──────────────────────────────────────────

// makePermissionItem creates a non-terminal (addon) item with a permissionId,
// matching the real-world case where Exchange/DACS/etc. addons carry a permissionId.
const makePermissionItem = (
  id: number,
  permissionId: number,
  model: string | null = 'Model A',
  isOwned = false,
): TraderProfileItem => {
  const item = makeTraderProfileItem(id, 'Exchange', model, isOwned);
  item.permissionId = permissionId;
  return item;
};

const mockAddToCartWithAPI = (
  cartStore: CartStore,
  captured: CartItemRequest[],
): void => {
  (cartStore as unknown as Record<string, unknown>).addToCartWithAPI = (
    data: CartItemRequest,
  ): Promise<{ success: boolean; recommendations: []; message: string }> => {
    captured.push(data);
    return Promise.resolve({
      success: true,
      recommendations: [],
      message: 'ok',
    });
  };
};

// ─── CartStore - isOrderProfileInCart (model-aware add-on checks) ────────────

describe('CartStore - isOrderProfileInCart (model-aware add-on checks)', () => {
  test('returns true when add-on is in cart with matching item.id and model', async () => {
    // In-cart check uses item.id + model, not permissionId as cart key.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Cart keyed by item.id (476) with matching model 'Model A'.
    cartStore.items[99] = [makeCartItem(1, 476, 'Exchange', 'Model A')];
    const item = makePermissionItem(476, 213590620, 'Model A', false);
    const profile = makeTraderProfile([item]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });

  test('returns false when add-on is not in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const item = makePermissionItem(476, 213590620, 'Model A', false);
    const profile = makeTraderProfile([item]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns false when all items are owned (nothing to add)', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[99] = [makeCartItem(1, 476, 'Exchange', 'Model A')];
    const item = makePermissionItem(476, 213590620, 'Model A', true); // isOwned=true
    const profile = makeTraderProfile([item]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('returns false when cart item model does not match add-on model', async () => {
    // Item id=476 is in cart but with a different model — model-aware check
    // correctly treats it as a distinct slot and returns false.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Cart has id=476 with no model (null).
    cartStore.items[1] = [makeCartItem(1, 476, 'Exchange')];
    const item = makePermissionItem(476, 213590620, 'Model A', false);
    const profile = makeTraderProfile([item]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('requires every add-on to be in cart with its own id and model', async () => {
    // Two add-ons that share the same permissionId but have different ids both
    // require separate cart entries (no deduplication by permissionId).
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[1] = [makeCartItem(1, 476, 'Exchange', 'Model A')];
    cartStore.items[2] = [makeCartItem(2, 225219467, 'Exchange', 'Model A')];
    const item1 = makePermissionItem(476, 213590620, 'Model A', false);
    const item2 = makePermissionItem(225219467, 213590620, 'Model A', false);
    const profile = makeTraderProfile([item1, item2]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });

  test('returns false when only some add-ons are in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Only item1 (id=10, model=A) in cart; item2 (id=20, model=A) missing.
    cartStore.items[1] = [makeCartItem(1, 10, 'Exchange', 'Model A')];
    const item1 = makePermissionItem(10, 111, 'Model A', false);
    const item2 = makePermissionItem(20, 222, 'Model A', false);
    const profile = makeTraderProfile([item1, item2]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('handles mixed profile: add-on with permissionId and regular add-on all in cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // permissionId add-on in cart keyed by item.id (476) with matching model.
    cartStore.items[99] = [
      makeCartItem(1, 476, 'Exchange', 'Model A'),
      // Regular add-on (no model — null) also in cart.
      makeCartItem(2, 500, 'Exchange'),
    ];
    const pidItem = makePermissionItem(476, 213590620, 'Model A', false);
    const regularItem = makeTraderProfileItem(500, 'Exchange', null, false);
    const profile = makeTraderProfile([pidItem, regularItem]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });

  test('returns false for mixed profile when regular add-on is missing from cart', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    cartStore.items[99] = [makeCartItem(1, 476, 'Exchange', 'Model A')];
    // Regular item (id=500) NOT in cart.
    const pidItem = makePermissionItem(476, 213590620, 'Model A', false);
    const regularItem = makeTraderProfileItem(500, 'Exchange', null, false);
    const profile = makeTraderProfile([pidItem, regularItem]);
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);
  });

  test('same product id under two different models requires two separate cart entries', async () => {
    // This is the core bug: ECOMMODNY (id=225248836) appears under both
    // 'Internal Application' and 'Internal Application (LAB)'.  The in-cart
    // flag must be false until it has been added for each model individually.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const terminal = makeTraderProfileItem(
      1340,
      'Vendor Profile',
      'Internal Application (LAB)',
      false,
    );
    const addOnIA = makeTraderProfileItem(
      225248836,
      'DACS - Internal Source',
      'Internal Application',
      false,
    );
    const addOnLAB = makeTraderProfileItem(
      225248836,
      'DACS - Internal Source',
      'Internal Application (LAB)',
      false,
    );
    const profile = makeTraderProfile([terminal, addOnIA, addOnLAB]);

    // Only the IA instance in cart — the profile is NOT fully in cart yet.
    cartStore.items[99] = [
      makeCartItem(
        1,
        225248836,
        'DACS - Internal Source',
        'Internal Application',
      ),
    ];
    expect(cartStore.isOrderProfileInCart(profile)).toBe(false);

    // Add terminal and the LAB add-on as well.
    cartStore.items[100] = [makeCartItem(2, 1340, 'Vendor Profile')];
    cartStore.items[101] = [
      makeCartItem(
        3,
        225248836,
        'DACS - Internal Source',
        'Internal Application (LAB)',
      ),
    ];
    expect(cartStore.isOrderProfileInCart(profile)).toBe(true);
  });
});

// ─── CartStore - addOrderProfileItemsToCart ───────────────────────────────────

describe('CartStore - addOrderProfileItemsToCart', () => {
  test('uses actual item id and category with permissionId in payload for add-ons with their own permissionId', async () => {
    // Add-ons that carry their own permissionId must NOT be sent with the
    // synthetic 'Permission ID' category.  They use their real id and category,
    // and the permissionId is passed as a payload field for the backend.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const item = makePermissionItem(
      476,
      213590620,
      'Internal Application',
      false,
    );
    item.productName = 'Internal Application';
    item.providerName = 'Reuters';
    item.price = 0;

    await flowResult(cartStore.addOrderProfileItemsToCart([item]));

    expect(captured).toHaveLength(1);
    const req0 = captured[0] as CartItemRequest;
    expect(req0.id).toBe(476); // actual item.id, not permissionId
    expect(req0.category).toBe('Exchange'); // actual category, not 'Permission ID'
    expect(req0.permissionId).toBe(213590620); // permissionId still in payload
    expect('source' in req0).toBe(false);
    expect(req0.isOwned).toBe('false');
    expect(req0.skipWorkflow).toBe(true);
    expect(req0.productName).toBe('Internal Application');
    expect(req0.providerName).toBe('Reuters');
    expect(req0.model).toBe('Internal Application');
  });

  test('skips owned addon items with permissionId', async () => {
    // isOwned=true addon items are skipped even when they carry a permissionId.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const ownedItem = makePermissionItem(476, 213590620, 'Model A', true); // isOwned=true
    await flowResult(cartStore.addOrderProfileItemsToCart([ownedItem]));

    expect(captured).toHaveLength(0);
  });

  test('each add-on is submitted with its own id regardless of shared permissionId', async () => {
    // No permissionId-based deduplication: three add-ons that share the same
    // permissionId must each produce a separate cart call with their own id.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const item1 = makePermissionItem(476, 213590620, 'Model A', false);
    const item2 = makePermissionItem(225219467, 213590620, 'Model A', false);
    const item3 = makePermissionItem(225248836, 213590620, 'Model A', false);

    await flowResult(
      cartStore.addOrderProfileItemsToCart([item1, item2, item3]),
    );

    // All three submitted separately with their actual ids.
    expect(captured).toHaveLength(3);
    expect(captured.map((r) => r.id).sort((a, b) => a - b)).toEqual(
      [476, 225219467, 225248836].sort((a, b) => a - b),
    );
    // Each carries the shared permissionId and actual category.
    expect(captured.every((r) => r.permissionId === 213590620)).toBe(true);
    expect(captured.every((r) => r.category === 'Exchange')).toBe(true);
  });

  test('item is added even if its permissionId is already in cart under a different id', async () => {
    // The old permissionId-based skip is removed.  Having permissionId=213590620
    // in the cart must not prevent item.id=476 from being submitted — they are
    // distinct cart entries.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    // Pre-populate cart with the OLD-style 'Permission ID' entry (id=213590620).
    cartStore.items[213590620] = [makeCartItem(1, 213590620, 'Permission ID')];
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const item = makePermissionItem(476, 213590620, 'Model A', false);
    await flowResult(cartStore.addOrderProfileItemsToCart([item]));

    // Item is still submitted with its actual id.
    expect(captured).toHaveLength(1);
    const reqPid = captured[0] as CartItemRequest;
    expect(reqPid.id).toBe(476);
    expect(reqPid.permissionId).toBe(213590620);
  });

  test('regular items without permissionId still skip when owned', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const ownedRegular = makeTraderProfileItem(99, 'Exchange', null, true); // no permissionId, isOwned
    await flowResult(cartStore.addOrderProfileItemsToCart([ownedRegular]));

    expect(captured).toHaveLength(0);
  });

  test('regular items without permissionId are added with original id and category', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const regularItem = makeTraderProfileItem(99, 'Exchange', 'Model X', false);
    regularItem.providerName = 'Bloomberg';
    regularItem.productName = 'Item 99';
    await flowResult(cartStore.addOrderProfileItemsToCart([regularItem]));

    expect(captured).toHaveLength(1);
    const reqReg = captured[0] as CartItemRequest;
    expect(reqReg.id).toBe(99);
    expect(reqReg.category).toBe('Exchange');
    expect('permissionId' in reqReg).toBe(false);
  });

  test('handles mixed batch: add-on with permissionId, regular add-on, and owned item', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const pidItem = makePermissionItem(476, 213590620, 'Model A', false);
    const regularItem = makeTraderProfileItem(500, 'Exchange', null, false);
    const ownedRegular = makeTraderProfileItem(600, 'Exchange', null, true);

    await flowResult(
      cartStore.addOrderProfileItemsToCart([
        pidItem,
        regularItem,
        ownedRegular,
      ]),
    );

    // pidItem → actual id/category + permissionId, regularItem → normal, ownedRegular → skipped.
    expect(captured).toHaveLength(2);
    const pidRequest = captured.find((r) => r.id === 476);
    const regularRequest = captured.find((r) => r.id === 500);
    expect(pidRequest?.category).toBe('Exchange'); // actual category
    expect(pidRequest?.permissionId).toBe(213590620);
    expect(regularRequest?.category).toBe('Exchange');
    expect('permissionId' in (regularRequest as CartItemRequest)).toBe(false);
  });

  test('two add-ons with same id but different models are both submitted (bug-report scenario)', async () => {
    // ECOMMODNY (id=225248836) appears under two vendor profiles:
    //   - Internal Application (owned terminal, permissionId=213590620)
    //   - Internal Application (LAB) (non-owned terminal, no permissionId)
    // Old code would add the first as a "Permission ID" entry, then
    // isItemInCart(213590620) == true would silently skip the second.
    // New code submits both with their actual ids.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const terminalOwned = makeTraderProfileItem(
      476,
      'Vendor Profile',
      'Internal Application',
      true, // isOwned
    );
    terminalOwned.permissionId = 213590620;

    const terminalLAB = makeTraderProfileItem(
      1340,
      'Vendor Profile',
      'Internal Application (LAB)',
      false,
    );

    // Same product (ECOMMODNY) under each terminal model.
    const addOnIA = makePermissionItem(
      225248836,
      213590620,
      'Internal Application',
      false,
    );
    addOnIA.productName = 'ECOMMODNY';

    const addOnLAB = makeTraderProfileItem(
      225248836,
      'DACS - Internal Source',
      'Internal Application (LAB)',
      false,
    );
    addOnLAB.productName = 'ECOMMODNY';

    await flowResult(
      cartStore.addOrderProfileItemsToCart([
        terminalOwned,
        terminalLAB,
        addOnIA,
        addOnLAB,
      ]),
    );

    // 3 calls: Terminal LAB (not owned), Add-on IA, Add-on LAB.
    // Terminal IA is skipped (isOwned=true).
    expect(captured).toHaveLength(3);

    const terminalLABReq = captured.find((r) => r.id === 1340);
    const addOnIAReq = captured.find(
      (r) => r.id === 225248836 && r.model === 'Internal Application',
    );
    const addOnLABReq = captured.find(
      (r) => r.id === 225248836 && r.model === 'Internal Application (LAB)',
    );

    expect(terminalLABReq).toBeDefined();
    expect(terminalLABReq?.category).toBe('Vendor Profile');

    // Add-on IA: carries its own permissionId (from makePermissionItem)
    // and vendorProfileId derived from terminal 476.
    expect(addOnIAReq).toBeDefined();
    expect(addOnIAReq?.category).toBe('Exchange');
    expect(addOnIAReq?.permissionId).toBe(213590620);
    expect(addOnIAReq?.vendorProfileId).toBe(476);

    // Add-on LAB: no permissionId (parent terminal is not owned),
    // vendorProfileId derived from terminal 1340.
    expect(addOnLABReq).toBeDefined();
    expect(addOnLABReq?.category).toBe('DACS - Internal Source');
    expect('permissionId' in (addOnLABReq as CartItemRequest)).toBe(false);
    expect(addOnLABReq?.vendorProfileId).toBe(1340);
  });

  // ─── Owned-terminal permissionId propagation ───────────────────────────────

  test('propagates owned terminal permissionId to add-ons with matching model', async () => {
    // Scenario: an order profile with two vendor-profile terminals from the
    // same vendor. Terminal B is owned and carries permissionId=999. The add-on
    // associated with Terminal B (model="Model B") should get permissionId=999
    // in its cart payload even though the add-on itself has no permissionId.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    // Terminal A: not owned, model="Model A"
    const terminalA = makeTraderProfileItem(
      1,
      'Vendor Profile',
      'Model A',
      false,
    );
    terminalA.productName = 'Terminal A';
    terminalA.providerName = 'Reuters';
    terminalA.price = 200;

    // Terminal B: owned, model="Model B", permissionId=999
    const terminalB = makeTraderProfileItem(
      2,
      'Vendor Profile',
      'Model B',
      true,
    );
    terminalB.productName = 'Terminal B';
    terminalB.providerName = 'Reuters';
    terminalB.price = 200;
    terminalB.permissionId = 999;

    // Add-on for Model A (no permissionId)
    const addOnA = makeTraderProfileItem(10, 'Exchange', 'Model A', false);
    addOnA.productName = 'Exchange A';
    addOnA.providerName = 'Reuters';
    addOnA.price = 50;

    // Add-on for Model B (same id as addOnA, different model — the overlapping case)
    const addOnB = makeTraderProfileItem(10, 'Exchange', 'Model B', false);
    addOnB.productName = 'Exchange A';
    addOnB.providerName = 'Reuters';
    addOnB.price = 50;

    await flowResult(
      cartStore.addOrderProfileItemsToCart([
        terminalA,
        terminalB,
        addOnA,
        addOnB,
      ]),
    );

    // 3 calls: Terminal A (not owned), Add-on for Model A, Add-on for Model B
    // Terminal B is skipped (isOwned=true).
    expect(captured).toHaveLength(3);

    const terminalAReq = captured.find(
      (r) => r.category === 'Vendor Profile' && r.id === 1,
    );
    const addOnAReq = captured.find(
      (r) => r.category === 'Exchange' && !r.permissionId,
    );
    const addOnBReq = captured.find(
      (r) => r.category === 'Exchange' && r.permissionId === 999,
    );

    // Terminal A is added normally without permissionId.
    expect(terminalAReq).toBeDefined();
    expect('permissionId' in (terminalAReq as CartItemRequest)).toBe(false);

    // Add-on for Model A has no owned-terminal permissionId — normal payload.
    expect(addOnAReq).toBeDefined();
    expect(addOnAReq?.model).toBe('Model A');

    // Add-on for Model B inherits Terminal B's permissionId=999.
    expect(addOnBReq).toBeDefined();
    expect(addOnBReq?.id).toBe(10);
    expect(addOnBReq?.model).toBe('Model B');
    expect(addOnBReq?.permissionId).toBe(999);
  });

  test('does not propagate permissionId to add-ons whose model does not match the owned terminal', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    // Owned terminal for "Model B" with permissionId=999.
    const ownedTerminal = makeTraderProfileItem(
      2,
      'Vendor Profile',
      'Model B',
      true,
    );
    ownedTerminal.permissionId = 999;

    // Add-on for a different model — should NOT get permissionId.
    const addOnC = makeTraderProfileItem(20, 'Exchange', 'Model C', false);
    addOnC.productName = 'Exchange C';
    addOnC.providerName = 'Reuters';
    addOnC.price = 50;

    await flowResult(
      cartStore.addOrderProfileItemsToCart([ownedTerminal, addOnC]),
    );

    expect(captured).toHaveLength(1);
    const reqC = captured[0] as CartItemRequest;
    expect(reqC.id).toBe(20);
    expect('permissionId' in reqC).toBe(false);
  });

  test('terminals are submitted before their add-ons regardless of input order', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const addOn = makeTraderProfileItem(10, 'Exchange', 'Model A', false);
    addOn.productName = 'Add-On X';
    addOn.providerName = 'Reuters';
    addOn.price = 50;

    const terminal = makeTraderProfileItem(
      1,
      'Vendor Profile',
      'Model A',
      false,
    );
    terminal.productName = 'Terminal A';
    terminal.providerName = 'Reuters';
    terminal.price = 200;

    // Pass add-on before terminal intentionally to verify internal reordering.
    await flowResult(cartStore.addOrderProfileItemsToCart([addOn, terminal]));

    expect(captured).toHaveLength(2);
    // Terminal must appear first in the captured sequence.
    expect((captured[0] as CartItemRequest).category).toBe('Vendor Profile');
    expect((captured[1] as CartItemRequest).category).toBe('Exchange');
  });

  test('all 18 non-owned items are submitted with correct vendorProfileId (full order profile regression)', async () => {
    // Regression: Order profile with 2 terminals (1 owned, 1 not) and 18 add-ons.
    // 7 add-on IDs appear under BOTH models. Without vendorProfileId the server
    // deduplicates by item id, resulting in only 11 cart entries instead of 18.
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const cartStore = new CartStore(baseStore);
    const captured: CartItemRequest[] = [];
    mockAddToCartWithAPI(cartStore, captured);

    const terminalIA = makeTraderProfileItem(
      476,
      'Vendor Profile',
      'Internal Application',
      true,
    );
    terminalIA.permissionId = 213590620;

    const ownedExchange = makeTraderProfileItem(
      225219467,
      'Exchange',
      'Internal Application',
      true,
    );
    ownedExchange.permissionId = 213590620;

    const terminalLAB = makeTraderProfileItem(
      1340,
      'Vendor Profile',
      'Internal Application (LAB)',
      false,
    );

    // 7 non-owned add-ons under IA model (all carry permissionId=213590620)
    const iaAddonIds = [
      225248836, 225247298, 225232118, 225249183, 225214584, 225214585,
      225214583,
    ];
    const iaAddons = iaAddonIds.map((id) => {
      const item = makeTraderProfileItem(
        id,
        'Exchange',
        'Internal Application',
        false,
      );
      item.permissionId = 213590620;
      return item;
    });

    // 10 non-owned add-ons under LAB model (7 share IDs with IA, 3 unique)
    const labAddonIds = [
      225219467, 225100490, 225248836, 225247298, 225232118, 225249183,
      225214584, 225214585, 225202410, 225214583,
    ];
    const labAddons = labAddonIds.map((id) =>
      makeTraderProfileItem(
        id,
        'Exchange',
        'Internal Application (LAB)',
        false,
      ),
    );

    const allItems = [
      terminalIA,
      ownedExchange,
      ...iaAddons,
      terminalLAB,
      ...labAddons,
    ];

    await flowResult(cartStore.addOrderProfileItemsToCart(allItems, true));

    // Expected: 18 API calls (skip 2 owned: terminalIA + ownedExchange)
    // = 1 terminal (LAB) + 7 IA add-ons + 10 LAB add-ons
    expect(captured).toHaveLength(18);

    // Terminal LAB is first (terminals before add-ons)
    const firstReq = captured[0] as CartItemRequest;
    expect(firstReq.id).toBe(1340);
    expect(firstReq.category).toBe('Vendor Profile');

    // All IA add-ons carry vendorProfileId=476
    const iaRequests = captured.filter(
      (r) => r.model === 'Internal Application',
    );
    expect(iaRequests).toHaveLength(7);
    for (const req of iaRequests) {
      expect(req.vendorProfileId).toBe(476);
      expect(req.permissionId).toBe(213590620);
    }

    // All LAB add-ons carry vendorProfileId=1340
    const labRequests = captured.filter(
      (r) =>
        r.model === 'Internal Application (LAB)' &&
        r.category !== 'Vendor Profile',
    );
    expect(labRequests).toHaveLength(10);
    for (const req of labRequests) {
      expect(req.vendorProfileId).toBe(1340);
    }
  });
});
