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
import { ApplicationStoreProvider } from '@finos/legend-application';
import { createSpy } from '@finos/legend-shared/test';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LegendMarketplaceSubscriptions } from '../LegendMarketplaceSubscriptions.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

let MOCK__baseStore: LegendMarketplaceBaseStore;

beforeEach(async () => {
  MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'getSubscriptions',
  ).mockResolvedValue({
    subscription_feeds: [],
    TotalMonthlyCost: 0,
  });
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.classList.remove('theme__hc-dark');
});

const renderPage = async () => {
  await act(async () => {
    render(
      <ApplicationStoreProvider store={MOCK__baseStore.applicationStore}>
        <LegendMarketplaceSubscriptions />
      </ApplicationStoreProvider>,
    );
  });
};

const getCancellationCheckboxForRow = (rowId: string): HTMLInputElement => {
  const row = document.querySelector(`[row-id="${rowId}"]`);
  if (!row) {
    throw new TypeError(`Expected grid row with row-id "${rowId}" to exist`);
  }
  const checkbox = row.querySelector('input[type="checkbox"]');
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new TypeError(
      `Expected cancellation checkbox to be rendered for row-id "${rowId}"`,
    );
  }
  return checkbox;
};

// ─── Regression coverage for blank `kerberos` on cancel subscription ─────────

describe('LegendMarketplaceSubscriptions page - target user selection', () => {
  test('fetches subscriptions for the current user on initial load', async () => {
    const getSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({ subscription_feeds: [], TotalMonthlyCost: 0 });

    await renderPage();

    await waitFor(() => {
      expect(getSubscriptionsSpy).toHaveBeenCalledWith(
        MOCK__baseStore.applicationStore.identityService.currentUser,
      );
    });
    expect(getSubscriptionsSpy).not.toHaveBeenCalledWith('');
  });

  test('selecting a different user fetches subscriptions for that user', async () => {
    const getSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({ subscription_feeds: [], TotalMonthlyCost: 0 });

    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByText('Change User'));
    });

    const userInput = document.querySelector(
      '.legend-marketplace-subscriptions__user-input input',
    ) as HTMLInputElement;
    expect(userInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(userInput, { target: { value: 'john' } });
    });

    await waitFor(() => {
      expect(getSubscriptionsSpy).toHaveBeenCalledWith('john');
    });
  });

  test('clearing the target user input reverts to the current user instead of a blank kerberos', async () => {
    const getSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({ subscription_feeds: [], TotalMonthlyCost: 0 });

    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByText('Change User'));
    });

    const userInput = document.querySelector(
      '.legend-marketplace-subscriptions__user-input input',
    ) as HTMLInputElement;
    expect(userInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(userInput, { target: { value: 'john' } });
    });

    await waitFor(() => {
      expect(getSubscriptionsSpy).toHaveBeenCalledWith('john');
    });
    getSubscriptionsSpy.mockClear();

    // Clearing the input previously left the store's selected user (and
    // therefore the `kerberos` field sent on cancel) blank.
    await act(async () => {
      fireEvent.change(userInput, { target: { value: '' } });
    });

    await waitFor(() => {
      expect(getSubscriptionsSpy).toHaveBeenCalledWith(
        MOCK__baseStore.applicationStore.identityService.currentUser,
      );
    });
    expect(getSubscriptionsSpy).not.toHaveBeenCalledWith('');
  });
});

// ─── New feature coverage: loading state, selection, and cancellation ───────

const makeSubscriptionFeed = (overrides: Record<string, unknown> = {}) => ({
  CarrierVendor: 'Bloomberg',
  Model: 'B-PIPE',
  SourceVendor: 'NYSE',
  ItemName: 'Market Data',
  ServiceName: 'Level 1',
  AnnualAmount: 1200,
  TaxValue: 100,
  CostCode: 'CC-1',
  price: 100,
  servicepriceId: 55,
  permId: 999,
  id: 'sub-1',
  isMandatory: false,
  ...overrides,
});

