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

import { describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  ContractAccessStatus,
  type ContractAccessStatusDetail,
} from '../../../../utils/EntitlementsUtils.js';
import { EntitlementsDashboardState } from '../../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { LakehouseEntitlementsStore } from '../../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { createSpy } from '@finos/legend-shared/test';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { ContractAccessStatusCell } from '../ContractAccessStatusCell.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const CHIP_CLASS = 'marketplace-lakehouse-entitlements__access-status__chip';

const createDashboardState = async (
  statuses: Record<string, ContractAccessStatusDetail> = {},
): Promise<EntitlementsDashboardState> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const dashboardState = new EntitlementsDashboardState(
    new LakehouseEntitlementsStore(baseStore),
  );
  Object.entries(statuses).forEach(([id, status]) =>
    dashboardState.contractAccessStatuses.set(id, status),
  );
  // the cell asks for the status of its row: this keeps it from calling the server
  createSpy(dashboardState, 'requestAccessStatus').mockReturnValue(
    () => undefined,
  );
  return dashboardState;
};

const detail = (
  status: ContractAccessStatus,
  reason?: string,
): ContractAccessStatusDetail => ({ status, reason });

describe('ContractAccessStatusCell', () => {
  test('asks for the status of its row when it is shown, with the token', async () => {
    const dashboardState = await createDashboardState();
    const requestSpy = createSpy(dashboardState, 'requestAccessStatus');
    render(
      <ContractAccessStatusCell
        stateLabel="Approved"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith('c1', 'mock-access-token');
  });

  test('drops its request when it is removed, such as when its row scrolls away', async () => {
    const dashboardState = await createDashboardState();
    const cancel = jest.fn();
    createSpy(dashboardState, 'requestAccessStatus').mockReturnValue(cancel);
    const { unmount } = render(
      <ContractAccessStatusCell
        stateLabel="Approved"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );
    expect(cancel).not.toHaveBeenCalled();

    unmount();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  test('asks for nothing when its row has nothing to sync', async () => {
    const dashboardState = await createDashboardState();
    const requestSpy = createSpy(dashboardState, 'requestAccessStatus');
    render(
      <ContractAccessStatusCell
        stateLabel="Denied"
        syncCheckId={undefined}
        dashboardState={dashboardState}
      />,
    );

    expect(requestSpy).not.toHaveBeenCalled();
  });

  test('a row with nothing to sync shows just its state', async () => {
    const dashboardState = await createDashboardState();
    const { container } = render(
      <ContractAccessStatusCell
        stateLabel="Denied"
        syncCheckId={undefined}
        dashboardState={dashboardState}
      />,
    );

    screen.getByText('Denied');
    expect(container.querySelector(`.${CHIP_CLASS}`)).toBeNull();
  });

  test('shows Checking… until the status is known', async () => {
    const dashboardState = await createDashboardState();
    const { container } = render(
      <ContractAccessStatusCell
        stateLabel="Approved"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );

    screen.getByText('Approved');
    screen.getByText('Checking…');
    expect(container.querySelector(`.${CHIP_CLASS}--checking`)).not.toBeNull();
  });

  test.each([
    [ContractAccessStatus.ACTIVE, 'active', 'Success'],
    [ContractAccessStatus.SETTING_UP, 'setting-up', 'Info'],
    [ContractAccessStatus.NEEDS_ATTENTION, 'needs-attention', 'Error'],
    [ContractAccessStatus.NOT_CHECKED, 'not-checked', 'Default'],
  ])(
    '%s gets the %s chip style and its color',
    async (status, modifier, color) => {
      const dashboardState = await createDashboardState({
        c1: detail(status),
      });
      const { container } = render(
        <ContractAccessStatusCell
          stateLabel="Completed"
          syncCheckId="c1"
          dashboardState={dashboardState}
        />,
      );

      screen.getByText('Completed');
      const chip = container.querySelector(`.${CHIP_CLASS}`);
      expect(chip?.textContent).toBe(status);
      expect(chip?.classList.contains(`${CHIP_CLASS}--${modifier}`)).toBe(true);
      // the color of the status: green, blue, red or grey
      expect(chip?.classList.contains(`MuiChip-color${color}`)).toBe(true);
      // the chip is text only, there is no dot or icon in it
      expect(chip?.querySelector('.MuiChip-icon')).toBeNull();
    },
  );

  test('the status can change after it was rendered', async () => {
    const dashboardState = await createDashboardState();
    const { container } = render(
      <ContractAccessStatusCell
        stateLabel="Approved"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );
    expect(container.querySelector(`.${CHIP_CLASS}--checking`)).not.toBeNull();

    act(() => {
      dashboardState.contractAccessStatuses.set(
        'c1',
        detail(ContractAccessStatus.ACTIVE),
      );
    });

    await screen.findByText('Active');
    expect(container.querySelector(`.${CHIP_CLASS}--active`)).not.toBeNull();
    expect(container.querySelector(`.${CHIP_CLASS}--checking`)).toBeNull();
  });

  test('the reason is shown when hovering the chip', async () => {
    const dashboardState = await createDashboardState({
      c1: detail(
        ContractAccessStatus.NEEDS_ATTENTION,
        'This contract has no subscription, so access cannot be applied yet.',
      ),
    });
    render(
      <ContractAccessStatusCell
        stateLabel="Completed"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );

    fireEvent.mouseOver(screen.getByText('Needs attention'));

    await screen.findByText(
      'This contract has no subscription, so access cannot be applied yet.',
    );
  });

  test('is styled with classes, not inline styles', async () => {
    const dashboardState = await createDashboardState({
      c1: detail(ContractAccessStatus.ACTIVE),
    });
    const { container } = render(
      <ContractAccessStatusCell
        stateLabel="Completed"
        syncCheckId="c1"
        dashboardState={dashboardState}
      />,
    );

    expect(container.querySelectorAll('[style]')).toHaveLength(0);
    expect(
      container.querySelector(
        '.marketplace-lakehouse-entitlements__access-status',
      ),
    ).not.toBeNull();
  });
});
