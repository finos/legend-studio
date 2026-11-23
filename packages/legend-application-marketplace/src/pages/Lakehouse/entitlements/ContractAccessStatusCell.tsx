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

import { Chip, Tooltip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { ContractAccessStatus } from '../../../utils/EntitlementsUtils.js';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';

// The colors of the chip are the ones of the MUI palette: green, blue, red and grey
const ACCESS_STATUS_CHIP_COLOR: Record<
  ContractAccessStatus,
  'success' | 'info' | 'error' | 'default'
> = {
  [ContractAccessStatus.ACTIVE]: 'success',
  [ContractAccessStatus.SETTING_UP]: 'info',
  [ContractAccessStatus.NEEDS_ATTENTION]: 'error',
  [ContractAccessStatus.NOT_CHECKED]: 'default',
};

const ACCESS_STATUS_CHIP_MODIFIER: Record<ContractAccessStatus, string> = {
  [ContractAccessStatus.ACTIVE]: 'active',
  [ContractAccessStatus.SETTING_UP]: 'setting-up',
  [ContractAccessStatus.NEEDS_ATTENTION]: 'needs-attention',
  [ContractAccessStatus.NOT_CHECKED]: 'not-checked',
};

/**
 * Shows the state of a row followed by its access status (whether the approved
 * access has actually been applied). `syncCheckId` is undefined for rows that
 * have nothing to sync, which just show the state.
 *
 * The cell asks for the sync status of its row when it is shown, and drops that
 * request when it is removed, so only the rows that are on screen are fetched.
 */
export const ContractAccessStatusCell = observer(
  (props: {
    stateLabel: string;
    syncCheckId: string | undefined;
    dashboardState: EntitlementsDashboardState;
  }): React.ReactNode => {
    const { stateLabel, syncCheckId, dashboardState } = props;
    const auth = useAuth();
    const tokenRef = useRef(auth.user?.access_token);
    tokenRef.current = auth.user?.access_token;

    useEffect(() => {
      if (syncCheckId === undefined) {
        return undefined;
      }
      return dashboardState.requestAccessStatus(syncCheckId, tokenRef.current);
    }, [dashboardState, syncCheckId]);

    if (syncCheckId === undefined) {
      return <>{stateLabel}</>;
    }
    const detail = dashboardState.contractAccessStatuses.get(syncCheckId);
    const chip = (
      <Chip
        variant="outlined"
        color={detail ? ACCESS_STATUS_CHIP_COLOR[detail.status] : 'default'}
        className={clsx(
          'marketplace-lakehouse-entitlements__access-status__chip',
          `marketplace-lakehouse-entitlements__access-status__chip--${
            detail ? ACCESS_STATUS_CHIP_MODIFIER[detail.status] : 'checking'
          }`,
        )}
        label={detail?.status ?? 'Checking…'}
      />
    );
    return (
      <div className="marketplace-lakehouse-entitlements__access-status">
        <span className="marketplace-lakehouse-entitlements__access-status__state">
          {stateLabel}
        </span>
        {detail?.reason ? (
          <Tooltip title={detail.reason}>{chip}</Tooltip>
        ) : (
          chip
        )}
      </div>
    );
  },
);
