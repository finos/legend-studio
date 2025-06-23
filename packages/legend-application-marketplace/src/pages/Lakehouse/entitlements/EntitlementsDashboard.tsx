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

import { withAuth } from 'react-oidc-context';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Container, Tab, Tabs, Typography } from '@mui/material';
import { EntitlementsPendingTasksDashbaord } from './EntitlementsPendingTasksDashboard.js';
import { EntitlementsPendingContractsDashbaord } from './EntitlementsPendingContractsDashboard.js';
import { EntitlementsClosedContractsDashbaord } from './EntitlementsClosedContractsDashboard.js';

const enum EntitlementsTabs {
  PENDING_TASKS = 'pendingTasks',
  PENDING_CONTRACTS = 'pendingContracts',
  CLOSED_CONTRACTS = 'closedContracts',
}

export const EntitlementsDashboard = withAuth(
  observer((props: { dashboardState: EntitlementsDashboardState }) => {
    const { dashboardState } = props;

    const tasks = dashboardState.pendingTasks;

    const [selectedTab, setSelectedTab] = useState(
      EntitlementsTabs.PENDING_TASKS,
    );

    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: EntitlementsTabs,
    ) => {
      setSelectedTab(newValue);
    };

    return (
      <Container
        className="marketplace-lakehouse-entitlements-dashboard"
        maxWidth="xxl"
      >
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                MY APPROVALS
              </Typography>
            }
            value={EntitlementsTabs.PENDING_TASKS}
          />
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                MY PENDING REQUESTS
              </Typography>
            }
            value={EntitlementsTabs.PENDING_CONTRACTS}
          />
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                MY CLOSED REQUESTS
              </Typography>
            }
            value={EntitlementsTabs.CLOSED_CONTRACTS}
          />
        </Tabs>
        {selectedTab === EntitlementsTabs.PENDING_TASKS &&
          tasks !== undefined && (
            <EntitlementsPendingTasksDashbaord
              dashboardState={dashboardState}
            />
          )}
        {selectedTab === EntitlementsTabs.PENDING_CONTRACTS && (
          <EntitlementsPendingContractsDashbaord
            dashboardState={dashboardState}
          />
        )}
        {selectedTab === EntitlementsTabs.CLOSED_CONTRACTS && (
          <EntitlementsClosedContractsDashbaord
            dashboardState={dashboardState}
          />
        )}
      </Container>
    );
  }),
);
