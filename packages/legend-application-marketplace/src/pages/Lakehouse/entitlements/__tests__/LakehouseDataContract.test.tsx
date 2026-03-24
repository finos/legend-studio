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
  type V1_EntitlementsDataProductDetailsResponse,
  V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LakehouseDataContractTask } from '../LakehouseDataContract.js';
import { type PlainObject } from '@finos/legend-shared';
import {
  getMockPendingDataOwnerApprovalTasksResponse,
  getMockPendingManagerApprovalTasksResponse,
  mockContracts,
  mockDataProductDetailsResponse,
} from '@finos/legend-extension-dsl-data-product/test-utils';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupCommonSpies = (
  marketplaceBaseStore: Awaited<
    ReturnType<typeof TEST__provideMockLegendMarketplaceBaseStore>
  >,
) => {
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
};

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

  setupCommonSpies(marketplaceBaseStore);

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

  describe('Cross-environment redirect', () => {
    const ADJACENT_ENV_URL = 'https://adjacent.legend.gs.com';

    const setupRedirectTest = async (
      userEnv: string,
      dataProductEnvType: V1_EntitlementsLakehouseEnvironmentType,
    ) => {
      const marketplaceBaseStore =
        await TEST__provideMockLegendMarketplaceBaseStore({
          dataProductEnv: userEnv,
          adjacentEnvUrl: ADJACENT_ENV_URL,
        });

      marketplaceBaseStore.applicationStore.identityService.setCurrentUser(
        'test-user-id',
      );

      setupCommonSpies(marketplaceBaseStore);

      const goToAddressSpy = createSpy(
        marketplaceBaseStore.applicationStore.navigationService.navigator,
        'goToAddress',
      ).mockReturnValue(undefined);

      const getCurrentLocationSpy = createSpy(
        marketplaceBaseStore.applicationStore.navigationService.navigator,
        'getCurrentLocation',
      ).mockReturnValue(
        '/lakehouse/entitlements/contract-pending-pm-id/pm-task-pending-id',
      );

      const mockContract = mockContracts.pendingPrivilegeManager(
        marketplaceBaseStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
      );

      createSpy(
        marketplaceBaseStore.lakehouseContractServerClient,
        'getDataContract',
      ).mockResolvedValue({
        dataContracts: [{ dataContract: mockContract }],
      });

      createSpy(
        marketplaceBaseStore.lakehouseContractServerClient,
        'getContractTasks',
      ).mockResolvedValue(
        getMockPendingManagerApprovalTasksResponse() as unknown as PlainObject<V1_TaskResponse>,
      );

      createSpy(
        marketplaceBaseStore.lakehouseContractServerClient,
        'getDataProductByIdAndDID',
      ).mockResolvedValue(
        mockDataProductDetailsResponse(
          dataProductEnvType,
        ) as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>,
      );

      const contractId = 'contract-pending-pm-id';
      const taskId = 'pm-task-pending-id';
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

      return { marketplaceBaseStore, goToAddressSpy, getCurrentLocationSpy };
    };

    test('redirects to adjacent environment when user is on prod and contract is in prod-par', async () => {
      const { goToAddressSpy, getCurrentLocationSpy } = await setupRedirectTest(
        'prod',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
      );

      await waitFor(() => {
        expect(getCurrentLocationSpy).toHaveBeenCalled();
        expect(goToAddressSpy).toHaveBeenCalledWith(
          `${ADJACENT_ENV_URL}/lakehouse/entitlements/contract-pending-pm-id/pm-task-pending-id`,
        );
      });
    });

    test('redirects to adjacent environment when user is on prod-par and contract is in prod', async () => {
      const { goToAddressSpy, getCurrentLocationSpy } = await setupRedirectTest(
        'prod-par',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      );

      await waitFor(() => {
        expect(getCurrentLocationSpy).toHaveBeenCalled();
        expect(goToAddressSpy).toHaveBeenCalledWith(
          `${ADJACENT_ENV_URL}/lakehouse/entitlements/contract-pending-pm-id/pm-task-pending-id`,
        );
      });
    });

    test('does not redirect when contract is in the same environment as the user', async () => {
      const { goToAddressSpy } = await setupRedirectTest(
        'prod',
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(goToAddressSpy).not.toHaveBeenCalled();
    });
  });
});
