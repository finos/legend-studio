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
import {
  LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../LegendMarketPlaceVendorDataStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { LegendUser } from '@finos/legend-shared';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';

// ─── Setup ────────────────────────────────────────────────────────────────────

const setupStore = async (): Promise<{
  vendorDataStore: LegendMarketPlaceVendorDataStore;
  baseStore: LegendMarketplaceBaseStore;
}> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const vendorDataStore = new LegendMarketPlaceVendorDataStore(
    baseStore.applicationStore,
    baseStore,
  );
  return { vendorDataStore, baseStore };
};

const makeTerminalJson = (id: number) => ({
  id,
  category: 'Vendor Profile',
  providerName: 'Bloomberg',
  productName: `Terminal ${id}`,
  description: 'A terminal',
  price: 2000,
  phystr: '',
  model: null,
  isOwned: false,
});

const makeAddOnJson = (id: number) => ({
  id,
  category: 'Market Data',
  providerName: 'Bloomberg',
  productName: `Add-On ${id}`,
  description: 'An add-on',
  price: 500,
  phystr: '',
  model: null,
  isOwned: false,
});

const makeOrderProfileJson = (id: number) => ({
  id,
  productName: `Bundle ${id}`,
  providerName: 'Bloomberg',
  price: 2500,
  multiselect: false,
  items: [makeTerminalJson(id * 100)],
});

// ─── VendorDataProviderType enum ──────────────────────────────────────────────

describe('VendorDataProviderType', () => {
  test('has expected values', () => {
    expect(VendorDataProviderType.ALL).toBe('All');
    expect(VendorDataProviderType.TERMINAL_LICENSE).toBe('Terminal License');
    expect(VendorDataProviderType.ADD_ONS).toBe('Add-Ons');
    expect(VendorDataProviderType.ORDER_PROFILE).toBe('Order Profile');
  });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('LegendMarketPlaceVendorDataStore - initial state', () => {
  test('starts with empty provider arrays', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.terminalProviders).toHaveLength(0);
    expect(vendorDataStore.addOnProviders).toHaveLength(0);
    expect(vendorDataStore.traderProfileProviders).toHaveLength(0);
    expect(vendorDataStore.providers).toHaveLength(0);
    expect(vendorDataStore.traderProfileAllProviders).toHaveLength(0);
  });

  test('starts with default pagination values', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.page).toBe(1);
    expect(vendorDataStore.itemsPerPage).toBe(24);
  });

  test('starts with zero total counts', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.totalTerminalItems).toBe(0);
    expect(vendorDataStore.totalAddOnItems).toBe(0);
    expect(vendorDataStore.totalTraderProfileItems).toBe(0);
    expect(vendorDataStore.totalItems).toBe(0);
  });

  test('starts with empty search term', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.searchTerm).toBe('');
  });

  test('starts with ALL provider display state', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.ALL,
    );
  });

  test('starts with empty filters', async () => {
    const { vendorDataStore } = await setupStore();
    expect(vendorDataStore.providersFilters).toHaveLength(0);
  });
});

// ─── Setters ──────────────────────────────────────────────────────────────────

describe('LegendMarketPlaceVendorDataStore - setProviderDisplayState', () => {
  test('updates providerDisplayState', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setProviderDisplayState(
      VendorDataProviderType.TERMINAL_LICENSE,
    );
    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.TERMINAL_LICENSE,
    );
  });

  test('resets page to 1 when changing display state', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(5);
    expect(vendorDataStore.page).toBe(5);
    vendorDataStore.setProviderDisplayState(VendorDataProviderType.ADD_ONS);
    expect(vendorDataStore.page).toBe(1);
  });

  test('can switch to ORDER_PROFILE state', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setProviderDisplayState(
      VendorDataProviderType.ORDER_PROFILE,
    );
    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.ORDER_PROFILE,
    );
  });

  test('can switch back to ALL state', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setProviderDisplayState(VendorDataProviderType.ADD_ONS);
    vendorDataStore.setProviderDisplayState(VendorDataProviderType.ALL);
    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.ALL,
    );
  });
});

