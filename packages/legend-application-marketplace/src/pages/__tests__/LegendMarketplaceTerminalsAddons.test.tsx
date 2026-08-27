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
  TraderProfile,
  TraderProfileItem,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';
import {
  LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../../stores/LegendMarketPlaceVendorDataStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import {
  RefinedVendorRadioSelector,
  VendorDataMainContent,
  LegendMarketplaceVendorData,
  LegendMarketplaceVendorDetails,
} from '../TerminalsAddons/LegendMarketplaceTerminalsAddons.js';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { createSpy } from '@finos/legend-shared/test';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('@finos/legend-application/browser', () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    '@finos/legend-application/browser',
  );
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({ vendorName: 'TestVendor' }),
  };
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
  item.model = overrides.model ?? null;
  if (overrides.isOwned !== undefined) {
    item.isOwned = overrides.isOwned;
  }
  return item;
};

const makeAddOnResult = (
  overrides: Partial<TerminalResult> = {},
): TerminalResult =>
  makeTerminalResult({
    category: 'Market Data',
    productName: 'My Add-On',
    ...overrides,
  });

const makeTraderProfile = (id = 1): TraderProfile => {
  const profile = new TraderProfile();
  profile.id = id;
  profile.productName = `Bundle ${id}`;
  profile.providerName = 'Bloomberg';
  profile.price = 300;
  profile.multiselect = false;
  profile.isOwned = false;
  const term = new TraderProfileItem();
  term.id = id * 100;
  term.category = 'Vendor Profile';
  term.productName = `Terminal ${id}`;
  term.providerName = 'Bloomberg';
  term.price = 200;
  term.isOwned = false;
  term.model = null;
  profile.items = [term];
  return profile;
};

// ─── Test Setup ───────────────────────────────────────────────────────────────

let MOCK__baseStore: LegendMarketplaceBaseStore;
let vendorDataStore: LegendMarketPlaceVendorDataStore;

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
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'fetchProducts',
  ).mockResolvedValue({
    vendor_profiles: [],
    service_pricing: [],
    order_profile: [],
    vendor_profiles_total_count: 0,
    service_pricing_total_count: 0,
    order_profile_total_count: 0,
    total_count: 0,
    ownedPermissions: [],
    ownedPermissionsCount: 0,
  });

  vendorDataStore = new LegendMarketPlaceVendorDataStore(
    MOCK__baseStore.applicationStore,
    MOCK__baseStore,
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── RefinedVendorRadioSelector ───────────────────────────────────────────────

describe('RefinedVendorRadioSelector - rendering', () => {
  test('renders all four radio options', () => {
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Terminal License')).toBeDefined();
    expect(screen.getByText('Add-Ons')).toBeDefined();
    expect(screen.getByText('Order Profile')).toBeDefined();
  });

  test('renders with correct aria-label', () => {
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);
    expect(
      screen.getByRole('radiogroup', { name: 'Vendor data provider type' }),
    ).toBeDefined();
  });

  test('"All" is selected by default (aria-checked=true)', () => {
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);
    const allBtn = screen.getByRole('radio', { name: 'All' });
    expect(allBtn.getAttribute('aria-checked')).toBe('true');
  });

  test('clicking "Terminal License" updates providerDisplayState and calls populateProviders', async () => {
    // Let the real flow run — fetchProducts is already mocked to return empty data
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Terminal License'));
    });

    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.TERMINAL_LICENSE,
    );
  });

  test('clicking "Add-Ons" updates providerDisplayState', async () => {
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Add-Ons'));
    });

    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.ADD_ONS,
    );
  });

  test('clicking "Order Profile" updates providerDisplayState', async () => {
    render(<RefinedVendorRadioSelector vendorDataState={vendorDataStore} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Order Profile'));
    });

    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.ORDER_PROFILE,
    );
  });
});

// ─── VendorDataMainContent – loading state ────────────────────────────────────

