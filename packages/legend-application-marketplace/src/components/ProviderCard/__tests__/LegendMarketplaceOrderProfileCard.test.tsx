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
  within,
} from '@testing-library/react';
import {
  TraderProfile,
  TraderProfileItem,
  type CartItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceOrderProfileCard } from '../LegendMarketplaceOrderProfileCard.js';
import { createSpy } from '@finos/legend-shared/test';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTerminal = (
  id: number,
  price = 200,
  model: string | null = null,
  isOwned = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = 'Vendor Profile';
  item.providerName = 'Bloomberg';
  item.productName = `Terminal ${id}`;
  item.price = price;
  item.model = model;
  item.isOwned = isOwned;
  return item;
};

const makeAddOn = (
  id: number,
  price = 50,
  model: string | null = null,
  isOwned = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = 'Market Data';
  item.providerName = 'Bloomberg';
  item.productName = `Add-On ${id}`;
  item.price = price;
  item.model = model;
  item.isOwned = isOwned;
  return item;
};

const makeProfile = (
  items: TraderProfileItem[],
  price = 300,
  multiselect = false,
  isOwned = false,
): TraderProfile => {
  const profile = new TraderProfile();
  profile.id = 1;
  profile.productName = 'My Bundle';
  profile.providerName = 'Bloomberg';
  profile.price = price;
  profile.multiselect = multiselect;
  profile.isOwned = isOwned;
  profile.items = items;
  return profile;
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

// ─── Tests ────────────────────────────────────────────────────────────────────

let MOCK__baseStore: LegendMarketplaceBaseStore;

beforeEach(async () => {
  MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  // Mock getCart and getCartSummary to avoid API calls
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

describe('LegendMarketplaceOrderProfileCard - rendering', () => {
  test('renders product name in uppercase', () => {
    const profile = makeProfile([makeTerminal(1)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('MY BUNDLE')).toBeDefined();
  });

  test('renders "Order Profile" chip', () => {
    const profile = makeProfile([makeTerminal(1)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('Order Profile')).toBeDefined();
  });

  test('renders profile summary line', () => {
    const items = [makeTerminal(1), makeAddOn(2)];
    const profile = makeProfile(items);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('1 Terminal · 1 Add-On')).toBeDefined();
  });

  test('renders price chip when not owned', () => {
    const profile = makeProfile([makeTerminal(1, 500)], 500);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('$500.00/month')).toBeDefined();
  });

  test('renders multiselect total price when multiselect=true', () => {
    const terminal = makeTerminal(1, 300, 'Model A');
    const addOn = makeAddOn(2, 100, 'Model A');
    const profile = makeProfile([terminal, addOn], 400, true);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('$400.00/month')).toBeDefined();
  });

  test('renders "Already have access" when profile is owned', () => {
    const profile = makeProfile([makeTerminal(1)], 200, false, true);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText(/Already have access/)).toBeDefined();
  });

  test('does not render price chip when profile is owned', () => {
    const profile = makeProfile([makeTerminal(1, 200)], 200, false, true);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.queryByText('$200.00/month')).toBeNull();
  });

  test('renders "Add to cart" button when not owned and not in cart', () => {
    const profile = makeProfile([makeTerminal(1)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('Add to cart')).toBeDefined();
  });

  test('renders "In Cart" state when all items in cart', () => {
    const terminal = makeTerminal(1, 200);
    const addOn = makeAddOn(2, 100);
    const profile = makeProfile([terminal, addOn], 300);
    // Put both items in cart
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(1), makeCartItem(2)];

    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    expect(screen.getByText('In Cart')).toBeDefined();
  });

  test('add to cart button is disabled when in cart', () => {
    const terminal = makeTerminal(1, 200);
    const profile = makeProfile([terminal], 200);
    MOCK__baseStore.cartStore.items[99] = [makeCartItem(1)];

    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    // The button has disabled state
    const allButtons = screen.getByText('In Cart').closest('button');
    expect(allButtons?.disabled).toBe(true);
  });

  test('renders image with alt "order profile"', () => {
    const profile = makeProfile([makeTerminal(1)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    const img = screen.getByAltText('order profile');
    expect(img).toBeDefined();
  });

  test('image URL uses assetUrl from config', () => {
    const profile = makeProfile([makeTerminal(1)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    const img = screen.getByAltText('order profile');
    // assetsBaseUrl is '/fileName' from test config
    expect((img as HTMLImageElement).src).toMatch(/\/fileName\/images\d+\.jpg/);
  });
});

describe('LegendMarketplaceOrderProfileCard - info button', () => {
  test('clicking info button opens detail modal', async () => {
    const profile = makeProfile([makeTerminal(1, 200)]);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    const infoBtn = screen.getByLabelText('View profile details');
    fireEvent.click(infoBtn);
    await waitFor(() => {
      // Detail modal shows profile name and table header
      expect(screen.getByText('PRODUCT NAME')).toBeDefined();
    });
  });

  test('closing detail modal via Close button hides modal', async () => {
    const profile = makeProfile([makeTerminal(1, 200)], 200);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);
    // Open modal
    fireEvent.click(screen.getByLabelText('View profile details'));
    // Wait for it to open
    await waitFor(() => {
      expect(screen.getByText('PRODUCT NAME')).toBeDefined();
    });
    // Close it
    const allCloseButtons = screen.getAllByText('Close');
    fireEvent.click(allCloseButtons[0] as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByText('PRODUCT NAME')).toBeNull();
    });
  });
});

describe('LegendMarketplaceOrderProfileCard - add to cart', () => {
  test('for multiselect profile, clicking Add to Cart opens multiselect modal', async () => {
    const terminal1 = makeTerminal(1, 200, 'Model A');
    const terminal2 = makeTerminal(2, 300, 'Model B');
    const profile = makeProfile([terminal1, terminal2], 300, true);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);

    fireEvent.click(screen.getByText('Add to cart'));

    await waitFor(() => {
      expect(screen.getByText('Select Terminal')).toBeDefined();
    });
  });

  test('clicking Cancel in multiselect modal closes it', async () => {
    const terminal1 = makeTerminal(1, 200, 'Model A');
    const profile = makeProfile([terminal1], 200, true);
    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);

    fireEvent.click(screen.getByText('Add to cart'));

    await waitFor(() => {
      expect(screen.getByText('Select Terminal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Select Terminal')).toBeNull();
    });
  });

  test('for non-multiselect profile, clicking Add to Cart triggers cart action', async () => {
    const terminal = makeTerminal(1, 200);
    const addOn = makeAddOn(2, 100);
    const profile = makeProfile([terminal, addOn], 300, false);

    const mockAddItems = jest.fn().mockReturnValue(Promise.resolve());
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addOrderProfileItemsToCart = mockAddItems;

    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'addToCart',
    ).mockResolvedValue({
      status_code: 200,
      message: 'Added successfully',
      marketplace_addons: [],
    });

    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Add to cart'));
    });

    // Should have called addOrderProfileItemsToCart
    expect(mockAddItems).toHaveBeenCalled();
  });

  test('multiselect confirm adds selected terminal and its add-ons', async () => {
    const terminal = makeTerminal(1, 200, 'Model A');
    const addOn = makeAddOn(2, 100, 'Model A');
    const profile = makeProfile([terminal, addOn], 300, true);

    const mockAddItems = jest.fn().mockReturnValue(Promise.resolve());
    (
      MOCK__baseStore.cartStore as unknown as Record<string, unknown>
    ).addOrderProfileItemsToCart = mockAddItems;

    render(<LegendMarketplaceOrderProfileCard traderProfile={profile} />);

    // Open multiselect modal
    fireEvent.click(screen.getByText('Add to cart'));

    await waitFor(() => {
      expect(screen.getByText('Terminal 1')).toBeDefined();
    });

    // Select Terminal 1
    fireEvent.click(screen.getByText('Terminal 1'));

    // Click Add to cart in the modal (scope within dialog to avoid card's button)
    const dialog = screen.getByRole('dialog');
    const modalConfirmBtn = within(dialog).getByRole('button', {
      name: 'Add to cart',
    });
    await act(async () => {
      fireEvent.click(modalConfirmBtn);
    });

    await waitFor(() => {
      expect(mockAddItems).toHaveBeenCalled();
    });
  });
});
