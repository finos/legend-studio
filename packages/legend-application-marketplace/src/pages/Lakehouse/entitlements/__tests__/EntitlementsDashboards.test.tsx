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
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import type { V1_DataRequestsWithWorkflowResponse } from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  PROD_DEPLOYMENT_ID,
  createMockRawDataContractResponse,
  createMockDataProductDetailsResponse,
  taskContractDescriptions,
  mockPendingTasksRawResponse,
  mockContractsForUserRawResponse,
  createMockRawContractForUserResponse,
  createMockRawDataRequestWithWorkflow,
  createMockRawPendingDataRequestTasksResponse,
} from './TEST_DATA_EntitlementsDashboards.js';
import { EntitlementsDashboardState } from '../../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../../../__lib__/LegendMarketplaceAppEvent.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('swiper/react', () => ({
  Swiper: () => <div></div>,
  SwiperSlide: () => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: () => <div></div>,
  Pagination: () => <div></div>,
  Autoplay: () => <div></div>,
}));

const setupEntitlementsRenderTest = async (
  dataProductEnv: string,
  selectedTab: string,
  beforeRender?: (
    mockedStore: Awaited<
      ReturnType<typeof TEST__provideMockLegendMarketplaceBaseStore>
    >,
  ) => void,
) => {
  const mockedStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv,
  });

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getPendingTasks',
  ).mockResolvedValue(mockPendingTasksRawResponse);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataContract',
  ).mockImplementation(async (contractId: string) => {
    const info = taskContractDescriptions[contractId];
    return createMockRawDataContractResponse(
      contractId,
      info?.description ?? 'Unknown',
      info?.deploymentId ?? PROD_DEPLOYMENT_ID,
    );
  });

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getContractsForUser',
  ).mockResolvedValue(mockContractsForUserRawResponse);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getContractsCreatedByUser',
  ).mockResolvedValue([]);

  createSpy(
    mockedStore.lakehouseContractServerClient,
    'getDataProductByIdAndDID',
  ).mockImplementation(async (_resourceId: string, deploymentId: number) =>
    createMockDataProductDetailsResponse(deploymentId),
  );

  beforeRender?.(mockedStore);

  await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/lakehouse/entitlements?selectedTab=${selectedTab}`,
  );

  return mockedStore;
};

// The viewer shows when a contract was created
const withCreatedAt = (
  rawContract: ReturnType<typeof createMockRawContractForUserResponse>,
) => ({
  ...rawContract,
  contractResultLite: {
    ...rawContract.contractResultLite,
    createdAt: '2026-01-15T10:00:00Z',
  },
});

describe('LakehouseEntitlements - Environment Filtering', () => {
  describe('EntitlementsPendingTasksDashboard', () => {
    test('prod user sees only prod privilege manager and data owner tasks', async () => {
      await setupEntitlementsRenderTest('prod', 'pendingTasks');

      await screen.findByText('Privilege Manager Approvals');
      screen.getByText('Data Owner Approvals');

      await waitFor(() => {
        screen.getByText('Prod PM task 1');
        screen.getByText('Prod PM task 2');
        screen.getByText('Prod DO task 1');
        screen.getByText('Prod DO task 2');
      });

      expect(screen.queryByText('ProdPar PM task 1')).toBeNull();
      expect(screen.queryByText('ProdPar PM task 2')).toBeNull();
      expect(screen.queryByText('ProdPar DO task 1')).toBeNull();
      expect(screen.queryByText('ProdPar DO task 2')).toBeNull();
    });

    test('prod-par user sees only prod-par privilege manager and data owner tasks', async () => {
      await setupEntitlementsRenderTest('prod-par', 'pendingTasks');

      await screen.findByText('Privilege Manager Approvals');
      screen.getByText('Data Owner Approvals');

      await waitFor(() => {
        screen.getByText('ProdPar PM task 1');
        screen.getByText('ProdPar PM task 2');
        screen.getByText('ProdPar DO task 1');
        screen.getByText('ProdPar DO task 2');
      });

      expect(screen.queryByText('Prod PM task 1')).toBeNull();
      expect(screen.queryByText('Prod PM task 2')).toBeNull();
      expect(screen.queryByText('Prod DO task 1')).toBeNull();
      expect(screen.queryByText('Prod DO task 2')).toBeNull();
    });

    test('search box narrows visible tasks across all grids', async () => {
      await setupEntitlementsRenderTest('prod', 'pendingTasks');

      await waitFor(() => {
        screen.getByText('Prod PM task 1');
        screen.getByText('Prod PM task 2');
        screen.getByText('Prod DO task 1');
        screen.getByText('Prod DO task 2');
      });

      const searchInput = screen.getByPlaceholderText(
        'Search all approvals...',
      );
      fireEvent.change(searchInput, { target: { value: 'Prod PM task 1' } });

      await waitFor(() => {
        screen.getByText('Prod PM task 1');
        expect(screen.queryByText('Prod PM task 2')).toBeNull();
        expect(screen.queryByText('Prod DO task 1')).toBeNull();
        expect(screen.queryByText('Prod DO task 2')).toBeNull();
      });
    });

    test('select-all only selects tasks visible after filtering, not hidden ones', async () => {
      await setupEntitlementsRenderTest('prod', 'pendingTasks');

      await waitFor(() => {
        screen.getByText('Prod PM task 1');
        screen.getByText('Prod PM task 2');
      });

      const searchInput = screen.getByPlaceholderText(
        'Search all approvals...',
      );
      fireEvent.change(searchInput, { target: { value: 'Prod PM task 1' } });

      await waitFor(() => {
        screen.getByText('Prod PM task 1');
        expect(screen.queryByText('Prod PM task 2')).toBeNull();
      });

      const pmContainer = screen
        .getByText('Privilege Manager Approvals')
        .closest(
          '.marketplace-lakehouse-entitlements__pending-tasks__grid-container',
        );
      const headerCheckbox = within(pmContainer as HTMLElement).getAllByRole(
        'checkbox',
      )[0];

      fireEvent.click(headerCheckbox as HTMLElement);

      // Only the single visible (filtered-in) task should be selected, even
      // though a second Privilege Manager task exists but is hidden by the
      // active search filter.
      await screen.findByRole('button', { name: 'Approve 1 tasks' });
    });
  });

  describe('EntitlementsPendingContractsDashboard', () => {
    test('prod user sees only prod pending contracts', async () => {
      await setupEntitlementsRenderTest('prod', 'pendingContracts');

      await waitFor(() => {
        screen.getByText('Prod pending contract 1');
        screen.getByText('Prod pending contract 2');
      });

      expect(screen.queryByText('ProdPar pending contract 1')).toBeNull();
      expect(screen.queryByText('ProdPar pending contract 2')).toBeNull();
    });

    test('prod-par user sees only prod-par pending contracts', async () => {
      await setupEntitlementsRenderTest('prod-par', 'pendingContracts');

      await waitFor(() => {
        screen.getByText('ProdPar pending contract 1');
        screen.getByText('ProdPar pending contract 2');
      });

      expect(screen.queryByText('Prod pending contract 1')).toBeNull();
      expect(screen.queryByText('Prod pending contract 2')).toBeNull();
    });
  });

  describe('EntitlementsClosedContractsDashboard', () => {
    test('prod user sees only prod closed contracts', async () => {
      await setupEntitlementsRenderTest('prod', 'closedContracts');

      await waitFor(() => {
        screen.getByText('Prod closed contract 1');
        screen.getByText('Prod closed contract 2');
      });

      expect(screen.queryByText('ProdPar closed contract 1')).toBeNull();
      expect(screen.queryByText('ProdPar closed contract 2')).toBeNull();
    });

    test('shows the access status of approved contracts based on their sync status', async () => {
      const syncStatusSpies: Record<string, unknown> = {
        'closed-prod-1': {
          status: 'FULLY_SYNCED',
          subscriptions: [{ guid: 'sub-1' }],
        },
        'closed-prod-2': {
          status: 'NEVER_SYNCED',
          subscriptions: [{ guid: 'sub-2' }],
        },
      };
      let syncStatusSpy:
        | jest.SpiedFunction<
            LakehouseContractServerClient['getContractSyncStatus']
          >
        | undefined;
      await setupEntitlementsRenderTest('prod', 'closedContracts', (store) => {
        syncStatusSpy = createSpy(
          store.lakehouseContractServerClient,
          'getContractSyncStatus',
        ).mockImplementation(
          async (id: string) => syncStatusSpies[id] as PlainObject,
        );
      });

      await waitFor(() => {
        screen.getByText('Prod closed contract 1');
      });
      await waitFor(() => {
        expect(screen.getAllByText('Active')).toHaveLength(1);
        expect(screen.getAllByText('Setting up')).toHaveLength(1);
      });
      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
      // an approved row is never shown with its state alone
      expect(screen.queryByText('Checking…')).toBeNull();
      // the statuses are fetched on load, there is no button to sync them
      expect(
        screen.queryByRole('button', { name: 'Sync Entitlements' }),
      ).toBeNull();
    });

    test('shows Not checked when the sync status cannot be fetched', async () => {
      await setupEntitlementsRenderTest('prod', 'closedContracts', (store) => {
        createSpy(
          store.lakehouseContractServerClient,
          'getContractSyncStatus',
        ).mockRejectedValue(new Error('500'));
      });

      await waitFor(() => {
        expect(screen.getAllByText('Not checked')).toHaveLength(2);
      });
      expect(screen.queryByText('Active')).toBeNull();
    });

    test('refreshing a contract in the viewer fetches its sync status and unsynced entities again', async () => {
      const syncedUsersMissing = {
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [{ guid: 'sub-1' }],
        unsyncedUsers: [{ username: 'USER1' }],
      };
      let syncStatusSpy:
        | jest.SpiedFunction<
            LakehouseContractServerClient['getContractSyncStatus']
          >
        | undefined;
      await setupEntitlementsRenderTest('prod', 'closedContracts', (store) => {
        // approved for the user, while other users of the contract are pending: its
        // state is not terminal, so the viewer has a Refresh button
        createSpy(
          store.lakehouseContractServerClient,
          'getContractsForUser',
        ).mockResolvedValue([
          withCreatedAt(
            createMockRawContractForUserResponse(
              'approved-others-pending',
              'Approved while others are pending',
              'PENDING_DATA_OWNER_APPROVAL',
              'APPROVED',
              PROD_DEPLOYMENT_ID,
            ),
          ),
        ]);
        createSpy(
          store.lakehouseContractServerClient,
          'getContractTasks',
        ).mockResolvedValue({ tasks: [] });
        // the viewer loads the contract again, with its members
        createSpy(
          store.lakehouseContractServerClient,
          'getDataContract',
        ).mockResolvedValue({
          dataContracts: [
            {
              dataContract: {
                ...createMockRawDataContractResponse(
                  'approved-others-pending',
                  'Approved while others are pending',
                  PROD_DEPLOYMENT_ID,
                ).dataContracts[0]?.dataContract,
                state: 'PENDING_DATA_OWNER_APPROVAL',
                createdAt: '2026-01-15T10:00:00Z',
              },
            },
          ],
        });
        syncStatusSpy = createSpy(
          store.lakehouseContractServerClient,
          'getContractSyncStatus',
        )
          .mockResolvedValueOnce(syncedUsersMissing)
          .mockResolvedValue({
            status: 'FULLY_SYNCED',
            subscriptions: [{ guid: 'sub-1' }],
          });
      });

      await screen.findByText('Setting up');
      fireEvent.click(screen.getByText('Approved while others are pending'));
      await screen.findByText('Contract Errors:');
      // opening it reused what was fetched for the row
      expect(syncStatusSpy).toHaveBeenCalledTimes(1);

      // the sync finished since: refreshing fetches again
      fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }));

      await screen.findByText('Active');
      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.queryByText('Contract Errors:')).toBeNull();
      });
    });

    test.each([
      [
        'Setting up, nothing listed as unsynced',
        { status: 'NOT_FULLY_SYNCED', subscriptions: [{ guid: 'sub-1' }] },
        'Approved. Waiting for access to be granted.',
      ],
      [
        'Needs attention, no subscription',
        { status: 'NOT_FULLY_SYNCED' },
        'This contract has no subscription, so access cannot be applied yet.',
      ],
    ])(
      'opening a contract that is %s shows its contract error, without waiting for the missing ingests lookup',
      async (_, syncStatus, expectedReason) => {
        // the lookup of the missing ingests takes several calls: here it never ends
        createSpy(
          EntitlementsDashboardState.prototype,
          'getUnverifiedIngestDefinitions',
        ).mockReturnValue(new Promise<string[]>(() => undefined));
        await setupEntitlementsRenderTest(
          'prod',
          'closedContracts',
          (store) => {
            createSpy(
              store.lakehouseContractServerClient,
              'getContractsForUser',
            ).mockResolvedValue([
              withCreatedAt(
                createMockRawContractForUserResponse(
                  'approved-others-pending',
                  'Approved while others are pending',
                  'PENDING_DATA_OWNER_APPROVAL',
                  'APPROVED',
                  PROD_DEPLOYMENT_ID,
                ),
              ),
            ]);
            createSpy(
              store.lakehouseContractServerClient,
              'getContractTasks',
            ).mockResolvedValue({ tasks: [] });
            createSpy(
              store.lakehouseContractServerClient,
              'getDataContract',
            ).mockResolvedValue({
              dataContracts: [
                {
                  dataContract: {
                    ...createMockRawDataContractResponse(
                      'approved-others-pending',
                      'Approved while others are pending',
                      PROD_DEPLOYMENT_ID,
                    ).dataContracts[0]?.dataContract,
                    state: 'PENDING_DATA_OWNER_APPROVAL',
                    createdAt: '2026-01-15T10:00:00Z',
                  },
                },
              ],
            });
            createSpy(
              store.lakehouseContractServerClient,
              'getContractSyncStatus',
            ).mockResolvedValue(syncStatus);
          },
        );

        await waitFor(() => {
          expect(
            screen.queryByText('Setting up') ??
              screen.queryByText('Needs attention'),
          ).not.toBeNull();
        });
        fireEvent.click(screen.getByText('Approved while others are pending'));

        fireEvent.click(await screen.findByText('Contract Errors:'));
        await screen.findByText(expectedReason);
      },
    );

    test('prod-par user sees only prod-par closed contracts', async () => {
      await setupEntitlementsRenderTest('prod-par', 'closedContracts');

      await waitFor(() => {
        screen.getByText('ProdPar closed contract 1');
        screen.getByText('ProdPar closed contract 2');
      });

      expect(screen.queryByText('Prod closed contract 1')).toBeNull();
      expect(screen.queryByText('Prod closed contract 2')).toBeNull();
    });
  });
});

describe('LakehouseEntitlements - RMS data request contract errors', () => {
  const DATA_REQUEST_ID = 'data-request-prod-1';

  const mockDataRequestsCreatedByUser = (
    store: Awaited<
      ReturnType<typeof TEST__provideMockLegendMarketplaceBaseStore>
    >,
    description: string,
    state: string,
  ) => {
    createSpy(
      store.lakehouseContractServerClient,
      'getDataAccessRequestsCreatedBy',
    ).mockResolvedValue({
      dataRequests: [
        createMockRawDataRequestWithWorkflow(
          DATA_REQUEST_ID,
          description,
          state,
          PROD_DEPLOYMENT_ID,
        ),
      ],
    } as unknown as V1_DataRequestsWithWorkflowResponse);
  };

  const getContractErrorsRequestedFor = (
    spy: jest.SpiedFunction<EntitlementsDashboardState['getContractErrors']>,
    guid: string,
  ) => spy.mock.calls.filter(([contract]) => contract.guid === guid);

  test('closed requests: selecting a completed data request shows its unsynced entities', async () => {
    const getContractErrorsSpy = createSpy(
      EntitlementsDashboardState.prototype,
      'getContractErrors',
    );
    let syncStatusSpy:
      | jest.SpiedFunction<
          LakehouseContractServerClient['getContractSyncStatus']
        >
      | undefined;
    await setupEntitlementsRenderTest('prod', 'closedContracts', (store) => {
      mockDataRequestsCreatedByUser(
        store,
        'Prod completed data request',
        'COMPLETED',
      );
      syncStatusSpy = createSpy(
        store.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue({
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [{ guid: 'sub-1' }],
        unsyncedUsers: [{ username: 'USER1' }],
        unsyncedTargetAccounts: ['test_snowflake_account'],
        unsyncedAccessPoints: [{ accessPointName: 'AP1' }],
      });
    });

    fireEvent.click(await screen.findByText('Prod completed data request'));

    // the sync status is checked because the data request is completed
    await waitFor(() => {
      expect(
        getContractErrorsRequestedFor(getContractErrorsSpy, DATA_REQUEST_ID),
      ).toHaveLength(1);
    });
    const [, , checkSyncStatus] = guaranteeNonNullable(
      getContractErrorsRequestedFor(getContractErrorsSpy, DATA_REQUEST_ID)[0],
    );
    expect(checkSyncStatus).toBe(true);
    expect(syncStatusSpy).toHaveBeenCalledWith(
      DATA_REQUEST_ID,
      'mock-access-token',
    );

    fireEvent.click(await screen.findByText('Contract Errors:'));
    fireEvent.click(screen.getByText('Unsynced Entities:'));
    screen.getByText('Users: (1)');
    screen.getByText('Target Accounts: (1)');
    screen.getByText('Access Points: (1)');

    // opening the request reused the status fetched when the tab loaded
    expect(
      syncStatusSpy?.mock.calls.filter(([id]) => id === DATA_REQUEST_ID),
    ).toHaveLength(1);
  });

  test('pending requests: selecting a data request looks up its errors without a sync check', async () => {
    const getContractErrorsSpy = createSpy(
      EntitlementsDashboardState.prototype,
      'getContractErrors',
    );
    await setupEntitlementsRenderTest('prod', 'pendingContracts', (store) => {
      mockDataRequestsCreatedByUser(
        store,
        'Prod pending data request',
        'SUBMITTED_FOR_APPROVALS',
      );
    });

    fireEvent.click(await screen.findByText('Prod pending data request'));

    await waitFor(() => {
      expect(
        getContractErrorsRequestedFor(getContractErrorsSpy, DATA_REQUEST_ID),
      ).toHaveLength(1);
    });
    const [lite, , checkSyncStatus] = guaranteeNonNullable(
      getContractErrorsRequestedFor(getContractErrorsSpy, DATA_REQUEST_ID)[0],
    );
    expect(lite.resourceId).toBe('TestDataProduct');
    expect(lite.accessPointGroup).toBe('TestAPG');
    expect(checkSyncStatus).toBeUndefined();
  });

  test('pending tasks: selecting a data request task looks up its errors', async () => {
    const getContractErrorsSpy = createSpy(
      EntitlementsDashboardState.prototype,
      'getContractErrors',
    );
    await setupEntitlementsRenderTest('prod', 'pendingTasks', (store) => {
      createSpy(
        store.lakehouseContractServerClient,
        'getPendingDataRequestTasks',
      ).mockResolvedValue(
        createMockRawPendingDataRequestTasksResponse(
          DATA_REQUEST_ID,
          PROD_DEPLOYMENT_ID,
        ) as PlainObject,
      );
      createSpy(
        store.lakehouseContractServerClient,
        'getDataAccessRequestWithWorkflow',
      ).mockResolvedValue({
        dataRequests: [
          createMockRawDataRequestWithWorkflow(
            DATA_REQUEST_ID,
            'Prod pending data request task',
            'SUBMITTED_FOR_APPROVALS',
            PROD_DEPLOYMENT_ID,
          ),
        ],
      } as PlainObject);
    });

    fireEvent.click(await screen.findByText('Prod pending data request task'));

    await waitFor(() => {
      expect(
        getContractErrorsRequestedFor(getContractErrorsSpy, DATA_REQUEST_ID),
      ).toHaveLength(1);
    });
  });
});

describe('LakehouseEntitlements - Telemetry', () => {
  test('logs a tab click when switching to the My Pending Requests tab', async () => {
    const mockedStore = await setupEntitlementsRenderTest(
      'prod',
      'pendingTasks',
    );

    const logEventSpy = createSpy(
      mockedStore.applicationStore.telemetryService,
      'logEvent',
    ).mockReturnValue(undefined);

    const pendingRequestsTab = await screen.findByRole('tab', {
      name: 'MY PENDING REQUESTS',
    });
    fireEvent.click(pendingRequestsTab);

    await waitFor(() => {
      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_MARKETPLACE_APP_EVENT.CLICK_ENTITLEMENTS_TAB,
        expect.objectContaining({ tabTitle: 'My Pending Requests' }),
      );
    });
  });

  test('logs toggling "show my requests for others" on the pending requests dashboard', async () => {
    const mockedStore = await setupEntitlementsRenderTest(
      'prod',
      'pendingContracts',
    );

    await waitFor(() => {
      screen.getByText('Prod pending contract 1');
    });

    const logEventSpy = createSpy(
      mockedStore.applicationStore.telemetryService,
      'logEvent',
    ).mockReturnValue(undefined);

    const toggle = await screen.findByRole('switch', {
      name: 'Show my requests for others',
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_SHOW_REQUESTS_FOR_OTHERS,
        expect.objectContaining({
          toggleAction: 'enabled',
          dashboard: 'Pending Requests',
        }),
      );
    });
  });

  test('logs toggling "show my requests for others" on the closed requests dashboard', async () => {
    const mockedStore = await setupEntitlementsRenderTest(
      'prod',
      'closedContracts',
    );

    await waitFor(() => {
      screen.getByText('Prod closed contract 1');
    });

    const logEventSpy = createSpy(
      mockedStore.applicationStore.telemetryService,
      'logEvent',
    ).mockReturnValue(undefined);

    const toggle = await screen.findByRole('switch', {
      name: 'Show my requests for others',
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_SHOW_REQUESTS_FOR_OTHERS,
        expect.objectContaining({
          toggleAction: 'enabled',
          dashboard: 'Closed Requests',
        }),
      );
    });
  });
});