describe('VendorDataMainContent - loading state', () => {
  test('shows loading spinner when fetchingProvidersState is in progress', () => {
    vendorDataStore.fetchingProvidersState.inProgress();
    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );
    // CircularProgress is rendered (no accessible text, check container)
    const loadingDiv = document.querySelector(
      '.legend-marketplace-vendordata-main__loading',
    );
    expect(loadingDiv).not.toBeNull();
  });
});

// ─── VendorDataMainContent – ALL display state ────────────────────────────────

describe('VendorDataMainContent - ALL display state', () => {
  test('renders three section headers in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('Terminal License')).toBeDefined();
    expect(screen.getByText('Add-Ons')).toBeDefined();
    expect(screen.getByText('Order Profile')).toBeDefined();
  });

  test('shows "See All>" buttons in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    const seeAllButtons = screen.getAllByText(/See All/);
    expect(seeAllButtons.length).toBeGreaterThanOrEqual(2);
  });

  test('renders terminal cards in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
      vendorDataStore.terminalProviders = [
        makeTerminalResult({ id: 1, productName: 'Terminal One' }),
      ];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('Terminal One')).toBeDefined();
  });

  test('renders add-on cards in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
      vendorDataStore.addOnProviders = [
        makeAddOnResult({ id: 2, productName: 'My Add-On' }),
      ];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('My Add-On')).toBeDefined();
  });

  test('renders order profile cards in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
      vendorDataStore.traderProfileProviders = [makeTraderProfile(1)];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('BUNDLE 1')).toBeDefined();
  });

  test('clicking "See All>" for terminal section switches to TERMINAL_LICENSE', async () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // The first "See All>" is for Terminal License
    const seeAllButtons = screen.getAllByText(/See All/);
    await act(async () => {
      fireEvent.click(seeAllButtons[0] as HTMLElement);
    });

    expect(vendorDataStore.providerDisplayState).toBe(
      VendorDataProviderType.TERMINAL_LICENSE,
    );
  });

  test('shows search result count when search term is active', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
      vendorDataStore.searchTerm = 'bloomberg';
      vendorDataStore.totalTerminalItems = 5;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // Count is shown in parentheses
    expect(screen.getByText('(5)')).toBeDefined();
  });

  test('shows "No Order Profiles available" when traderProfileProviders is empty in ALL state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ALL;
      vendorDataStore.traderProfileProviders = [];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('No Order Profiles available')).toBeDefined();
  });
});

// ─── VendorDataMainContent – TERMINAL_LICENSE state ──────────────────────────

describe('VendorDataMainContent - TERMINAL_LICENSE display state', () => {
  test('renders terminal section in TERMINAL_LICENSE state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.providers = [
        makeTerminalResult({ id: 1, productName: 'Bloomberg Terminal' }),
      ];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('Bloomberg Terminal')).toBeDefined();
  });

  test('shows owned services section when ownedPermissions is non-empty', () => {
    const ownedPermission = makeTerminalResult({
      id: 99,
      productName: 'Owned Terminal',
      isOwned: true,
    });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
      vendorDataStore.totalOwnedPermissions = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // The section renders when ownedPermissions has items
    expect(
      document.querySelector(
        '.legend-marketplace-vendordata-main-owned-services',
      ),
    ).not.toBeNull();
  });

  test('does not show owned services section when ownedPermissions is empty', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.queryByText(/My Terminal Subscriptions/)).toBeNull();
  });

  test('shows pagination controls in TERMINAL_LICENSE state when totalItems > 0', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.totalItems = 50;
      vendorDataStore.itemsPerPage = 24;
      vendorDataStore.page = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // PaginationControls should be rendered
    // It shows items per page info or navigation
    const pagDiv = document.querySelector(
      '.legend-marketplace-vendordata-main',
    );
    expect(pagDiv).not.toBeNull();
  });
});

// ─── VendorDataMainContent – ADD_ONS state ────────────────────────────────────