describe('LegendMarketplaceSubscriptions - loading state', () => {
  test('shows a loading spinner while subscriptions are being fetched, then renders the grid', async () => {
    let resolveSubscriptions: (value: {
      subscription_feeds: unknown[];
      TotalMonthlyCost: number;
    }) => void = () => {};
    const subscriptionsPromise = new Promise<{
      subscription_feeds: unknown[];
      TotalMonthlyCost: number;
    }>((resolve) => {
      resolveSubscriptions = resolve;
    });
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockReturnValue(subscriptionsPromise);

    await act(async () => {
      render(
        <ApplicationStoreProvider store={MOCK__baseStore.applicationStore}>
          <LegendMarketplaceSubscriptions />
        </ApplicationStoreProvider>,
      );
    });

    expect(screen.getByRole('progressbar')).toBeDefined();
    expect(document.querySelector('.ag-theme-balham')).toBeNull();

    await act(async () => {
      resolveSubscriptions({
        subscription_feeds: [makeSubscriptionFeed()],
        TotalMonthlyCost: 1200,
      });
      await subscriptionsPromise;
    });

    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('LegendMarketplaceSubscriptions - selection and cancellation', () => {
  test('Cancel Subscription button is disabled when nothing is selected', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [makeSubscriptionFeed()],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const cancelButton = screen.getByRole('button', {
      name: 'Cancel Subscription',
    });
    expect(cancelButton.hasAttribute('disabled')).toBe(true);
  });

  test('selecting a subscription enables the Cancel Subscription button, and unselecting it disables it again', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [makeSubscriptionFeed()],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const getCheckbox = () => screen.getAllByRole('checkbox')[0];
    const firstCheckbox = await waitFor(() => {
      const checkbox = getCheckbox();
      if (!checkbox) {
        throw new Error('Expected a subscription checkbox to be rendered');
      }
      return checkbox;
    });

    await act(async () => {
      fireEvent.click(firstCheckbox);
    });

    const cancelButton = screen.getByRole('button', {
      name: 'Cancel Subscription',
    });
    expect(cancelButton.hasAttribute('disabled')).toBe(false);

    // The checked state is now driven declaratively by `rowData.isSelected`
    // (see `groupedSubscriptions`), so toggling a checkbox produces a new
    // `rowData` array and AG Grid re-renders the cell (and its checkbox DOM
    // node) accordingly — re-query rather than reusing the earlier reference.
    const secondCheckbox = getCheckbox();
    if (!secondCheckbox) {
      throw new Error('Expected a subscription checkbox to be rendered');
    }
    await act(async () => {
      fireEvent.click(secondCheckbox);
    });

    expect(cancelButton.hasAttribute('disabled')).toBe(true);
  });

  test('cancelling selected subscriptions groups them by permId, shows a transient "Cancelling..." state, and refreshes the grid on success', async () => {
    const getSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ItemName: 'Permission ID',
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    let resolveCancel: (value: { message: string }) => void = () => {};
    const cancelPromise = new Promise<{ message: string }>((resolve) => {
      resolveCancel = resolve;
    });
    const cancelSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'cancelSubscriptions',
    ).mockReturnValue(cancelPromise);

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const checkbox = await waitFor(() => screen.getAllByRole('checkbox')[0]);
    if (!checkbox) {
      throw new Error('Expected a subscription checkbox to be rendered');
    }
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const cancelButton = screen.getByRole('button', {
      name: 'Cancel Subscription',
    });

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    const confirmButton = await waitFor(() =>
      screen.getByRole('button', { name: 'Confirm Cancellation' }),
    );

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(cancelSubscriptionsSpy).toHaveBeenCalledWith({
      ordered_by: MOCK__baseStore.applicationStore.identityService.currentUser,
      kerberos: MOCK__baseStore.applicationStore.identityService.currentUser,
      order_items: {
        999: [
          {
            providerName: 'Bloomberg',
            productName: 'Level 1',
            category: 'Permission ID',
            price: 100,
            servicepriceId: 55,
            model: 'B-PIPE',
          },
        ],
      },
    });

    await waitFor(() =>
      expect(screen.getByText('Cancelling...')).toBeDefined(),
    );
    expect(cancelButton.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      resolveCancel({ message: 'Done' });
      await cancelPromise;
    });

    await waitFor(() => expect(getSubscriptionsSpy).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole('button', { name: 'Cancel Subscription' }),
    ).toBeDefined();
  });

  test('cancelling a Permission ID row includes the full permission group even when some add-ons are hidden by search', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    const cancelSubscriptionsSpy = createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'cancelSubscriptions',
    ).mockResolvedValue({ message: 'Done' });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    // Search narrows the grid down to just the Permission ID row, hiding the
    // add-on row entirely.
    const searchInput = screen.getByRole('textbox', {
      name: 'Search subscriptions',
    });
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Level 1' } });
    });
    // Debounced filtering (300ms) narrows the grid down to the matching row.
    // A generous timeout absorbs CI scheduling delays on the real debounce timer.
    await waitFor(
      () => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      },
      { timeout: 10_000 },
    );

    const checkbox = screen.getAllByRole('checkbox')[0];
    if (!checkbox) {
      throw new Error('Expected a subscription checkbox to be rendered');
    }
    await act(async () => {
      fireEvent.click(checkbox);
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Cancel Subscription' }),
      );
    });

    await act(async () => {
      fireEvent.click(
        await waitFor(() =>
          screen.getByRole('button', { name: 'Confirm Cancellation' }),
        ),
      );
    });

    // Permission-group cancellation now derives from the full unfiltered data,
    // so hidden add-ons in the same group are included.
    expect(cancelSubscriptionsSpy).toHaveBeenCalledWith({
      ordered_by: MOCK__baseStore.applicationStore.identityService.currentUser,
      kerberos: MOCK__baseStore.applicationStore.identityService.currentUser,
      order_items: {
        999: [
          {
            providerName: 'Bloomberg',
            productName: 'Level 1',
            category: 'Permission ID',
            price: 100,
            servicepriceId: 55,
            model: 'B-PIPE',
          },
          {
            providerName: 'Bloomberg',
            productName: 'Real-Time News Add-On',
            category: 'Add-On',
            price: 100,
            servicepriceId: 55,
            model: 'B-PIPE',
          },
        ],
      },
    });
  });
});