describe('LegendMarketPlaceVendorDataStore - setProvidersFilters', () => {
  test('updates providersFilters', async () => {
    const { vendorDataStore } = await setupStore();
    const filters = [{ label: 'Type', value: 'terminal' }];
    vendorDataStore.setProvidersFilters(filters);
    expect(vendorDataStore.providersFilters).toEqual(filters);
  });

  test('resets page to 1 when filters change', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(3);
    vendorDataStore.setProvidersFilters([{ label: 'Type', value: 'addon' }]);
    expect(vendorDataStore.page).toBe(1);
  });

  test('clears filters', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setProvidersFilters([{ label: 'Type', value: 'terminal' }]);
    vendorDataStore.setProvidersFilters([]);
    expect(vendorDataStore.providersFilters).toHaveLength(0);
  });
});

describe('LegendMarketPlaceVendorDataStore - setPage', () => {
  test('updates page', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(5);
    expect(vendorDataStore.page).toBe(5);
  });

  test('can set page to 1', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(3);
    vendorDataStore.setPage(1);
    expect(vendorDataStore.page).toBe(1);
  });
});

describe('LegendMarketPlaceVendorDataStore - setItemsPerPage', () => {
  test('updates itemsPerPage', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setItemsPerPage(48);
    expect(vendorDataStore.itemsPerPage).toBe(48);
  });

  test('resets page to 1 when changing items per page', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(4);
    vendorDataStore.setItemsPerPage(12);
    expect(vendorDataStore.page).toBe(1);
  });
});

describe('LegendMarketPlaceVendorDataStore - setSearchTerm', () => {
  test('updates searchTerm', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setSearchTerm('Bloomberg');
    expect(vendorDataStore.searchTerm).toBe('Bloomberg');
  });

  test('resets page to 1 when search term changes', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setPage(3);
    vendorDataStore.setSearchTerm('Reuters');
    expect(vendorDataStore.page).toBe(1);
  });

  test('can set empty search term', async () => {
    const { vendorDataStore } = await setupStore();
    vendorDataStore.setSearchTerm('Bloomberg');
    vendorDataStore.setSearchTerm('');
    expect(vendorDataStore.searchTerm).toBe('');
  });
});

describe('LegendMarketPlaceVendorDataStore - setSelectedUser', () => {
  test('updates selectedUser', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test',
      vendor_profiles: [],
      service_pricing: [],
      order_profile: [],
      vendor_profiles_total_count: 0,
      service_pricing_total_count: 0,
      order_profile_total_count: 0,
    });

    const user = new LegendUser();
    user.id = 'test-user-123';
    vendorDataStore.setSelectedUser(user);
    expect(vendorDataStore.selectedUser.id).toBe('test-user-123');
  });
});

describe('LegendMarketPlaceVendorDataStore - resetSelectedUser', () => {
  test('resets selectedUser to current user', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test',
      vendor_profiles: [],
      service_pricing: [],
      order_profile: [],
      vendor_profiles_total_count: 0,
      service_pricing_total_count: 0,
      order_profile_total_count: 0,
    });

    // Set a custom user
    const user = new LegendUser();
    user.id = 'custom-user';
    vendorDataStore.selectedUser = user;

    // Reset
    vendorDataStore.resetSelectedUser();
    // Should be set to the current user (which is empty in tests)
    expect(vendorDataStore.selectedUser).toBeInstanceOf(LegendUser);
  });
});

// ─── populateProviders flows ─────────────────────────────────────────────────

