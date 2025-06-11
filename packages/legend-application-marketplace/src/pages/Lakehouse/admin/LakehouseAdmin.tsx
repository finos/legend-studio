import { observer } from 'mobx-react-lite';
import {
  useLakehouseAdminStore,
  withLakehouseAdminStore,
} from './LakehouseAdminStoreProvider.js';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { useEffect, useState } from 'react';
import { Container, Tab, Tabs, Typography } from '@mui/material';
import { LakehouseAdminSubscriptionsDashboard } from './LakehouseAdminSubscriptionsDashboard.js';

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
        <CubesLoadingIndicator
          isLoading={Boolean(adminStore.initializationState.isInProgress)}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
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
          {selectedTab === AdminTabs.ALL_SUBSCRIPTIONS && (
            <LakehouseAdminSubscriptionsDashboard adminStore={adminStore} />
          )}
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
