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
  V1_ApprovalType,
  V1_UserApprovalStatus,
  type V1_DataContract,
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

const mockContracts = {
  pendingPrivilegeManager: {
    guid: 'contract-pending-pm-id',
    version: 0,
    state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
    description: 'Test contract pending privilege manager approval',
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
  } as V1_DataContract,

  pendingDataOwner: {
    guid: 'contract-pending-do-id',
    version: 0,
    state: 'PENDING_DATA_OWNER_APPROVAL',
    description: 'Test contract pending data owner approval',
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
  } as V1_DataContract,
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
  },
};

const createMockTaskResponse = (
  tasks: Array<{
    taskId: string;
    type: V1_ApprovalType;
    status: V1_UserApprovalStatus;
    consumer: string;
    assignees: string[];
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
        eventTimestamp: '2025-08-06T11:54:46.069672876Z',
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

      const approveButton = (await screen.findByText('Approve Task')).closest(
        'button',
      ) as HTMLButtonElement;
      const denyButton = (await screen.findByText('Deny Task')).closest(
        'button',
      ) as HTMLButtonElement;

      expect(approveButton.disabled).toBe(false);

      expect(denyButton.disabled).toBe(false);
    });

    test('disables approve/deny buttons for non-assigned users', async () => {
      await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'non-assigned-user-id',
      );

      const approveButton = (
        await screen.findByText('Approve Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;
      const denyButton = (
        await screen.findByText('Deny Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;

      expect(approveButton.disabled).toBe(true);
      expect(denyButton.disabled).toBe(true);
    });

    test('privilege manager can approve their assigned task', async () => {
      const { marketplaceBaseStore } = await setupLakehouseDataContractTest(
        'contract-pending-pm-id',
        'pm-task-pending-id',
        mockContracts.pendingPrivilegeManager,
        getMockPendingManagerApprovalTasksResponse(),
        'test-privilege-manager-user-id',
      );

      const pmApproveButton = (
        await screen.findByText('Approve Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;

      expect(pmApproveButton.disabled).toBe(false);

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

      const doApproveButton = (
        await screen.findByText('Approve Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;

      expect(doApproveButton.disabled).toBe(false);

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

      const approveButton = (
        await screen.findByText('Approve Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;
      const denyButton = (
        await screen.findByText('Deny Task', {}, { timeout: 5000 })
      ).closest('button') as HTMLButtonElement;

      expect(approveButton.disabled).toBe(true);
      expect(denyButton.disabled).toBe(true);
    });
  });
});
