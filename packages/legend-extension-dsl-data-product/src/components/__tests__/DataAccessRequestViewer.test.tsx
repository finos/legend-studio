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
  type PureProtocolProcessorPlugin,
  type V1_DataContract,
  type V1_DataSubscription,
  type V1_TaskResponse,
  GraphManagerState,
  V1_dataContractModelSchema,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared/test';
import { AuthProvider } from 'react-oidc-context';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../__test-utils__/StateTestUtils.js';
import {
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { serialize } from 'serializr';
import { Route, Routes } from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { DataContractViewerState } from '../../stores/DataProduct/DataAccess/DataContractViewerState.js';
import { DataAccessRequestViewer } from '../DataProduct/DataContract/DataAccessRequestViewer.js';
import {
  getMockClosedTasksResponse,
  getMockCompletedTasksResponse,
  getMockDeniedDataOwnerTasksResponse,
  getMockDeniedPrivilegeManagerTasksResponse,
  getMockNoPrivilegeManagerCompletedTasksResponse,
  getMockNoPrivilegeManagerTasksResponse,
  getMockPendingDataOwnerApprovalMultipleAssigneesTasksResponse,
  getMockPendingDataOwnerApprovalTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
  getMockPendingManagerApprovaMultipleConsumersTasksResponse,
  getMockPendingManagerEscalatedTasksResponse,
  getMockSystemAccountNoPrivilegeManagerTasksResponse,
  getMockSystemAccountPendingManagerApprovalTasksResponse,
  mockAutoCreatedSubscription,
  mockContracts,
} from '../__test-utils__/TEST_DATA__LakehouseDataContracts.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupDataContractViewerTest = async (
  mockContractCallback: (
    plugins: PureProtocolProcessorPlugin[],
  ) => V1_DataContract,
  mockTasks: V1_TaskResponse,
  initialSelectedUser?: string,
  mockContractWithMembersCallback?: (
    plugins: PureProtocolProcessorPlugin[],
  ) => V1_DataContract,
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

  const mockContract = mockContractCallback(
    MOCK__applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
  );
  const mockContractObject = serialize(
    V1_dataContractModelSchema(
      MOCK__applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
    ),
    mockContract,
  ) as PlainObject<V1_DataContract>;

  const mockContractWithMembers = mockContractWithMembersCallback?.(
    MOCK__applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
  );
  const mockContractWithMembersObject = mockContractWithMembers
    ? (serialize(
        V1_dataContractModelSchema(
          MOCK__applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        mockContractWithMembers,
      ) as PlainObject<V1_DataContract>)
    : undefined;

  const mockLiteContract =
    V1_transformDataContractToLiteDatacontract(mockContract);

  createSpy(
    lakehouseContractServerClient,
    'getContractTasks',
  ).mockResolvedValue(mockTasks as unknown as PlainObject<V1_TaskResponse>);

  createSpy(lakehouseContractServerClient, 'getDataContract').mockResolvedValue(
    {
      dataContracts: mockContractWithMembersObject
        ? [{ dataContract: mockContractWithMembersObject }]
        : [{ dataContract: mockContractObject }],
    },
  );

  const MOCK__contractViewerState = new DataContractViewerState(
    mockLiteContract,
    (contractId: string, taskId: string) =>
      `http://test-task-url?contractId=${contractId}&taskId=${taskId}`,
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
        <ApplicationStoreProvider store={MOCK__applicationStore}>
          <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
            <ApplicationFrameworkProvider>
              <Routes>
                <Route
                  path="*"
                  element={
                    <DataAccessRequestViewer
                      open={true}
                      onClose={jest.fn()}
                      viewerState={MOCK__contractViewerState}
                      getDataProductUrl={() => ''}
                      initialSelectedUser={initialSelectedUser}
                    />
                  }
                />
              </Routes>
            </ApplicationFrameworkProvider>
          </TEST__BrowserEnvironmentProvider>
        </ApplicationStoreProvider>
        ,
      </AuthProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for async state updates
  });

  return {
    MOCK__contractViewerState,
    renderResult,
  };
};

