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

import { describe, test, expect, jest } from '@jest/globals';
import {
  type V1_ContractState,
  type V1_ContractUserEventPayload,
  type V1_DataContract,
  V1_ApprovalType,
  V1_ContractEventPayloadType,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LakehouseDataContractTask } from '../LakehouseDataContract.js';
import { type PlainObject } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const createMockContract = (
  overrides: Partial<V1_DataContract> & { guid: string; state: string },
): V1_DataContract =>
  ({
    version: 0,
    description: 'Test contract',
    members: [],
    consumer: {
      _type: 'AdHocTeam',
      users: [
        {
          name: 'test-consumer-user-id',
          type: 'WORKFORCE_USER',
        },
      ],
    },
    createdBy: 'test-requester-user-id',
    createdAt: '2026-01-09T14:30:41.837Z',
    resource: {
      _type: 'AccessPointGroupReference',
      accessPointGroup: 'GROUP1',
      dataProduct: {
        name: 'MOCK_SDLC_DATAPRODUCT',
        owner: {
          appDirId: 12345,
        },
      },
    },
    ...overrides,
  }) as V1_DataContract;

const mockContracts = {
  pendingPrivilegeManager: createMockContract({
    guid: 'contract-pending-pm-id',
    state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL' as V1_ContractState,
    description: 'Test contract pending privilege manager approval',
  }),

  pendingDataOwner: createMockContract({
    guid: 'contract-pending-do-id',
    state: 'PENDING_DATA_OWNER_APPROVAL' as V1_ContractState,
    description: 'Test contract pending data owner approval',
  }),

  completedContract: createMockContract({
    guid: 'contract-completed-id',
    state: 'COMPLETED' as V1_ContractState,
    description: 'Test completed contract',
  }),

  rejectedContract: createMockContract({
    guid: 'contract-rejected-id',
    state: 'REJECTED' as V1_ContractState,
    description: 'Test rejected contract',
  }),

  pendingDataOwnerNoPrivilegeManager: createMockContract({
    guid: 'contract-no-pm-id',
    state: 'PENDING_DATA_OWNER_APPROVAL' as V1_ContractState,
    description:
      'Test contract pending data owner approval without privilege manager',
  }),
};

const mockTasks = {
  privilegeManagerPending: {
    taskId: 'pm-task-pending-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
  },

  privilegeManagerApproved: {
    taskId: 'pm-task-pending-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.APPROVED,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      managerIdentity: 'test-privilege-manager-user-id',
      taskId: 'pm-task-pending-id',
    },
  },

  privilegeManagerDenied: {
    taskId: 'pm-task-denied-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.DENIED,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_REJECTED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      managerIdentity: 'test-privilege-manager-user-id',
      taskId: 'pm-task-denied-id',
    },
  },

  dataOwnerPending: {
    taskId: 'do-task-pending-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
  },

  dataOwnerApproved: {
    taskId: 'do-task-approved-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.APPROVED,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.DATA_PRODUCER_APPROVED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      dataProducerIdentity: 'test-data-owner-user-id',
      taskId: 'do-task-approved-id',
    },
  },

  dataOwnerDenied: {
    taskId: 'do-task-denied-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.DENIED,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.DATA_PRODUCER_REJECTED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      dataProducerIdentity: 'test-data-owner-user-id',
      taskId: 'do-task-denied-id',
    },
  },
};

const createMockTaskResponse = (
  tasks: Array<{
    taskId: string;
    type: V1_ApprovalType;
    status: V1_UserApprovalStatus;
    consumer: string;
    assignees: string[];
    eventPayload?: Partial<V1_ContractUserEventPayload>;
  }>,
): PlainObject => ({
  tasks: tasks.map((task) => ({
    rec: {
      taskId: task.taskId,
      type: task.type,
      status: task.status,
      consumer: task.consumer,
      dataContractId: 'test-contract-id',
      effectiveFrom: '2025-08-07T00:00:00.000Z',
      effectiveTo: '2026-08-07T00:00:00.000Z',
      isEscalated: false,
      eventPayload: {
        type: 'SUBMITTED',
        eventTimestamp: '2025-08-06T08:00:00.069672876Z',
        ...task.eventPayload,
      },
    },
    assignees: task.assignees,
  })),
});

const getMockPendingManagerApprovalTasksResponse = () =>
  createMockTaskResponse([mockTasks.privilegeManagerPending]);

const getMockPendingDataOwnerApprovalTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerPending,
  ]);

const getMockDeniedPrivilegeManagerTasksResponse = () =>
  createMockTaskResponse([mockTasks.privilegeManagerDenied]);

const getMockDeniedDataOwnerTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerDenied,
  ]);

const getMockCompletedTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerApproved,
  ]);

const getMockNoPrivilegeManagerTasksResponse = () =>
  createMockTaskResponse([mockTasks.dataOwnerPending]);

const getMockNoPrivilegeManagerCompletedTasksResponse = () =>
  createMockTaskResponse([mockTasks.dataOwnerApproved]);

const setupLakehouseDataContractTest = async (
  contractId: string,
  taskId: string,
  mockContract: V1_DataContract,
  mockTasksResponse: PlainObject,
  currentUserId: string = 'test-user-id',
) => {
  const marketplaceBaseStore =
    await TEST__provideMockLegendMarketplaceBaseStore();

  marketplaceBaseStore.applicationStore.identityService.setCurrentUser(
    currentUserId,
  );

  createSpy(
    marketplaceBaseStore.applicationStore.navigationService.navigator,
    'generateAddress',
  ).mockImplementation((path: string) => path);

  createSpy(
    marketplaceBaseStore.applicationStore.notificationService,
    'notifySuccess',
  ).mockReturnValue(undefined);

  createSpy(
    marketplaceBaseStore.applicationStore.notificationService,
    'notifyError',
  ).mockReturnValue(undefined);

  createSpy(
    marketplaceBaseStore.lakehouseContractServerClient,
    'getDataContract',
  ).mockResolvedValue({
    dataContracts: [{ dataContract: mockContract }],
  });

  createSpy(
    marketplaceBaseStore.lakehouseContractServerClient,
    'getContractTasks',
  ).mockResolvedValue(mockTasksResponse);

  createSpy(
    marketplaceBaseStore.lakehouseContractServerClient,
    'approveTask',
  ).mockResolvedValue({
    errorMessage: undefined,
  });

  createSpy(
    marketplaceBaseStore.lakehouseContractServerClient,
    'denyTask',
  ).mockResolvedValue({
    errorMessage: undefined,
  });

  const initialRoute = `/lakehouse/entitlements/${contractId}/${taskId}`;

  await act(async () => {
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/lakehouse/entitlements/:dataContractId/:dataContractTaskId"
            element={<LakehouseDataContractTask />}
          />
        </Routes>
      </MemoryRouter>,
    );
  });
  return { marketplaceBaseStore };
};