describe('LegendMarketplaceSubscriptions - search filtering', () => {
  test('typing a search term filters the grid, and the clear button immediately resets the search text and filtered rows', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          CarrierVendor: 'Bloomberg',
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 888,
          CarrierVendor: 'Reuters',
          ServiceName: 'Level 2',
          ItemName: 'Permission ID',
        }),
      ],
      TotalMonthlyCost: 2400,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    const searchInput = screen.getByRole('textbox', {
      name: 'Search subscriptions',
    });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Bloomberg' } });
    });

    // Debounced filtering (300ms) narrows the grid down to the matching row.
    // A generous timeout absorbs CI scheduling delays on the real debounce timer.
    await waitFor(
      () => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      },
      { timeout: 10_000 },
    );

    const clearButton = screen.getByRole('button', {
      name: 'Clear search subscriptions text',
    });

    await act(async () => {
      fireEvent.click(clearButton);
    });

    // The clear button cancels any pending debounce and resets both the raw
    // and active search text synchronously, so both rows reappear immediately
    // without waiting out the debounce interval.
    expect((searchInput as HTMLInputElement).value).toBe('');
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });
});

describe('LegendMarketplaceSubscriptions - dark mode hooks', () => {
  test('renders the expected dark-mode target controls for KPI values, cost toggle, filters, cancel action, and cancel checkboxes', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    document.body.classList.add('theme__hc-dark');

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const kpiValues = document.querySelectorAll(
      '.legend-marketplace-subscriptions-kpi-bar__value',
    );
    expect(kpiValues.length).toBeGreaterThanOrEqual(2);

    const costSegment = document.querySelector(
      '.legend-marketplace-subscriptions-kpi-bar__cost-segment',
    );
    expect(costSegment).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Annual' })).toBeDefined();

    const filterSelects = document.querySelectorAll(
      '.legend-marketplace-subscriptions-content__filter-select',
    );
    expect(filterSelects).toHaveLength(2);

    const cancelButton = screen.getByRole('button', {
      name: 'Cancel Subscription',
    });
    expect(cancelButton.className).toContain(
      'legend-marketplace-subscriptions-content__cancel-button',
    );
    expect(cancelButton.hasAttribute('disabled')).toBe(true);

    const checkboxCell = await waitFor(() => {
      const cell = document.querySelector(
        '.legend-marketplace-subscriptions-content__cancel-checkbox-cell',
      );
      if (!cell) {
        throw new Error(
          'Expected cancel checkbox cell to be rendered for a subscription row',
        );
      }
      return cell;
    });
    expect(checkboxCell.querySelector('input[type="checkbox"]')).not.toBeNull();
  });
});

