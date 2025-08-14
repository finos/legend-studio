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

import { jest, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import { TEST__provideMockedLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { type PlainObject } from '@finos/legend-shared';
import type { V1_LiteDataContract, V1_TaskResponse } from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import {
  getMockDataContract,
  getMockPendingManagerApprovalTasksResponse,
} from '../__test-utils__/TEST_DATA__LakehouseContractData.js';
import { AuthProvider } from 'react-oidc-context';
import { EntitlementsDataContractViewerState } from '../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { EntitlementsDataContractViewer } from '../DataContractViewer/EntitlementsDataContractViewer.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

enum MOCK_DataContractId {
  PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL = 'mock-pending-privilege-manager-approval-contract-id',
  PENDING_DATA_OWNER_APPROVAL = 'mock-pending-data-owner-approval-contract-id',
  APPROVED = 'mock-approved-contract-id',
  DENIED = 'mock-denied-contract-id',
}

const setupDataContractViewerTest = async (
  mockContract: V1_LiteDataContract,
  mockTasks: V1_TaskResponse,
) => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();

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
        />
      </AuthProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return { mockedStore, renderResult };
};

test('Displays contract details', async () => {
  await setupDataContractViewerTest(
    getMockDataContract(
      MOCK_DataContractId.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    ),
    getMockPendingManagerApprovalTasksResponse(
      MOCK_DataContractId.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    ),
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
  screen.getByText(
    `Contract ID: ${
      MOCK_DataContractId.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL
    }`,
  );
});
