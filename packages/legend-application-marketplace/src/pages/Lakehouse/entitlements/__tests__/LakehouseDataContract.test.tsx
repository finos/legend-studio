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
import { type ReactElement } from 'react';
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

// The approve/deny buttons open a business-justification prompt via `showTaskActionAlert`
// (backed by `applicationStore.alertService`) instead of calling the action directly. Since the
// alert dialog itself is rendered by a separate top-level provider not mounted in these tests,
// interact with the alert's `prompt`/`actions` data directly rather than through the DOM.
const confirmTaskActionAlert = (
  marketplaceBaseStore: Awaited<
    ReturnType<typeof TEST__provideMockLegendMarketplaceBaseStore>
  >,
  actionLabel: string,
  justification: string,
): void => {
  const info =
    marketplaceBaseStore.applicationStore.alertService.actionAlertInfo;
  if (!info) {
    throw new Error('Expected an action alert to be open');
  }
  // `actionAlertInfo` is a deeply-observed mobx object, so `info.prompt` is not a genuine
  // React element that can be mounted via `render` (its `props` are getter/setter-backed).
  // Call the justification field's `onChange` handler directly instead of going through the DOM.
  const prompt = info.prompt as
    | ReactElement<{
        onChange?: (event: { target: { value: string } }) => void;
      }>
    | undefined;
  prompt?.props.onChange?.({ target: { value: justification } });
  info.actions.find((action) => action.label === actionLabel)?.handler?.();
};

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

  // Captured as a local reference (rather than re-accessed as
  // `marketplaceBaseStore.applicationStore.notificationService.notifyError` at each assertion
  // site) so callers don't reference the class method itself, which is flagged by
  // @typescript-eslint/unbound-method.
  const notifyErrorSpy = createSpy(
    marketplaceBaseStore.applicationStore.notificationService,
    'notifyError',
  ).mockReturnValue(undefined);

  return { notifyErrorSpy };
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

  const { notifyErrorSpy } = setupCommonSpies(marketplaceBaseStore);

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
  return { marketplaceBaseStore, notifyErrorSpy };
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
          marketplaceBaseStore.applicationStore.alertService.actionAlertInfo,
        ).toBeDefined();
      });

      act(() => {
        confirmTaskActionAlert(
          marketplaceBaseStore,
          'Approve',
          'Approved for testing',
        );
      });

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.approveTask,
        ).toHaveBeenCalledWith(
          'pm-task-pending-id',
          expect.any(String),
          'Approved for testing',
        );
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
          marketplaceBaseStore.applicationStore.alertService.actionAlertInfo,
        ).toBeDefined();
      });

      act(() => {
        confirmTaskActionAlert(
          marketplaceBaseStore,
          'Approve',
          'Approved for testing',
        );
      });

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.approveTask,
        ).toHaveBeenCalledWith(
          'do-task-pending-id',
          expect.any(String),
          'Approved for testing',
        );
      });
    });

    test('data owner can deny their assigned task with a business justification', async () => {
      const { marketplaceBaseStore } = await setupLakehouseDataContractTest(
        'contract-pending-do-id',
        'do-task-pending-id',
        mockContracts.pendingDataOwner,
        getMockPendingDataOwnerApprovalTasksResponse(),
        'test-data-owner-user-id',
      );

      const doDenyButton = await screen.findByRole('button', {
        name: 'Deny Task',
      });

      expect(doDenyButton.getAttribute('disabled')).toBeNull();

      fireEvent.click(doDenyButton);

      await waitFor(() => {
        expect(
          marketplaceBaseStore.applicationStore.alertService.actionAlertInfo,
        ).toBeDefined();
      });

      act(() => {
        confirmTaskActionAlert(
          marketplaceBaseStore,
          'Deny',
          'Denied for testing',
        );
      });

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.denyTask,
        ).toHaveBeenCalledWith(
          'do-task-pending-id',
          expect.any(String),
          'Denied for testing',
        );
      });
    });

    test('submits an approval without a business justification', async () => {
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

      fireEvent.click(doApproveButton);

      await waitFor(() => {
        expect(
          marketplaceBaseStore.applicationStore.alertService.actionAlertInfo,
        ).toBeDefined();
      });

      act(() => {
        confirmTaskActionAlert(marketplaceBaseStore, 'Approve', '');
      });

      await waitFor(() => {
        expect(
          marketplaceBaseStore.lakehouseContractServerClient.approveTask,
        ).toHaveBeenCalledWith(
          'do-task-pending-id',
          expect.any(String),
          undefined,
        );
      });
    });

    test('does not submit a denial without a business justification', async () => {
      const { marketplaceBaseStore, notifyErrorSpy } =
        await setupLakehouseDataContractTest(
          'contract-pending-do-id',
          'do-task-pending-id',
          mockContracts.pendingDataOwner,
          getMockPendingDataOwnerApprovalTasksResponse(),
          'test-data-owner-user-id',
        );

      const doDenyButton = await screen.findByRole('button', {
        name: 'Deny Task',
      });

      fireEvent.click(doDenyButton);

      await waitFor(() => {
        expect(
          marketplaceBaseStore.applicationStore.alertService.actionAlertInfo,
        ).toBeDefined();
      });

      act(() => {
        confirmTaskActionAlert(marketplaceBaseStore, 'Deny', '   ');
      });

      expect(notifyErrorSpy).toHaveBeenCalledWith(
        'Business justification is required',
      );
      expect(
        marketplaceBaseStore.lakehouseContractServerClient.denyTask,
      ).not.toHaveBeenCalled();
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
