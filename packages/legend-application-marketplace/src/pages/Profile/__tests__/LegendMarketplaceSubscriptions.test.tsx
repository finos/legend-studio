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

  test('cancelling a Permission ID row only includes addons that are currently visible/selected, not ones hidden by an active search', async () => {
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
    await waitFor(
      () => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      },
      { timeout: 2000 },
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

    // Only the visible/selected Permission ID row is cancelled — the hidden
    // add-on (never shown, never checked) must not be silently included.
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
    await waitFor(
      () => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      },
      { timeout: 2000 },
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