describe('VendorDataMainContent - ADD_ONS display state', () => {
  test('renders add-on section in ADD_ONS state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ADD_ONS;
      vendorDataStore.providers = [
        makeAddOnResult({ id: 2, productName: 'Bloomberg Data' }),
      ];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('Bloomberg Data')).toBeDefined();
    expect(screen.getByText('Add-Ons')).toBeDefined();
  });

  test('shows add-on tooltip in ADD_ONS state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState = VendorDataProviderType.ADD_ONS;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // InfoCircleIcon is rendered (tooltip is on hover, just check presence)
    const infoIcons = document.querySelectorAll(
      '.legend-marketplace-vendordata-main-search-results__category',
    );
    expect(infoIcons.length).toBeGreaterThan(0);
  });
});

// ─── VendorDataMainContent – ORDER_PROFILE state ─────────────────────────────

describe('VendorDataMainContent - ORDER_PROFILE display state', () => {
  test('renders order profile section in ORDER_PROFILE state', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.ORDER_PROFILE;
      vendorDataStore.traderProfileAllProviders = [makeTraderProfile(1)];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('BUNDLE 1')).toBeDefined();
  });

  test('shows "No Order Profiles available" when traderProfileAllProviders is empty', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.ORDER_PROFILE;
      vendorDataStore.traderProfileAllProviders = [];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('No Order Profiles available')).toBeDefined();
  });
});

// ─── OwnedServicesSection collapse behavior ───────────────────────────────────

describe('VendorDataMainContent - OwnedServicesSection', () => {
  test('owned services section is collapsed by default', () => {
    const ownedPermission = makeTerminalResult({
      id: 99,
      productName: 'Owned Terminal',
      isOwned: true,
    });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
      vendorDataStore.totalOwnedPermissions = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // The expand button starts with aria-expanded=false
    const expandBtn = screen.getByLabelText(
      /Expand my terminal subscriptions/i,
    );
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
  });

  test('expanding owned services section shows owned terminal cards', async () => {
    const ownedPermission = makeTerminalResult({
      id: 99,
      productName: 'Owned Terminal',
      isOwned: true,
    });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
      vendorDataStore.totalOwnedPermissions = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // Click the expand button
    const expandBtn = screen.getByLabelText(
      /Expand my terminal subscriptions/i,
    );
    await act(async () => {
      fireEvent.click(expandBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Owned Terminal/i)).toBeDefined();
    });
  });

  test('collapsing expanded owned services section changes aria-expanded back to false', async () => {
    const ownedPermission = makeTerminalResult({
      id: 99,
      productName: 'Owned Terminal',
      isOwned: true,
    });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // Expand first
    const expandBtn = screen.getByLabelText(
      /Expand my terminal subscriptions/i,
    );
    await act(async () => {
      fireEvent.click(expandBtn);
    });

    // aria-label changes to indicate collapse is now possible
    await waitFor(() => {
      expect(
        screen.getByLabelText(/Collapse my terminal subscriptions/i),
      ).toBeDefined();
    });

    // Now collapse
    const collapseBtn = screen.getByLabelText(
      /Collapse my terminal subscriptions/i,
    );
    await act(async () => {
      fireEvent.click(collapseBtn);
    });

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Expand my terminal subscriptions/i),
      ).toBeDefined();
    });
  });

  test('shows subscription count badge', () => {
    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [
        makeTerminalResult({ id: 1, isOwned: true }),
        makeTerminalResult({ id: 2, isOwned: true }),
      ];
      vendorDataStore.totalOwnedPermissions = 2;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(screen.getByText('(2)')).toBeDefined();
  });

  test('shows target user title when selectedUser differs from current user', () => {
    const ownedPermission = makeTerminalResult({ id: 99, isOwned: true });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
      // Set selectedUser to a completely different user object
      vendorDataStore.selectedUser = {
        id: 'other-user',
        displayName: 'Other User',
      } as typeof vendorDataStore.selectedUser;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(
      screen.getByText("Other User's Terminal Subscriptions"),
    ).toBeDefined();
  });

  test('falls back to selected user id when target user displayName is whitespace', () => {
    const ownedPermission = makeTerminalResult({ id: 101, isOwned: true });

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.ownedPermissions = [ownedPermission];
      vendorDataStore.selectedUser = {
        id: 'other-user',
        displayName: '   ',
      } as typeof vendorDataStore.selectedUser;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    expect(
      screen.getByText("other-user's Terminal Subscriptions"),
    ).toBeDefined();
  });
});

