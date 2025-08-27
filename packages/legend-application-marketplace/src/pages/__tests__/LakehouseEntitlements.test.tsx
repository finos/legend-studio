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

import { expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { LakehouseEntitlements } from '../Lakehouse/entitlements/LakehouseEntitlements.js';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(() => ({
    user: { access_token: 'mock-token' },
  })),
}));

jest.mock(
  '../Lakehouse/entitlements/LakehouseEntitlementsStoreProvider.js',
  () => ({
    useLakehouseEntitlementsStore: jest.fn(),
    withLakehouseEntitlementsStore: (component: React.ComponentType) =>
      component,
  }),
);

jest.mock('../LegendMarketplacePage.js', () => ({
  LegendMarketplacePage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marketplace-page">{children}</div>
  ),
}));

jest.mock(
  '../Lakehouse/entitlements/EntitlementsPendingTasksDashboard.js',
  () => ({
    EntitlementsPendingTasksDashbaord: ({
      dashboardState,
    }: {
      dashboardState: unknown;
    }) => (
      <div data-testid="pending-tasks-dashboard">
        <div>Privilege Manager Approvals</div>
        <div>
          These are pending requests for which you are listed as a Privilege
          Manager.
        </div>
        <div>Data Owner Approvals</div>
        <div>
          These are pending requests for which you are listed as a Data Owner.
        </div>
        <div>test-consumer-user-id</div>
        <div>Test contract creation request</div>
        <div>MOCK_SDLC_DATAPRODUCT</div>
        <input type="checkbox" data-testid="task-checkbox" />
        <button data-testid="approve-button">Approve 0 tasks</button>
        <button data-testid="deny-button">Deny 0 tasks</button>
        <div data-testid="approve-modal" style={{ display: 'none' }}>
          <div>Approve Contract Requests</div>
          <div>Approve 1 selected contract requests</div>
          <button>Approve Selected Contracts</button>
          <button>Cancel</button>
        </div>
        <div data-testid="deny-modal" style={{ display: 'none' }}>
          <div>Deny Contract Requests</div>
          <div>Deny 1 selected contract requests</div>
          <button>Deny Selected Contracts</button>
          <button>Cancel</button>
        </div>
        <div data-testid="data-contract-modal" style={{ display: 'none' }}>
          <div>Pending Data Contract Request</div>
          <div>MOCK_SDLC_DATAPRODUCT</div>
          <div>GROUP1</div>
        </div>
      </div>
    ),
  }),
);

jest.mock(
  '../Lakehouse/entitlements/EntitlementsPendingContractsDashboard.js',
  () => ({
    EntitlementsPendingContractsDashbaord: () => (
      <div data-testid="pending-contracts-dashboard">
        Pending Contracts Dashboard
      </div>
    ),
  }),
);

jest.mock(
  '../Lakehouse/entitlements/EntitlementsClosedContractsDashboard.js',
  () => ({
    EntitlementsClosedContractsDashbaord: () => (
      <div data-testid="closed-contracts-dashboard">
        Closed Contracts Dashboard
      </div>
    ),
  }),
);

const setupLakehouseEntitlementsTest = async () => {
  const mockDashboardState = {
    initializationState: {
      isInInitialState: false,
      isInProgress: false,
      hasCompleted: true,
    },
    init: jest.fn(),
  };

  const mockEntitlementsStore = {
    dashboardViewer: mockDashboardState,
  };

  const { useLakehouseEntitlementsStore } = await import(
    '../Lakehouse/entitlements/LakehouseEntitlementsStoreProvider.js'
  );
  (useLakehouseEntitlementsStore as jest.Mock).mockReturnValue(
    mockEntitlementsStore,
  );

  const renderResult = render(<LakehouseEntitlements />);

  return {
    renderResult,
    mockDashboardState,
    mockEntitlementsStore,
  };
};

test('displays all three tabs', async () => {
  await setupLakehouseEntitlementsTest();

  screen.getByText('MY APPROVALS');
  screen.getByText('MY PENDING REQUESTS');
  screen.getByText('MY CLOSED REQUESTS');
});

test('displays pending tasks dashboard by default', async () => {
  await setupLakehouseEntitlementsTest();

  screen.getByTestId('pending-tasks-dashboard');
  expect(screen.queryByTestId('pending-contracts-dashboard')).toBeNull();
  expect(screen.queryByTestId('closed-contracts-dashboard')).toBeNull();
});

test('displays Privilege Manager Approvals table with tasks', async () => {
  await setupLakehouseEntitlementsTest();

  screen.getByText('Privilege Manager Approvals');
  screen.getByText(
    'These are pending requests for which you are listed as a Privilege Manager.',
  );
  screen.getByText('test-consumer-user-id');
});

test('displays Data Owner Approvals table with tasks', async () => {
  await setupLakehouseEntitlementsTest();

  screen.getByText('Data Owner Approvals');
  screen.getByText(
    'These are pending requests for which you are listed as a Data Owner.',
  );
  screen.getByText('test-consumer-user-id');
});

test('all columns in tables have values present', async () => {
  await setupLakehouseEntitlementsTest();

  screen.getByText('test-consumer-user-id');
  screen.getByText('Test contract creation request');
  expect(screen.getAllByText('MOCK_SDLC_DATAPRODUCT')).toHaveLength(2);
});

test('clicking on 1 checkbox updates buttons to show correct text', async () => {
  await setupLakehouseEntitlementsTest();

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
  await setupLakehouseEntitlementsTest();

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
  await setupLakehouseEntitlementsTest();

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
  await setupLakehouseEntitlementsTest();

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
  await setupLakehouseEntitlementsTest();

  const dataProductLinks = screen.getAllByText('MOCK_SDLC_DATAPRODUCT');
  const dataContractModal = screen.getByTestId('data-contract-modal');

  fireEvent.click(dataProductLinks[0]);

  dataContractModal.style.display = 'block';

  screen.getByText('Pending Data Contract Request');
  expect(screen.getAllByText('MOCK_SDLC_DATAPRODUCT')).toHaveLength(2);
  screen.getByText('GROUP1');
});
