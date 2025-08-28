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

import { observer } from 'mobx-react-lite';
import {
  withLakehouseEntitlementsStore,
  useLakehouseEntitlementsStore,
} from '../../../application/providers/LakehouseEntitlementsStoreProvider.js';
import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { flowResult } from 'mobx';
import { Container, Tab, Tabs, Typography } from '@mui/material';
import { EntitlementsClosedContractsDashbaord } from './EntitlementsClosedContractsDashboard.js';
import { EntitlementsPendingContractsDashbaord } from './EntitlementsPendingContractsDashboard.js';
import { EntitlementsPendingTasksDashbaord } from './EntitlementsPendingTasksDashboard.js';

const enum EntitlementsTabs {
  PENDING_TASKS = 'pendingTasks',
  PENDING_CONTRACTS = 'pendingContracts',
  CLOSED_CONTRACTS = 'closedContracts',
}

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    // State and props

    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();
    const [selectedTab, setSelectedTab] = useState(
      EntitlementsTabs.PENDING_TASKS,
    );

    // Effects

    useEffect(() => {
      if (
        entitlementsStore.dashboardViewer.initializationState.isInInitialState
      ) {
        // eslint-disable-next-line no-void
        void flowResult(
          entitlementsStore.dashboardViewer.init(auth.user?.access_token),
        );
      }
    }, [auth.user?.access_token, entitlementsStore]);

    // Callbacks

    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: EntitlementsTabs,
    ) => {
      setSelectedTab(newValue);
    };

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-entitlements">
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
          {selectedTab === EntitlementsTabs.PENDING_TASKS && (
            <EntitlementsPendingTasksDashbaord
              dashboardState={entitlementsStore.dashboardViewer}
            />
          )}
          {selectedTab === EntitlementsTabs.PENDING_CONTRACTS && (
            <EntitlementsPendingContractsDashbaord
              dashboardState={entitlementsStore.dashboardViewer}
            />
          )}
          {selectedTab === EntitlementsTabs.CLOSED_CONTRACTS && (
            <EntitlementsClosedContractsDashbaord
              dashboardState={entitlementsStore.dashboardViewer}
            />
          )}
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