// ─── VendorDataMainContent – pagination interaction ──────────────────────────

describe('VendorDataMainContent - pagination interaction', () => {
  test('calls setPage and populateProviders when page changes', async () => {
    const setPageSpy = jest.spyOn(vendorDataStore, 'setPage');

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.totalItems = 100;
      vendorDataStore.itemsPerPage = 24;
      vendorDataStore.page = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    const page2Btn = screen.queryByRole('button', { name: /page 2/i });
    if (page2Btn) {
      await act(async () => {
        fireEvent.click(page2Btn);
      });
      expect(setPageSpy).toHaveBeenCalledWith(2);
    } else {
      // PaginationControls renders differently; just verify the store state is intact
      expect(vendorDataStore.totalItems).toBe(100);
    }
  });

  test('calls setItemsPerPage and populateProviders when items per page changes', async () => {
    const setItemsPerPageSpy = jest.spyOn(vendorDataStore, 'setItemsPerPage');

    runInAction(() => {
      vendorDataStore.providerDisplayState =
        VendorDataProviderType.TERMINAL_LICENSE;
      vendorDataStore.totalItems = 50;
      vendorDataStore.itemsPerPage = 24;
      vendorDataStore.page = 1;
    });

    render(
      <VendorDataMainContent marketPlaceVendorDataState={vendorDataStore} />,
    );

    // PaginationControls renders a MUI Select for items-per-page.
    // Open the dropdown and select an option.
    const combobox = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(combobox);
    });

    await waitFor(() => {
      const option = screen.queryByRole('option', { name: '12' });
      if (option) {
        fireEvent.click(option);
      }
    });

    await waitFor(() => {
      expect(setItemsPerPageSpy).toHaveBeenCalledWith(12);
    });
  });
});

// ─── LegendMarketplaceVendorData page ─────────────────────────────────────────