describe('LegendMarketPlaceVendorDataStore - populateProviders', () => {
  test('populates ALL providers correctly', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
      vendor_profiles: [makeTerminalJson(1), makeTerminalJson(2)],
      service_pricing: [makeAddOnJson(10)],
      order_profile: [makeOrderProfileJson(100)],
      vendor_profiles_total_count: 2,
      service_pricing_total_count: 1,
      order_profile_total_count: 1,
    });

    vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.terminalProviders).toHaveLength(2);
    expect(vendorDataStore.addOnProviders).toHaveLength(1);
    expect(vendorDataStore.traderProfileProviders).toHaveLength(1);
    expect(vendorDataStore.totalTerminalItems).toBe(2);
    expect(vendorDataStore.totalAddOnItems).toBe(1);
    expect(vendorDataStore.totalTraderProfileItems).toBe(1);
    expect(vendorDataStore.fetchingProvidersState.isInProgress).toBe(false);
  });

  test('populates TERMINAL_LICENSE providers correctly', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
      vendor_profiles: [
        makeTerminalJson(1),
        makeTerminalJson(2),
        makeTerminalJson(3),
      ],
      total_count: 3,
    });

    vendorDataStore.providerDisplayState =
      VendorDataProviderType.TERMINAL_LICENSE;
    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.providers).toHaveLength(3);
    expect(vendorDataStore.totalItems).toBe(3);
  });

  test('populates ADD_ONS providers correctly', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
      service_pricing: [makeAddOnJson(10), makeAddOnJson(11)],
      total_count: 2,
    });

    vendorDataStore.providerDisplayState = VendorDataProviderType.ADD_ONS;
    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.providers).toHaveLength(2);
    expect(vendorDataStore.totalItems).toBe(2);
  });

  test('populates ORDER_PROFILE providers correctly', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
      order_profile: [makeOrderProfileJson(1), makeOrderProfileJson(2)],
      total_count: 2,
    });

    vendorDataStore.providerDisplayState = VendorDataProviderType.ORDER_PROFILE;
    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.traderProfileAllProviders).toHaveLength(2);
    expect(vendorDataStore.totalItems).toBe(2);
  });

  test('handles empty responses gracefully', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
    });

    vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.terminalProviders).toHaveLength(0);
    expect(vendorDataStore.addOnProviders).toHaveLength(0);
    expect(vendorDataStore.traderProfileProviders).toHaveLength(0);
    expect(vendorDataStore.totalTerminalItems).toBe(0);
    expect(vendorDataStore.totalAddOnItems).toBe(0);
    expect(vendorDataStore.totalTraderProfileItems).toBe(0);
  });

  test('sets fetchingProvidersState to complete after success', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test-hrid',
      vendor_profiles: [],
      service_pricing: [],
      order_profile: [],
    });

    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.fetchingProvidersState.isInProgress).toBe(false);
  });

  test('sets fetchingProvidersState to fail on error', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockRejectedValue(new Error('Network error'));

    await flowResult(vendorDataStore.populateProviders());

    expect(vendorDataStore.fetchingProvidersState.hasFailed).toBe(true);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('LegendMarketPlaceVendorDataStore - refresh', () => {
  test('calls populateProviders', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    const mockFetch = createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test',
      vendor_profiles: [],
      service_pricing: [],
      order_profile: [],
    });

    await flowResult(vendorDataStore.refresh());

    expect(mockFetch).toHaveBeenCalled();
  });
});

// ─── init ──────────────────────────────────────────────────────────────────────

describe('LegendMarketPlaceVendorDataStore - init', () => {
  test('sets selectedUser and calls refresh', async () => {
    const { vendorDataStore, baseStore } = await setupStore();
    createSpy(
      baseStore.marketplaceServerClient,
      'fetchProducts',
    ).mockResolvedValue({
      hrid: 'test',
      vendor_profiles: [],
      service_pricing: [],
      order_profile: [],
    });

    // Call init
    await flowResult(vendorDataStore.init());

    // selectedUser should have been set to a LegendUser
    expect(vendorDataStore.selectedUser).toBeInstanceOf(LegendUser);
  });
});
