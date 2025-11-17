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
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import {
  type V1_DataContract,
  type V1_DataSubscription,
  type V1_LiteDataContract,
  type V1_TaskResponse,
  GraphManagerState,
} from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import { AuthProvider } from 'react-oidc-context';
import { EntitlementsDataContractViewerState } from '../../stores/DataProduct/EntitlementsDataContractViewerState.js';
import { EntitlementsDataContractViewer } from '../DataProduct/DataContract/EntitlementsDataContractViewer.js';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../__test-utils__/StateTestUtils.js';
import {
  getMockPendingManagerApprovalTasksResponse,
  mockApprovedTasksResponse,
  mockDataContract,
  mockDataContractMultipleConsumers,
  mockDataContractWithSystemAccountMember,
  mockDeniedTasksResponse,
  mockEscalatedPendingManagerApprovalTasksResponse,
  mockPendingDataOwnerApprovalTasksResponse,
  mockPendingManagerApprovalMultipleAssigneesTasksResponse,
  mockPendingManagerApprovalMultipleConsumersTasksResponse,
  mockAutoCreatedSubscription,
} from '../__test-utils__/TEST_DATA__LakehouseContractData.js';
import { ApplicationStore } from '@finos/legend-application';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupDataContractViewerTest = async (
  mockContract: V1_LiteDataContract,
  mockTasks: V1_TaskResponse,
  initialSelectedUser?: string,
  contractWithMembers?: V1_DataContract,
  mockSubscription?: V1_DataSubscription,
) => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  const MOCK__applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  MOCK__applicationStore.identityService.setCurrentUser(
    'test-consumer-user-id',
  );

  const lakehouseContractServerClient = new LakehouseContractServerClient({
    baseUrl: 'http://test-contract-server-client',
  });
  lakehouseContractServerClient.setTracerService(
    MOCK__applicationStore.tracerService,
  );

  MOCK__applicationStore.navigationService.navigator.generateAddress = jest.fn(
    (location: string) => location,
  );

  createSpy(
    lakehouseContractServerClient,
    'getContractTasks',
  ).mockResolvedValue(mockTasks as unknown as PlainObject<V1_TaskResponse>);

  createSpy(lakehouseContractServerClient, 'getDataContract').mockResolvedValue(
    {
      dataContracts: contractWithMembers
        ? [{ dataContract: contractWithMembers }]
        : [],
    },
  );

  const MOCK__contractViewerState = new EntitlementsDataContractViewerState(
    mockContract,
    mockSubscription,
    MOCK__applicationStore,
    lakehouseContractServerClient,
    new GraphManagerState(
      MOCK__applicationStore.pluginManager,
      MOCK__applicationStore.logService,
    ),
    undefined,
  );

  let renderResult;

  await act(async () => {
    renderResult = render(
      <AuthProvider>
        <EntitlementsDataContractViewer
          open={true}
          onClose={jest.fn()}
          currentViewer={MOCK__contractViewerState}
          getContractTaskUrl={() => ''}
          getDataProductUrl={() => ''}
          initialSelectedUser={initialSelectedUser}
        />
      </AuthProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return {
    MOCK__contractViewerState,
    renderResult,
  };
};

describe('EntitlementsDataContractViewer', () => {
  test('Displays contract details', async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
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
      getMockPendingManagerApprovalTasksResponse(),
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
    await setupDataContractViewerTest(
      mockDataContract,
      mockDeniedTasksResponse,
    );

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
    const { MOCK__contractViewerState } = await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
    );

    // Verify refresh button
    const refreshButton = await screen.findByRole('button', {
      name: 'Refresh',
    });

    const initSpy = jest.spyOn(MOCK__contractViewerState, 'init');

    expect(initSpy).toHaveBeenCalledTimes(0);

    fireEvent.click(refreshButton);

    await waitFor(() => expect(initSpy).toHaveBeenCalledTimes(1));
  });

  test("Shows escalate button for user's own task", async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
    );

    // Verify escalate button
    await screen.findByText('Pending Data Contract Request');
    await screen.findByText('test-consumer-user-id');
    await screen.findByTitle('Escalate request');
  });

  test("Doesn't show escalate button for another user's task", async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
      'test-consumer-user-id-2',
    );

    // Verify no escalate button
    await screen.findByText('Pending Data Contract Request');
    await screen.findByText('test-consumer-user-id-2');
    expect(screen.queryByTitle('Escalate request')).toBeNull();
  });

  test('Shows escalate button for system accountn task', async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
      'test-system-account-user-id',
      mockDataContractWithSystemAccountMember,
    );

    // Verify escalate button
    await screen.findByText('Pending Data Contract Request');
    await screen.findByText('test-system-account-user-id');
    await screen.findByTitle('Escalate request');
  });

  test('Disables escalate button for already escalated task', async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(true),
    );

    // Verify escalate button
    await screen.findByText('Pending Data Contract Request');
    await screen.findByText('test-consumer-user-id');
    const escalateButton = (
      await screen.findByTitle('Request has already been escalated')
    ).firstElementChild;
    expect(escalateButton?.hasAttribute('disabled')).toBe(true);
  });

  test('Clicking escalate button opens confirm modal and submitting modal calls escalate endpoint', async () => {
    const { MOCK__contractViewerState } = await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
    );

    const escalateSpy = createSpy(
      MOCK__contractViewerState.lakehouseContractServerClient,
      'escalateUserOnContract',
    ).mockImplementation(async () => Promise.resolve({}));

    expect(escalateSpy).toHaveBeenCalledTimes(0);

    // Verify 1 approver
    await screen.findByText('Assignee:');
    screen.getByText('test-privilege-manager-user-id');
    expect(screen.queryByText('test-privilege-manager-user-id-2')).toBeNull();
    expect(screen.queryByText('test-privilege-manager-user-id-3')).toBeNull();

    // Setup mock for tasks after escalation: update existing spy instead of re-spying
    createSpy(
      MOCK__contractViewerState.lakehouseContractServerClient,
      'getContractTasks',
    ).mockResolvedValue(
      mockEscalatedPendingManagerApprovalTasksResponse as unknown as PlainObject<V1_TaskResponse>,
    );

    // Get escalate button
    await screen.findByText('Pending Data Contract Request');
    await screen.findByText('test-consumer-user-id');
    const escalateButton = guaranteeNonNullable(
      (await screen.findByTitle('Escalate request')).firstElementChild,
    );
    fireEvent.click(escalateButton);

    await screen.findByText(
      'Are you sure you want to escalate the privilege manager approval request?',
    );
    const confirmButton = await screen.findByRole('button', {
      name: 'Escalate',
    });

    // Verify escalate API called
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(escalateSpy).toHaveBeenCalledTimes(1);
    expect(escalateSpy).toHaveBeenCalledWith(
      mockDataContract.guid,
      'test-consumer-user-id',
      false,
      'mock-access-token',
    );

    // Verify multiple approvers after escalation
    await screen.findByText('Assignees (3):');
    screen.getByText('test-privilege-manager-user-id');
    screen.getByText('test-privilege-manager-user-id-2');
    screen.getByText('test-privilege-manager-user-id-3');
  });

  test('Renders subscription details if provided', async () => {
    await setupDataContractViewerTest(
      mockDataContract,
      getMockPendingManagerApprovalTasksResponse(),
      undefined,
      undefined,
      mockAutoCreatedSubscription,
    );

    // Verify subscription info in footer
    await screen.findByText(
      `A subscription has been auto-created for you with Snowflake account test-snowflake-account-id.`,
    );
  });
});
