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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TraderProfile,
  TraderProfileItem,
  type CartItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { OrderProfileDetailModal } from '../OrderProfileDetailModal.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeItem = (
  id: number,
  category: string,
  productName: string,
  price: number,
  isOwned = false,
  model: string | null = null,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = category;
  item.providerName = 'Test Provider';
  item.productName = productName;
  item.price = price;
  item.isOwned = isOwned;
  item.model = model;
  return item;
};

const makeTerminal = (
  id: number,
  productName: string,
  price = 200,
  isOwned = false,
  model: string | null = null,
): TraderProfileItem =>
  makeItem(id, 'Vendor Profile', productName, price, isOwned, model);

const makeAddOn = (
  id: number,
  productName: string,
  price = 100,
  isOwned = false,
  model: string | null = null,
): TraderProfileItem =>
  makeItem(id, 'Market Data', productName, price, isOwned, model);

const makeProfile = (
  items: TraderProfileItem[],
  price = 300,
  multiselect = false,
): TraderProfile => {
  const profile = new TraderProfile();
  profile.id = 1;
  profile.productName = 'Test Profile';
  profile.providerName = 'Bloomberg';
  profile.price = price;
  profile.multiselect = multiselect;
  profile.items = items;
  return profile;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

let MOCK__baseStore: LegendMarketplaceBaseStore;

beforeEach(async () => {
  MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
});

describe('OrderProfileDetailModal', () => {
  test('does not render title when closed', () => {
    const profile = makeProfile([makeTerminal(1, 'Terminal A')]);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={false}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByText('Test Profile')).toBeNull();
  });

  test('renders profile name in title', () => {
    const profile = makeProfile([makeTerminal(1, 'Terminal A')]);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Test Profile')).toBeDefined();
  });

  test('renders summary with terminal and add-on counts', () => {
    const items = [
      makeTerminal(1, 'Terminal A'),
      makeAddOn(2, 'Add-On A'),
      makeAddOn(3, 'Add-On B'),
    ];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/1 Terminal/)).toBeDefined();
    expect(screen.getByText(/2 Add-Ons/)).toBeDefined();
  });

  test('renders table headers', () => {
    const profile = makeProfile([makeTerminal(1, 'Terminal A')]);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('PRODUCT NAME')).toBeDefined();
    expect(screen.getByText('PROVIDER')).toBeDefined();
    expect(screen.getByText('CATEGORY')).toBeDefined();
    expect(screen.getByText('COST (Monthly)')).toBeDefined();
  });

  test('renders item product names', () => {
    const items = [
      makeTerminal(1, 'Bloomberg Terminal'),
      makeAddOn(2, 'Data Feed'),
    ];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
    expect(screen.getByText('Data Feed')).toBeDefined();
  });

  test('renders item categories as chips', () => {
    const items = [makeTerminal(1, 'Terminal A'), makeAddOn(2, 'Add-On A')];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Vendor Profile')).toBeDefined();
    expect(screen.getByText('Market Data')).toBeDefined();
  });

  test('renders item prices formatted as USD', () => {
    const items = [makeTerminal(1, 'Terminal A', 2000)];
    const profile = makeProfile(items, 2000);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    // There should be at least one occurrence of $2,000.00 (in header total and in table)
    const priceElements = screen.getAllByText('$2,000.00');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  test('shows (Owned) suffix for owned items', () => {
    const items = [makeTerminal(1, 'Terminal A', 200, true)];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('(Owned)')).toBeDefined();
  });

  test('shows (In Cart) suffix for items in cart', () => {
    // Put item 1 in cart
    const mockCartItem: CartItem = {
      cartId: 1,
      id: 1,
      productName: 'Terminal A',
      providerName: 'Bloomberg',
      category: 'Vendor Profile',
      price: 200,
      description: '',
      isOwned: 'false',
      skipWorkflow: false,
    };
    MOCK__baseStore.cartStore.items[99] = [mockCartItem];

    const items = [makeTerminal(1, 'Terminal A', 200, false)];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('(In Cart)')).toBeDefined();
  });

  test('shows profile total price in header', () => {
    const items = [makeTerminal(1, 'Terminal A', 500)];
    const profile = makeProfile(items, 500);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    // The header displays " · Total: " and the price
    expect(screen.getByText(/Total:/)).toBeDefined();
  });

  test('shows multiselectTotalPrice instead of profile price when multiselect', () => {
    const items = [makeTerminal(1, 'Terminal A', 500)];
    const profile = makeProfile(items, 500, true);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        multiselectTotalPrice={750}
      />,
    );
    expect(screen.getByText('$750.00')).toBeDefined();
  });

  test('falls back to profile price when multiselect but no multiselectTotalPrice', () => {
    const items = [makeTerminal(1, 'Terminal A', 500)];
    const profile = makeProfile(items, 500, true);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    // Should show $500.00 (the profile price)
    const priceTexts = screen.getAllByText('$500.00');
    expect(priceTexts.length).toBeGreaterThanOrEqual(1);
  });

  test('calls onClose when close button in actions is clicked', () => {
    const profile = makeProfile([makeTerminal(1, 'Terminal A')]);
    const onClose = jest.fn();
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={onClose}
      />,
    );
    // The close button in DialogActions is labeled "Close"
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders provider name in table', () => {
    const items = [makeTerminal(1, 'Terminal A')];
    const profile = makeProfile(items);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    // providerName appears in the table row
    expect(screen.getAllByText('Test Provider').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  test('groups terminals with their add-ons', () => {
    const terminal = makeTerminal(1, 'Terminal A', 200, false, 'Model X');
    const addOn = makeAddOn(2, 'Add-On X', 50, false, 'Model X');
    const profile = makeProfile([terminal, addOn]);
    render(
      <OrderProfileDetailModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Terminal A')).toBeDefined();
    expect(screen.getByText('Add-On X')).toBeDefined();
  });
});
