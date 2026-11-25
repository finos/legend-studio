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
import {
  PROD_DEPLOYMENT_ID,
  createMockRawDataContractResponse,
  createMockDataProductDetailsResponse,
  taskContractDescriptions,
  mockPendingTasksRawResponse,
  mockContractsForUserRawResponse,
} from './TEST_DATA_EntitlementsDashboards.js';
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

  await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/lakehouse/entitlements?selectedTab=${selectedTab}`,
  );

  return mockedStore;
};

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