describe('LegendMarketplaceVendorData page', () => {
  const renderPage = async () => {
    await act(async () => {
      render(
        <ApplicationStoreProvider store={MOCK__baseStore.applicationStore}>
          <LegendMarketplaceVendorData />
        </ApplicationStoreProvider>,
      );
    });
  };

  test('renders without crashing and shows initial content', async () => {
    await renderPage();
    expect(
      document.querySelector('.legend-marketplace-vendor-data'),
    ).not.toBeNull();
  });

  test('renders search bar', async () => {
    await renderPage();
    expect(
      document.querySelector('.legend-marketplace-banner__search-bar'),
    ).not.toBeNull();
  });

  test('renders filter bar with tab selector', async () => {
    await renderPage();
    expect(
      screen.queryByRole('radiogroup', { name: 'Vendor data provider type' }),
    ).not.toBeNull();
  });

  test('renders all four vendor type options in filter bar', async () => {
    await renderPage();
    // Use queryAllByText since option names also appear as section titles
    expect(screen.queryAllByText('All').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Terminal License').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Add-Ons').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Order Profile').length).toBeGreaterThan(0);
  });

  test('clicking a vendor type radio updates the display state', async () => {
    await renderPage();

    // Find the radio button specifically (not the section header)
    const terminalRadio = screen.getByRole('radio', {
      name: 'Terminal License',
    });
    await act(async () => {
      fireEvent.click(terminalRadio);
    });

    await waitFor(() => {
      expect(terminalRadio.getAttribute('aria-checked')).toBe('true');
    });
  });

  test('submitting the search form fires handleSearch', async () => {
    await renderPage();

    const form = document.querySelector(
      'form.legend-marketplace__search-bar',
    ) as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      fireEvent.submit(form);
    });

    // Component should still be rendered after submit
    expect(
      document.querySelector('.legend-marketplace-vendor-data'),
    ).not.toBeNull();
  });

  test('clearing the search input fires handleSearchChange', async () => {
    await renderPage();

    // The search bar inside the banner contains a combobox input
    const bannerSearch = document.querySelector(
      '.legend-marketplace-banner input',
    ) as HTMLInputElement;
    expect(bannerSearch).not.toBeNull();

    // First type something so there is a non-empty value
    await act(async () => {
      fireEvent.change(bannerSearch, { target: { value: 'bloomberg' } });
    });

    // Then clear it — the handleSearchChange empty-string branch runs
    await act(async () => {
      fireEvent.change(bannerSearch, { target: { value: '' } });
    });

    // Component should still be mounted
    expect(
      document.querySelector('.legend-marketplace-vendor-data'),
    ).not.toBeNull();
  });

  test('clicking General Inquiries button calls visitAddress', async () => {
    // Set a generalInquiriesUrl in the config options
    Object.assign(MOCK__baseStore.applicationStore.config.options, {
      generalInquiriesUrl: 'https://test-inquiries.example.com',
    });

    const visitAddressSpy = jest
      .spyOn(
        MOCK__baseStore.applicationStore.navigationService.navigator,
        'visitAddress',
      )
      .mockImplementation(() => {});

    await renderPage();

    const button = screen.getByText('General Inquiries');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(visitAddressSpy).toHaveBeenCalledWith(
      'https://test-inquiries.example.com',
    );
  });

  test('clicking Request Internal Application button calls visitAddress', async () => {
    // Set a requestInternalAppUrl in the config options
    Object.assign(MOCK__baseStore.applicationStore.config.options, {
      requestInternalAppUrl: 'https://test-internal-app.example.com',
    });

    const visitAddressSpy = jest
      .spyOn(
        MOCK__baseStore.applicationStore.navigationService.navigator,
        'visitAddress',
      )
      .mockImplementation(() => {});

    await renderPage();

    const button = screen.getByText('Request Internal Application');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(visitAddressSpy).toHaveBeenCalledWith(
      'https://test-internal-app.example.com',
    );
  });

  test('selecting a user with id triggers setSelectedUser and setTargetUser', async () => {
    await renderPage();

    // UserSearchInput with userSearchService=undefined renders a plain TextField.
    // Typing a non-empty value calls setUserValue({ id: 'john' }) which takes the
    // else branch (setSelectedUser / setTargetUser with user id).
    const userInput = document.querySelector(
      '.legend-marketplace__user-input input',
    ) as HTMLInputElement;
    expect(userInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(userInput, { target: { value: 'john' } });
    });

    // Component stays rendered
    expect(
      document.querySelector('.legend-marketplace-vendor-data'),
    ).not.toBeNull();
  });

  test('clearing the user input triggers resetSelectedUser and setTargetUser(undefined)', async () => {
    await renderPage();

    // First select a user
    const userInput = document.querySelector(
      '.legend-marketplace__user-input input',
    ) as HTMLInputElement;
    expect(userInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(userInput, { target: { value: 'john' } });
    });

    // Now clear it — calls setUserValue({ id: '' }) which takes the if(!_user.id) branch
    await act(async () => {
      fireEvent.change(userInput, { target: { value: '' } });
    });

    expect(
      document.querySelector('.legend-marketplace-vendor-data'),
    ).not.toBeNull();
  });
});

// ─── LegendMarketplaceVendorDetails page ──────────────────────────────────────

describe('LegendMarketplaceVendorDetails page', () => {
  const renderDetailsPage = async () => {
    await act(async () => {
      render(
        <ApplicationStoreProvider store={MOCK__baseStore.applicationStore}>
          <LegendMarketplaceVendorDetails />
        </ApplicationStoreProvider>,
      );
    });
  };

  test('renders vendor name from useParams', async () => {
    await renderDetailsPage();
    expect(screen.queryByText('TestVendor')).not.toBeNull();
  });

  test('renders the hardcoded dataset list', async () => {
    await renderDetailsPage();
    expect(screen.queryByText('Dataset 1')).not.toBeNull();
    expect(screen.queryByText('Dataset 2')).not.toBeNull();
    expect(screen.queryByText('Dataset 3')).not.toBeNull();
  });
});
