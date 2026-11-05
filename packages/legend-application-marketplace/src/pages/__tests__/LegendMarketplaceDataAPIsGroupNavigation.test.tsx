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

import { describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { ServiceDetail } from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { mockServices } from '../../components/__test-utils__/TEST_DATA__DataAPIs.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setUp = async () => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  createSpy(baseStore.engineServerClient, 'getServicesInfo').mockResolvedValue(
    mockServices.map((s) => ServiceDetail.fromJson(s)),
  );
  await TEST__setUpMarketplaceLakehouse(baseStore, '/data-apis');
  await waitFor(() => screen.getByText(/\d+ Services/));
  fireEvent.click(screen.getByTitle('Tree View'));
  return baseStore;
};

describe('Data APIs tree: go to a single group', () => {
  test('re-renders the page for only that group in place, without a page load', async () => {
    const baseStore = await setUp();
    const { navigator } = baseStore.applicationStore.navigationService;
    const pageLoad = createSpy(navigator, 'goToLocation');

    expect(screen.queryByText(/Showing only/)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Go to test/alloy'));
    });

    await waitFor(() => screen.getByText(/Showing only/));
    expect(pageLoad).not.toHaveBeenCalled();
    expect(screen.getByText('test/alloy', { selector: 'b' })).toBeDefined();
    expect(screen.getByText('4 Services')).toBeDefined();
    expect(screen.getAllByRole('treeitem')).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Collapse alloy' }),
    ).toBeDefined();
  });

  test('"Show all services" returns to the full tree in place', async () => {
    const baseStore = await setUp();
    const pageLoad = createSpy(
      baseStore.applicationStore.navigationService.navigator,
      'goToLocation',
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Go to test/alloy'));
    });
    await waitFor(() => screen.getByText(/Showing only/));

    await act(async () => {
      fireEvent.click(screen.getByText('Show all services'));
    });
    await waitFor(() => expect(screen.queryByText(/Showing only/)).toBeNull());
    expect(pageLoad).not.toHaveBeenCalled();
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  });
});
