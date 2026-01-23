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
import type { CartItem } from '@finos/legend-server-marketplace';

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
