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
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import type { V1_LiteDataContract, V1_TaskResponse } from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import { AuthProvider } from 'react-oidc-context';
import { EntitlementsDataContractViewerState } from '../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { EntitlementsDataContractViewer } from '../DataContractViewer/EntitlementsDataContractViewer.js';
import {
  mockApprovedTasksResponse,
  mockDataContract,
  mockDataContractMultipleConsumers,
  mockDeniedTasksResponse,
  mockPendingDataOwnerApprovalTasksResponse,
  mockPendingManagerApprovalMultipleAssigneesTasksResponse,
  mockPendingManagerApprovalMultipleConsumersTasksResponse,
  mockPendingManagerApprovalTasksResponse,
} from '../__test-utils__/TEST_DATA__LakehouseContractData.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('swiper/react', () => ({
  Swiper: ({}) => <div></div>,
  SwiperSlide: ({}) => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: ({}) => <div></div>,
  Pagination: ({}) => <div></div>,
  Autoplay: ({}) => <div></div>,
}));

const setupDataContractViewerTest = async (
  mockContract: V1_LiteDataContract,
  mockTasks: V1_TaskResponse,
  initialSelectedUser?: string,
) => {
  const mockedStore = await TEST__provideMockLegendMarketplaceBaseStore();

  mockedStore.applicationStore.navigationService.navigator.generateAddress =
    jest.fn((location: string) => location);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getContractTasks',
  ).mockImplementation(async (contractId: string) => {
    return mockTasks as unknown as PlainObject<V1_TaskResponse>;
  });

  const contractViewerState = new EntitlementsDataContractViewerState(
    mockContract,
    mockedStore.lakehouseContractServerClient,
  );

  let renderResult;

  await act(async () => {
    renderResult = render(
      <AuthProvider>
        <EntitlementsDataContractViewer
          open={true}
          currentViewer={contractViewerState}
          legendMarketplaceStore={mockedStore}
          onClose={jest.fn()}
          initialSelectedUser={initialSelectedUser}
        />
      </AuthProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return {
    mockedStore,
    mockedContractViewerState: contractViewerState,
    renderResult,
  };
};

test('Displays contract details', async () => {
  await setupDataContractViewerTest(
    mockDataContract,
    mockPendingManagerApprovalTasksResponse,
  );

  // Verify title
  await screen.findByText('Pending Data Contract Request');
  await screen.findByText(/Access request for/);
  screen.getByText(/GROUP1/);
  screen.getByText(/Access Point Group in/);
  screen.getByText(/MOCK_SDLC_DATAPRODUCT/);
  screen.getByText(/Data Product/);

  // Verify metadata
  await screen.findByText('Ordered By:');
  screen.getByText('test-requester-user-id');
  screen.getByText(/Ordered For/);
  screen.getByText('test-consumer-user-id');
  screen.getByText('Business Justification:');
  screen.getByText('Test contract creation request');

  // Verify refresh button
  screen.getByRole('button', { name: 'Refresh' });

  // Verify timeline
  screen.getByText('Submitted');
  screen.getByText('Privilege Manager Approval');
  screen.getByText('Data Producer Approval');
  screen.getByText('Complete');

  // Verify Contract ID
  screen.getByText('Contract ID: test-data-contract-id');
});

test('Shows correct details for Pending Privilege Manager Approval', async () => {
  await setupDataContractViewerTest(
    mockDataContract,
    mockPendingManagerApprovalTasksResponse,
  );

  // Verify pending assignee
  await screen.findByText('Assignee:');
  screen.getByText('test-privilege-manager-user-id');
});

test('Shows correct details for Pending Data Producer Approval', async () => {
  await setupDataContractViewerTest(
    mockDataContract,
    mockPendingDataOwnerApprovalTasksResponse,
  );

  // Verify approved task
  await screen.findByText('Approved by');
  screen.getByText('test-privilege-manager-user-id');
  screen.getByText(/08\/06\/2025/);
  screen.getByText(/:54:46/);

  // Verify pending assignee
  await screen.findByText('Assignee:');
  screen.getByText('test-data-owner-user-id');
});

test('Shows correct details for Approved contract', async () => {
  await setupDataContractViewerTest(
    mockDataContract,
    mockApprovedTasksResponse,
  );

  // Verify title
  await screen.findByText('Data Contract Request');
  expect(screen.queryByText('Pending Data Contract Request')).toBeNull();

  // Verify approved privilege manager task
  expect(await screen.findAllByText('Approved by')).toHaveLength(2);
  screen.getByText('test-privilege-manager-user-id');
  screen.getByText(/08\/06\/2025/);
  screen.getByText(/:54:46/);

  // Verify approved data owner task
  screen.getByText('test-data-owner-user-id');
  screen.getByText(/08\/07\/2025/);
  screen.getByText(/:32:18/);
});

test('Shows correct details for Denied contract', async () => {
  await setupDataContractViewerTest(mockDataContract, mockDeniedTasksResponse);

  // Verify denied privilege manager task
  await screen.findByText('Denied by');
  screen.getByText('test-privilege-manager-user-id');
  screen.getByText(/08\/06\/2025/);
  screen.getByText(/:54:46/);
});

test('Shows list of assignees if there is more than 1', async () => {
  await setupDataContractViewerTest(
    mockDataContract,
    mockPendingManagerApprovalMultipleAssigneesTasksResponse,
  );

  // Verify pending assignees
  await screen.findByText('Assignees (2):');
  screen.getByText('test-privilege-manager-user-id-1');
  screen.getByText('test-privilege-manager-user-id-2');
});

test('Shows list of "ordered for"" if there is more than 1 consumer and respects initialSelectedUser', async () => {
  await setupDataContractViewerTest(
    mockDataContractMultipleConsumers,
    mockPendingManagerApprovalMultipleConsumersTasksResponse,
    'test-consumer-user-id-2',
  );

  // Verify consumers
  await screen.findByText('test-consumer-user-id-2');
  expect(screen.queryByText('test-consumer-user-id-1')).toBeNull();
  const userButton = screen.getByRole('combobox');
  await act(async () => {
    fireEvent.mouseDown(userButton);
  });
  await screen.findByText('test-consumer-user-id-1');
});

test('Refresh button re-initializes data contract viewer', async () => {
  const { mockedContractViewerState } = await setupDataContractViewerTest(
    mockDataContract,
    mockPendingManagerApprovalTasksResponse,
  );

  // Verify refresh button
  const refreshButton = await screen.findByRole('button', { name: 'Refresh' });

  const initSpy = jest.spyOn(mockedContractViewerState, 'init');

  expect(initSpy).toHaveBeenCalledTimes(0);

  fireEvent.click(refreshButton);

  await waitFor(() => expect(initSpy).toHaveBeenCalledTimes(1));
});
