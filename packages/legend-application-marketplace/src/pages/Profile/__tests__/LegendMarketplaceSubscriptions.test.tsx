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