describe('DataAccessRequestViewer', () => {
  describe('DataContractViewerState', () => {
    describe('renders contract details correctly and handles refresh', () => {
      test('Displays contract details', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerApprovalTasksResponse(),
        );

        // Verify title
        await screen.findByText('Pending Data Access Request');
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
        screen.getByText('Test contract pending privilege manager approval');

        // Verify refresh button
        screen.getByRole('button', { name: 'Refresh' });

        // Verify timeline
        screen.getByText('Submitted');
        screen.getByText('Privilege Manager Approval');
        screen.getByText('Data Producer Approval');
        screen.getByText('Complete');

        // Verify Contract ID
        screen.getByText('Request ID: contract-pending-pm-id');
      });

      test('Displays correct "ordered for" for producer contract type', async () => {
        await setupDataContractViewerTest(
          mockContracts.producerContract,
          getMockPendingManagerApprovalTasksResponse(),
        );

        // Verify metadata
        screen.getByText(/Ordered For/);
        screen.getByText('Producer DID: 12345');
      });

      test('Shows list of "ordered for" if there is more than 1 consumer and respects initialSelectedUser', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManagerMultipleConsumers,
          getMockPendingManagerApprovaMultipleConsumersTasksResponse(),
          'test-consumer-user-id-2',
        );

        // Verify consumers
        await screen.findByText('test-consumer-user-id-2');
        expect(screen.queryByText('test-consumer-user-id-1')).toBeNull();
        const userButton = screen.getByRole('combobox');
        await act(async () => {
          fireEvent.mouseDown(userButton);
        });
        await screen.findByText('test-consumer-user-id');
      });

      test('Refresh button re-initializes data access request viewer', async () => {
        const { MOCK__contractViewerState } = await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
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

      test('Renders subscription details if provided', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
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

    describe('renders timeline steps correctly', () => {
      test('privilege manager pending step shows as active with link', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerApprovalTasksResponse(),
        );
        // Pending PM task should render as a link instead of plain text
        const pmApprovalLink = await screen.findByText(
          'Privilege Manager Approval',
        );
        expect(pmApprovalLink.tagName).toBe('A');
        await screen.findByText('Assignee:');
        screen.getByText('test-privilege-manager-user-id');
      });

      test('data owner pending step shows as active with link and shows approved pending manager step', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingDataOwner,
          getMockPendingDataOwnerApprovalTasksResponse(),
        );
        // Pending DO task should render as a link
        const doApprovalLink = await screen.findByText(
          'Data Producer Approval',
        );
        expect(doApprovalLink.tagName).toBe('A');

        // Verify approved privilege manager task
        await screen.findByText('Approved by');
        screen.getByText('test-privilege-manager-user-id');
        screen.getByText(/08\/06\/2025/);
        screen.getByText(/:00:00/);

        // Verify pending assignee for data owner task
        await screen.findByText('Assignee:');
        screen.getByText('test-data-owner-user-id');
      });

      test('Shows list of assignees if there is more than 1', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingDataOwnerApprovalMultipleAssigneesTasksResponse(),
        );

        // Verify pending assignees
        await screen.findByText('Assignees (2):');
        screen.getByText('test-data-owner-user-id-1');
        screen.getByText('test-data-owner-user-id-2');
      });

      test('shows "skipped" status for privilege manager when no PM task exists', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingDataOwnerNoPrivilegeManager,
          getMockNoPrivilegeManagerTasksResponse(),
        );
        // The privilege manager step should show as skipped with a tooltip
        const skippedDot = await screen.findByTitle(
          'This step was skipped because it is not required for this access request',
        );
        expect(skippedDot).toBeDefined();
      });

      test('shows complete status when both PM and data owner approvals are completed', async () => {
        await setupDataContractViewerTest(
          mockContracts.completedContract,
          getMockCompletedTasksResponse(),
        );

        // Verify title
        await screen.findByText('Data Access Request');
        expect(screen.queryByText('Pending Data Access Request')).toBeNull();

        // Verify approved privilege manager task
        expect(await screen.findAllByText('Approved by')).toHaveLength(2);
        await screen.findByText('Privilege Manager Approval');
        screen.getByText('test-privilege-manager-user-id');
        screen.getByText(/08\/06\/2025/);
        screen.getByText(/:00:00/);

        // Verify approved data owner task
        await screen.findByText('Data Producer Approval');
        screen.getByText('test-data-owner-user-id');
        screen.getByText(/08\/07\/2025/);
        screen.getByText(/:15:00/);
        const completeText = await screen.findByText('Complete');
        expect(completeText).toBeDefined();
      });

      test('shows complete status when only data owner approval is completed (no PM required)', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingDataOwnerNoPrivilegeManager,
          getMockNoPrivilegeManagerCompletedTasksResponse(),
        );
        // The skipped tooltip should still be present for the PM step
        const skippedDot = await screen.findByTitle(
          'This step was skipped because it is not required for this access request',
        );
        expect(skippedDot).toBeDefined();

        // Verify "Data Producer Approval" approved message are shown
        await screen.findByText('Data Producer Approval');
        await screen.findByText('Approved by');
        await screen.findByText('test-data-owner-user-id');
        await screen.findByText(/08\/07\/2025/);
        screen.getByText(/:15:00/);

        // The complete step text should be rendered
        const completeText = await screen.findByText('Complete');
        expect(completeText).toBeDefined();
      });

      test('shows denied status for denied privilege manager task', async () => {
        await setupDataContractViewerTest(
          mockContracts.rejectedContract,
          getMockDeniedPrivilegeManagerTasksResponse(),
        );
        // Verify "Privilege Manager Approval" denied message is shown
        await screen.findByText('Privilege Manager Approval');
        await screen.findByText('Denied by');
        await screen.findByText('test-privilege-manager-user-id');
        await screen.findByText(/08\/06\/2025/);
        screen.getByText(/:00:00/);
      });

      test('shows denied status for denied data owner task', async () => {
        await setupDataContractViewerTest(
          mockContracts.rejectedContract,
          getMockDeniedDataOwnerTasksResponse(),
        );
        // Verify "Data Privlege Manager Approval" approved message is shown
        await screen.findByText('Privilege Manager Approval');
        await screen.findByText('Approved by');
        await screen.findByText('test-privilege-manager-user-id');
        await screen.findByText(/08\/06\/2025/);
        // Verify "Data Producer Approval" denied message is shown
        await screen.findByText('Data Producer Approval');
        await screen.findByText('Denied by');
        await screen.findByText('test-data-owner-user-id');
        await screen.findByText(/08\/06\/2025/);
      });
    });

    describe('renders escalate button correctly', () => {
      test("Shows escalate button for user's own task", async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerApprovalTasksResponse(),
        );

        // Verify escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-consumer-user-id');
        await screen.findByTitle('Escalate request');
      });

      test("Doesn't show escalate button for another user's task", async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerApprovalTasksResponse(),
          'test-consumer-user-id-2',
        );

        // Verify no escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-consumer-user-id-2');
        expect(screen.queryByTitle('Escalate request')).toBeNull();
      });

      test("Doesn't show escalate button when there is no privilege manager approval task", async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingDataOwnerNoPrivilegeManager,
          getMockNoPrivilegeManagerTasksResponse(),
        );

        // Verify no escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-consumer-user-id');
        expect(screen.queryByTitle('Escalate request')).toBeNull();
      });

      test('Shows escalate button for system account task', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockSystemAccountPendingManagerApprovalTasksResponse(),
          'test-system-account-user-id',
          mockContracts.pendingPrivilegeManagerWithSystemAccountMember,
        );

        // Verify escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-system-account-user-id');
        await screen.findByTitle('Escalate request');
      });

      test("Doesn't show escalate button when there is no privilege manager approval task for system account", async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockSystemAccountNoPrivilegeManagerTasksResponse(),
          'test-system-account-user-id',
          mockContracts.pendingPrivilegeManagerWithSystemAccountMember,
        );

        // Verify no escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-system-account-user-id');
        expect(screen.queryByTitle('Escalate request')).toBeNull();
      });

      test('Disables escalate button for already escalated task', async () => {
        await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerEscalatedTasksResponse(),
        );

        // Verify escalate button
        await screen.findByText('Pending Data Access Request');
        await screen.findByText('test-consumer-user-id');
        const escalateButton = (
          await screen.findByTitle('Request has already been escalated')
        ).firstElementChild;
        expect(escalateButton?.hasAttribute('disabled')).toBe(true);
      });

      test('Clicking escalate button opens confirm modal and submitting modal calls escalate endpoint', async () => {
        const { MOCK__contractViewerState } = await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
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
        expect(
          screen.queryByText('test-privilege-manager-user-id-2'),
        ).toBeNull();
        expect(
          screen.queryByText('test-privilege-manager-user-id-3'),
        ).toBeNull();

        // Setup mock for tasks after escalation: update existing spy instead of re-spying
        createSpy(
          MOCK__contractViewerState.lakehouseContractServerClient,
          'getContractTasks',
        ).mockResolvedValue(
          getMockPendingManagerEscalatedTasksResponse() as unknown as PlainObject<V1_TaskResponse>,
        );

        // Get escalate button
        await screen.findByText('Pending Data Access Request');
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
          mockContracts.pendingPrivilegeManager([]).guid,
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
    });

    describe('renders close request button correctly', () => {
      test('Close contract button calls invalidate endpoint', async () => {
        const { MOCK__contractViewerState } = await setupDataContractViewerTest(
          mockContracts.pendingPrivilegeManager,
          getMockPendingManagerApprovalTasksResponse(),
        );

        const invalidateSpy = createSpy(
          MOCK__contractViewerState.lakehouseContractServerClient,
          'invalidateContract',
        ).mockImplementation(async () => Promise.resolve({}));

        expect(invalidateSpy).toHaveBeenCalledTimes(0);

        // Setup mock for contract and tasks after invalidation
        createSpy(
          MOCK__contractViewerState.lakehouseContractServerClient,
          'getDataContract',
        ).mockResolvedValue({
          dataContracts: [{ dataContract: mockContracts.closedContract([]) }],
        });
        createSpy(
          MOCK__contractViewerState.lakehouseContractServerClient,
          'getContractTasks',
        ).mockResolvedValue(
          getMockClosedTasksResponse() as unknown as PlainObject<V1_TaskResponse>,
        );

        // Find and click close request button
        const closeRequestButton = guaranteeNonNullable(
          (await screen.findByTitle('Close Request')).firstElementChild,
        );
        fireEvent.click(closeRequestButton);

        // Verify confirm modal appears
        await screen.findByText('Are you sure you want to close this request?');

        // Click confirm button
        const confirmButton = await screen.findByRole('button', {
          name: 'Close Request',
        });
        await act(() => fireEvent.click(confirmButton));

        // Verify invalidate API called
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledWith(
          mockContracts.closedContract([]).guid,
          'mock-access-token',
        );

        // Verify task shows closed
        await screen.findByText('Closed');

        // Verify close contract button is disabled
        const closedContractButton = guaranteeNonNullable(
          (await screen.findByTitle('Request is already closed'))
            .firstElementChild,
        );
        expect(closedContractButton.hasAttribute('disabled')).toBe(true);
      });
    });
  });
});
