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
} from '@testing-library/react';
import { TerminalResult } from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceOwnedTerminalCard } from '../LegendMarketplaceOwnedTerminalCard.js';
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
  item.isOwned = overrides.isOwned ?? true;
  if (overrides.permissionId !== undefined) {
    item.permissionId = overrides.permissionId;
  }
  return item;
};

const makeAddonJson = (id: number, price = 100) => ({
  id,
  category: 'Market Data',
  providerName: 'Bloomberg',
  productName: `Service Addon ${id}`,
  price,
  model: null,
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
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Rendering tests ──────────────────────────────────────────────────────────

describe('LegendMarketplaceOwnedTerminalCard - rendering', () => {
  test('renders provider name and uppercased product name', () => {
    const item = makeTerminalResult({ productName: 'Bloomberg Terminal' });
    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    expect(screen.getByText('Bloomberg')).toBeDefined();
    expect(screen.getByText('BLOOMBERG TERMINAL')).toBeDefined();
  });

  test('shows category as permission label when no permissionId is set', () => {
    const item = makeTerminalResult({ category: 'Market Data' });
    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    expect(screen.getByText('Market Data')).toBeDefined();
  });

  test('shows "Permission ID" label when permissionId is set', () => {
    const item = makeTerminalResult({ permissionId: 42 });
    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    expect(screen.getByText('Permission ID')).toBeDefined();
  });

  test('renders "Browse Add-Ons" button', () => {
    const item = makeTerminalResult();
    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    expect(screen.getByText(/Browse Add-Ons/)).toBeDefined();
  });
});

// ─── Browse add-ons flow ──────────────────────────────────────────────────────

describe('LegendMarketplaceOwnedTerminalCard - browse add-ons', () => {
  test('calls getPermissionAddons with the terminal permissionId', async () => {
    const item = makeTerminalResult({ permissionId: 42 });
    const getPermissionAddonsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [makeAddonJson(10)],
      total_count: 1,
    });

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });

    expect(getPermissionAddonsSpy).toHaveBeenCalledWith(
      MOCK__baseStore.cartStore.cartUser,
      item.providerName,
      { page: 1, page_size: 300, permission_id: 42 },
    );
  });

  test('deserializes raw add-on JSON into TerminalResult instances', async () => {
    const item = makeTerminalResult({ productName: 'Bloomberg Terminal' });
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [makeAddonJson(10, 250)],
      total_count: 1,
    });

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });

    await waitFor(() => {
      // The recommended items modal renders the deserialized add-on's name/price,
      // proving the raw JSON went through TerminalResult.serialization.fromJson.
      expect(screen.getByText('Service Addon 10')).toBeDefined();
      expect(screen.getByText('$250.00')).toBeDefined();
    });
  });

  test('falls back to the terminal permissionId when response omits one', async () => {
    const item = makeTerminalResult({ permissionId: 42 });
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [makeAddonJson(10)],
      total_count: 1,
      // no `permissionId` in the response payload
    });

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });

    // Modal opens successfully using the fallback permissionId; if the
    // fallback were dropped, the add-ons section would not render.
    await waitFor(() => {
      expect(
        screen.getByText(`Available Add-Ons for ${item.productName}`),
      ).toBeDefined();
    });
  });

  test('shows loading state while fetching add-ons', async () => {
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

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });
    expect(screen.getByText(/Fetching\.\.\./)).toBeDefined();
    // cleanup
    resolvePermissions({ marketplace_addons: [], total_count: 0 });
  });

  test('re-enables the button after getPermissionAddons rejects', async () => {
    const item = makeTerminalResult({ productName: 'Test Terminal' });
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockRejectedValue(new Error('Service Error'));

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Fetching\.\.\./)).toBeNull();
    });
    const btn = screen.getByText(/Browse Add-Ons/).closest('button');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  test('does not open the modal when no add-ons are returned', async () => {
    const item = makeTerminalResult();
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getPermissionAddons',
    ).mockResolvedValue({
      marketplace_addons: [],
      total_count: 0,
    });

    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Browse Add-Ons/));
    });

    expect(
      screen.queryByText(`Available Add-Ons for ${item.productName}`),
    ).toBeNull();
  });
});

// ─── Detail modal ─────────────────────────────────────────────────────────────

describe('LegendMarketplaceOwnedTerminalCard - detail modal', () => {
  test('opens the owned terminal detail modal from the info button', async () => {
    const item = makeTerminalResult({ productName: 'Bloomberg Terminal' });
    render(<LegendMarketplaceOwnedTerminalCard terminalResult={item} />);

    fireEvent.click(screen.getByLabelText('View terminal details'));

    expect(
      await screen.findByRole('dialog', { name: /Bloomberg Terminal/i }),
    ).toBeDefined();
  });
});