describe('LegendMarketplaceSubscriptions - mandatory add-on group selection', () => {
  test('shows permId only for Permission ID rows in the Permission ID column', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          Model: 'Terminal Product',
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          Model: 'News Add-On Product',
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const permissionIdValueCell = document.querySelector(
      '[row-id="sub-1"] .ag-cell[col-id="permId"]',
    );
    const addonPermissionIdValueCell = document.querySelector(
      '[row-id="sub-2"] .ag-cell[col-id="permId"]',
    );
    const permissionIdProductCell = document.querySelector(
      '[row-id="sub-1"] .ag-cell[col-id="model"]',
    );
    expect(permissionIdValueCell?.textContent?.trim()).toBe('999');
    expect(addonPermissionIdValueCell?.textContent?.trim()).toBe('');
    expect(permissionIdProductCell?.textContent).toContain('Terminal Product');
  });

  test('renders mandatory add-on Yes/No values per row', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          Model: 'Terminal Product',
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          Model: 'News Add-On Product',
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-3',
          permId: 999,
          Model: 'Research Add-On Product',
          ServiceName: 'Research Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    expect(screen.queryByLabelText('Mandatory add-on indicator')).toBeNull();

    const permissionIdMandatoryCell = document.querySelector(
      '[row-id="sub-1"] .ag-cell[col-id="isMandatory"]',
    );
    const mandatoryAddonCell = document.querySelector(
      '[row-id="sub-2"] .ag-cell[col-id="isMandatory"]',
    );
    const optionalAddonCell = document.querySelector(
      '[row-id="sub-3"] .ag-cell[col-id="isMandatory"]',
    );

    expect(permissionIdMandatoryCell?.textContent?.trim()).toBe('No');
    expect(mandatoryAddonCell?.textContent?.trim()).toBe('Yes');
    expect(optionalAddonCell?.textContent?.trim()).toBe('No');
  });

  test('checking a mandatory add-on row opens confirmation and does not select until confirmed', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const mandatoryAddonCheckbox = getCancellationCheckboxForRow('sub-2');

    await act(async () => {
      fireEvent.click(mandatoryAddonCheckbox);
    });

    expect(screen.getByText('Cancel Mandatory Add-On')).toBeDefined();
    expect(mandatoryAddonCheckbox.checked).toBe(false);
    const cancelButton = document.querySelector<HTMLButtonElement>(
      '.legend-marketplace-subscriptions-content__cancel-button',
    );
    if (cancelButton === null) {
      throw new Error('Expected cancel button to exist');
    }
    expect(cancelButton.hasAttribute('disabled')).toBe(true);
  });

  test('checking an optional add-on in a mixed mandatory group keeps existing non-modal behavior', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-3',
          permId: 999,
          ServiceName: 'Optional Research Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-3'));
    });

    expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-3').checked).toBe(true);
  });

  test('confirming mandatory-group selection selects the entire permission group', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-3',
          permId: 999,
          ServiceName: 'Analytics Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
        makeSubscriptionFeed({
          id: 'sub-4',
          permId: 888,
          ServiceName: 'Other Group Permission',
          ItemName: 'Permission ID',
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Yes, cancel group' }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-3').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-4').checked).toBe(false);
    expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
  });

  test('confirming mandatory-group selection with search filters still selects hidden rows in the full permission group', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Visible Mandatory Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-3',
          permId: 999,
          ServiceName: 'Hidden Optional Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    const searchInput = screen.getByRole('textbox', {
      name: 'Search subscriptions',
    });
    await act(async () => {
      fireEvent.change(searchInput, {
        target: { value: 'Visible Mandatory Add-On' },
      });
    });
    await waitFor(
      () => {
        expect(document.querySelector('[row-id="sub-2"]')).not.toBeNull();
      },
      { timeout: 10_000 },
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Yes, cancel group' }),
      );
    });

    await act(async () => {
      fireEvent.change(searchInput, {
        target: { value: '' },
      });
    });

    await waitFor(() => {
      expect(document.querySelector('[row-id="sub-1"]')).not.toBeNull();
      expect(document.querySelector('[row-id="sub-3"]')).not.toBeNull();
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-3').checked).toBe(true);
  });

  test('declining mandatory-group selection leaves selection unchanged', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'No' }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });

    expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Cancel Subscription' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  test('unchecking a selected mandatory add-on row clears the whole group without opening modal', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Yes, cancel group' }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(true);

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });
    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Cancel Subscription' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  test('unchecking a selected optional add-on row also clears the whole group when a mandatory add-on is selected', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'Real-Time News Add-On',
          ItemName: 'Add-On',
          isMandatory: true,
        }),
        makeSubscriptionFeed({
          id: 'sub-3',
          permId: 999,
          ServiceName: 'Optional Research Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Yes, cancel group' }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-3').checked).toBe(true);

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-3'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-3').checked).toBe(false);
    expect(
      screen
        .getByRole('button', { name: 'Cancel Subscription' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  test('non-mandatory groups keep existing selection behavior', async () => {
    createSpy(
      MOCK__baseStore.marketplaceServerClient,
      'getSubscriptions',
    ).mockResolvedValue({
      subscription_feeds: [
        makeSubscriptionFeed({
          id: 'sub-1',
          permId: 999,
          ServiceName: 'Level 1',
          ItemName: 'Permission ID',
          isMandatory: false,
        }),
        makeSubscriptionFeed({
          id: 'sub-2',
          permId: 999,
          ServiceName: 'News Add-On',
          ItemName: 'Add-On',
          isMandatory: false,
        }),
      ],
      TotalMonthlyCost: 1200,
    });

    await renderPage();
    await waitFor(() =>
      expect(document.querySelector('.ag-theme-balham')).not.toBeNull(),
    );

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });

    expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(false);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(true);

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-2'));
    });

    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(false);

    await act(async () => {
      fireEvent.click(getCancellationCheckboxForRow('sub-1'));
    });

    expect(getCancellationCheckboxForRow('sub-1').checked).toBe(true);
    expect(getCancellationCheckboxForRow('sub-2').checked).toBe(true);
    expect(screen.queryByText('Cancel Mandatory Add-On')).toBeNull();
  });
});
