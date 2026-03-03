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
  type PureProtocolProcessorPlugin,
  type V1_TaskResponse,
  type V1_DataContract,
} from '@finos/legend-graph';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LakehouseDataContractTask } from '../LakehouseDataContract.js';
import { type PlainObject } from '@finos/legend-shared';
import {
  getMockPendingDataOwnerApprovalTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
  mockContracts,
} from '@finos/legend-extension-dsl-data-product/test-utils';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupLakehouseDataContractTest = async (
  contractId: string,
  taskId: string,
  mockContractCallback: (
    plugins: PureProtocolProcessorPlugin[],
  ) => V1_DataContract,
  mockTasksResponse: V1_TaskResponse,
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
    dataContracts: [
      {
        dataContract: mockContractCallback(
          marketplaceBaseStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
        ),
      },
    ],
  });

  createSpy(
    marketplaceBaseStore.lakehouseContractServerClient,
    'getContractTasks',
  ).mockResolvedValue(
    mockTasksResponse as unknown as PlainObject<V1_TaskResponse>,
  );

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
});