describe('Lakehouse Data Contract', () => {
  describe('Task loading and display', () => {
    test('loads contract and displays pending privilege manager task', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'test-privilege-manager-user-id',
      );

      const approveButton = await screen.findByRole('button', {
        name: 'Approve Task',
      });
      const denyButton = await screen.findByRole('button', {
        name: 'Deny Task',
      });

      expect(approveButton.getAttribute('disabled')).toBeNull();

      expect(denyButton.getAttribute('disabled')).toBeNull();
    });

    test('disables approve/deny buttons for non-assigned users', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'non-assigned-user-id',
      );

      const approveButton = (await screen.findByText('Approve Task')).closest(
        'button',
      );
      const denyButton = (await screen.findByText('Deny Task')).closest(
        'button',
      );

      expect(approveButton?.getAttribute('disabled')).not.toBeNull();
      expect(denyButton?.getAttribute('disabled')).not.toBeNull();
    });

    test('privilege manager can approve their assigned task', async () => {
      const { marketplaceBaseStore } = await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'test-privilege-manager-user-id',
      );

      const pmApproveButton = await screen.findByRole('button', {
        name: 'Approve Task',
      });

      expect(pmApproveButton.getAttribute('disabled')).toBeNull();

      fireEvent.click(pmApproveButton);

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.approveTask,
        ).toHaveBeenCalledWith('pm-task-pending-id', expect.any(String));
      });
    });

    test('data owner can approve their assigned task', async () => {
      const { marketplaceBaseStore } = await setupLakehouseDataContractTest(
        'contract-pending-do-id',
        'do-task-pending-id',
        mockContracts.pendingDataOwner,
        getMockPendingDataOwnerApprovalTasksResponse(),
        'test-data-owner-user-id',
      );

      const doApproveButton = await screen.findByRole('button', {
        name: 'Approve Task',
      });

      expect(doApproveButton.getAttribute('disabled')).toBeNull();

      fireEvent.click(doApproveButton);

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.approveTask,
        ).toHaveBeenCalledWith('do-task-pending-id', expect.any(String));
      });
    });

    test('data owner cannot approve when privilege manager approval is still pending', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'test-data-owner-user-id',
      );

      const approveButton = (await screen.findByText('Approve Task')).closest(
        'button',
      ) as HTMLButtonElement;
      const denyButton = (await screen.findByText('Deny Task')).closest(
        'button',
      ) as HTMLButtonElement;

      expect(approveButton.disabled).toBe(true);
      expect(denyButton.disabled).toBe(true);
    });
  });

  describe('Timeline status display', () => {
    test('shows "skipped" status for privilege manager when no PM task exists', async () => {
      await setupLakehouseDataContractTest(
        'contract-no-pm-id',
        'do-task-pending-id',
        mockContracts.pendingDataOwnerNoPrivilegeManager,
        getMockNoPrivilegeManagerTasksResponse(),
        'test-data-owner-user-id',
      );

      // The privilege manager step should show as skipped with a tooltip
      const skippedDot = await screen.findByTitle(
        'This step was skipped because it is not required for this contract',
      );
      expect(skippedDot).toBeDefined();
    });

    test('shows denied status for denied privilege manager task', async () => {
      await setupLakehouseDataContractTest(
        'contract-rejected-id',
        'pm-task-denied-id',
        mockContracts.rejectedContract,
        getMockDeniedPrivilegeManagerTasksResponse(),
        'test-privilege-manager-user-id',
      );

      // Verify "Privilege Manager Approval" denied message is shown
      await screen.findByText('Privilege Manager Approval');
      await screen.findByText('Denied by');
      await screen.findByText('test-privilege-manager-user-id');
      await screen.findByText(/08\/06\/2025/);
    });

    test('shows denied status for denied data owner task', async () => {
      await setupLakehouseDataContractTest(
        'contract-rejected-id',
        'do-task-denied-id',
        mockContracts.rejectedContract,
        getMockDeniedDataOwnerTasksResponse(),
        'test-data-owner-user-id',
      );

      const doApprovalText = await screen.findByText('Data Producer Approval');
      expect(doApprovalText).toBeDefined();

      // Verify "Data Producer Approval" denied message is shown
      await screen.findByText('Data Producer Approval');
      await screen.findByText('Denied by');
      await screen.findByText('test-data-owner-user-id');
      expect(await screen.findAllByText(/08\/06\/2025/)).toHaveLength(2);
    });

    test('shows complete status when only data owner approval is completed (no PM required)', async () => {
      await setupLakehouseDataContractTest(
        'contract-no-pm-id',
        'do-task-approved-id',
        mockContracts.pendingDataOwnerNoPrivilegeManager,
        getMockNoPrivilegeManagerCompletedTasksResponse(),
        'test-consumer-user-id',
      );

      // The skipped tooltip should still be present for the PM step
      const skippedDot = await screen.findByTitle(
        'This step was skipped because it is not required for this contract',
      );
      expect(skippedDot).toBeDefined();

      // The complete step text should be rendered
      const completeText = await screen.findByText('Complete');
      expect(completeText).toBeDefined();

      // Verify "Data Producer Approval" approved message are shown
      await screen.findByText('Data Producer Approval');
      await screen.findByText('Approved by');
      await screen.findByText('test-data-owner-user-id');
      await screen.findByText(/08\/06\/2025/);
    });

    test('shows complete status when both PM and data owner approvals are completed', async () => {
      await setupLakehouseDataContractTest(
        'contract-completed-id',
        'do-task-approved-id',
        mockContracts.completedContract,
        getMockCompletedTasksResponse(),
        'test-consumer-user-id',
      );

      const completeText = await screen.findByText('Complete');
      expect(completeText).toBeDefined();

      // Verify "Privilege Manager Approval" and "Data Producer Approval" approved message are shown
      await screen.findByText('Privilege Manager Approval');
      await screen.findByText('Data Producer Approval');
      expect(await screen.findAllByText('Approved by')).toHaveLength(2);
      await screen.findByText('test-privilege-manager-user-id');
      await screen.findByText('test-data-owner-user-id');
      expect(await screen.findAllByText(/08\/06\/2025/)).toHaveLength(2);
    });

    test('privilege manager pending step shows as active with link', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'test-privilege-manager-user-id',
      );

      // Pending PM task should render as a link instead of plain text
      const pmApprovalLink = await screen.findByText(
        'Privilege Manager Approval',
      );
      expect(pmApprovalLink.tagName).toBe('A');
    });

    test('data owner pending step shows as active with link', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-do-id',
        'do-task-pending-id',
        mockContracts.pendingDataOwner,
        getMockPendingDataOwnerApprovalTasksResponse(),
        'test-data-owner-user-id',
      );

      // Pending DO task should render as a link
      const doApprovalLink = await screen.findByText('Data Producer Approval');
      expect(doApprovalLink.tagName).toBe('A');
    });
  });
});
