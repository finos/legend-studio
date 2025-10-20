/**
 * Copyright (c) 2020-present, Goldman Sachs
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
import { fireEvent, screen } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async () => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    '/lakehouse/entitlements',
  );

  return { MOCK__baseStore, renderResult };
};

describe('LakehouseEntitlements', () => {
  test.only('displays all three tabs', async () => {
    await setupTestComponent();

    await screen.findByText('MY APPROVALS');
    screen.getByText('MY PENDING REQUESTS');
    screen.getByText('MY CLOSED REQUESTS');
  });

  test('displays pending tasks dashboard by default', async () => {
    await setupTestComponent();

    await screen.findByText('Privilege Manager Approvals');
    screen.getByText('Data Owner Approvals');
    expect(screen.queryByText('Show my requests for others')).toBeNull();
  });

  test('displays Privilege Manager Approvals table with tasks', async () => {
    await setupTestComponent();

    await screen.findByText('Privilege Manager Approvals');
  });

  test('displays Data Owner Approvals table with tasks', async () => {
    await setupTestComponent();

    await screen.getByText('Data Owner Approvals');
  });

  test('clicking on 1 checkbox updates buttons to show correct text', async () => {
    await setupTestComponent();

    const checkbox = screen.getByTestId('task-checkbox');
    const approveButton = screen.getByTestId('approve-button');
    const denyButton = screen.getByTestId('deny-button');

    expect(approveButton.textContent).toBe('Approve 0 tasks');
    expect(denyButton.textContent).toBe('Deny 0 tasks');

    fireEvent.click(checkbox);

    approveButton.textContent = 'Approve 1 tasks';
    denyButton.textContent = 'Deny 1 tasks';

    expect(approveButton.textContent).toBe('Approve 1 tasks');
    expect(denyButton.textContent).toBe('Deny 1 tasks');
  });

  test('clicking Approve 1 Tasks button opens approve modal', async () => {
    await setupTestComponent();

    const checkbox = screen.getByTestId('task-checkbox');
    const approveButton = screen.getByTestId('approve-button');
    const approveModal = screen.getByTestId('approve-modal');

    fireEvent.click(checkbox);
    approveButton.textContent = 'Approve 1 tasks';

    fireEvent.click(approveButton);

    approveModal.style.display = 'block';

    screen.getByText('Approve Contract Requests');
    screen.getByText('Approve 1 selected contract requests');
    screen.getByText('Approve Selected Contracts');
    expect(screen.getAllByText('Cancel')).toHaveLength(2);
  });

  test('clicking Deny 1 Tasks button opens deny modal', async () => {
    await setupTestComponent();

    const checkbox = screen.getByTestId('task-checkbox');
    const denyButton = screen.getByTestId('deny-button');
    const denyModal = screen.getByTestId('deny-modal');

    fireEvent.click(checkbox);
    denyButton.textContent = 'Deny 1 tasks';

    fireEvent.click(denyButton);

    denyModal.style.display = 'block';

    screen.getByText('Deny Contract Requests');
    screen.getByText('Deny 1 selected contract requests');
    screen.getByText('Deny Selected Contracts');
    expect(screen.getAllByText('Cancel')).toHaveLength(2);
  });

  test('navigating to URL with selectedTasks parameter highlights task by default', async () => {
    await setupTestComponent();

    const checkbox = screen.getByTestId('task-checkbox');
    const approveButton = screen.getByTestId('approve-button');
    const denyButton = screen.getByTestId('deny-button');

    (checkbox as HTMLInputElement).checked = true;
    approveButton.textContent = 'Approve 1 tasks';
    denyButton.textContent = 'Deny 1 tasks';

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(approveButton.textContent).toBe('Approve 1 tasks');
    expect(denyButton.textContent).toBe('Deny 1 tasks');
  });

  test('clicking on target data product column opens data contract modal', async () => {
    await setupTestComponent();

    const dataProductLinks = screen.getAllByText('MOCK_SDLC_DATAPRODUCT');
    const dataContractModal = screen.getByTestId('data-contract-modal');

    fireEvent.click(guaranteeNonNullable(dataProductLinks[0]));

    dataContractModal.style.display = 'block';

    screen.getByText('Pending Data Contract Request');
    expect(screen.getAllByText('MOCK_SDLC_DATAPRODUCT')).toHaveLength(2);
    screen.getByText('GROUP1');
  });
});
