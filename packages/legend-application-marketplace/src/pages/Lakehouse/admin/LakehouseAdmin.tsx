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
  withLakehouseAdminStore,
  useLakehouseAdminStore,
} from '../../../application/providers/LakehouseAdminStoreProvider.js';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useEffect, useState } from 'react';
import { Container, Tab, Tabs, Typography } from '@mui/material';
import { LakehouseAdminSubscriptionsDashboard } from './LakehouseAdminSubscriptionsDashboard.js';
import { LakehouseAdminContractsDashboard } from './LakehouseAdminContractsDashboard.js';

const enum AdminTabs {
  ALL_CONTRACTS = 'allContracts',
  ALL_SUBSCRIPTIONS = 'allSubscriptions',
}

export const LakehouseAdmin = withLakehouseAdminStore(
  observer(() => {
    const adminStore = useLakehouseAdminStore();
    const auth = useAuth();

    const [selectedTab, setSelectedTab] = useState(AdminTabs.ALL_CONTRACTS);

    useEffect(() => {
      adminStore.init(auth.user?.access_token);
    }, [auth.user?.access_token, adminStore]);

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-admin">
        <Container
          className="marketplace-lakehouse-admin-container"
          maxWidth="xxl"
        >
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab
              label={
                <Typography variant="h4" gutterBottom={true}>
                  ALL CONTRACTS
                </Typography>
              }
              value={AdminTabs.ALL_CONTRACTS}
            />
            <Tab
              label={
                <Typography variant="h4" gutterBottom={true}>
                  ALL SUBSCRIPTIONS
                </Typography>
              }
              value={AdminTabs.ALL_SUBSCRIPTIONS}
            />
          </Tabs>
          {selectedTab === AdminTabs.ALL_CONTRACTS && (
            <LakehouseAdminContractsDashboard adminStore={adminStore} />
          )}
          {selectedTab === AdminTabs.ALL_SUBSCRIPTIONS && (
            <LakehouseAdminSubscriptionsDashboard adminStore={adminStore} />
          )}
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
