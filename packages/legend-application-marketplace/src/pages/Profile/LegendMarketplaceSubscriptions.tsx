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
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';
import { useCallback, useEffect, useState } from 'react';
import { Subscription } from '@finos/legend-server-marketplace';
import { DataGrid } from '@finos/legend-lego/data-grid';

export const LegendMarketplaceSubscriptions = observer(() => {
  const store = useLegendMarketplaceBaseStore();
  const [subscriptionData, setSubscriptionData] = useState<Subscription[]>([]);
  const initialUser = store.applicationStore.identityService.currentUser;

  const sortData = (data: Subscription[]): Subscription[] => {
    if (data.length > 0) {
      const sortedData = [...data].sort((a, b) => {
        if (a.carrierVendor === b.carrierVendor) {
          return a.model > b.model ? 1 : -1;
        }
        return a.carrierVendor > b.carrierVendor ? 1 : -1;
      });
      return sortedData;
    } else {
      return [];
    }
  };

  const fetchSubscriptions = useCallback(
    async (user: string): Promise<Subscription[]> => {
      try {
        const subscriptions =
          await store.marketplaceServerClient.getSubscriptions(user);
        const serializedSubs = subscriptions.map((json) =>
          Subscription.serialization.fromJson(json),
        );
        return sortData(serializedSubs);
      } catch (error) {
        store.applicationStore.notificationService.notifyError(
          `Failed to fetch subscriptions: ${error}`,
        );
        return [];
      }
    },
    [store],
  );

  const onUserSearch = (
    provider: string | undefined,
    user: string | undefined,
  ): void => {
    if (!user) {
      return;
    }
    fetchSubscriptions(user)
      .then((subscriptions) => setSubscriptionData(subscriptions))
      .catch((error) => {
        store.applicationStore.alertUnhandledError(error);
      });
  };

  useEffect(() => {
    fetchSubscriptions(initialUser)
      .then((subscriptions) => setSubscriptionData(subscriptions))
      .catch((error) => {
        store.applicationStore.alertUnhandledError(error);
      });
  }, [initialUser, fetchSubscriptions, store.applicationStore]);

  return (
    <LegendMarketplacePage className="legend-marketplace-home">
      <div className="legend-marketplace-subscriptions-header">
        <Breadcrumbs
          separator="›"
          aria-label="breadcrumb"
          color="white"
          sx={{ fontSize: '16px' }}
        >
          <Link href="/" underline="hover" color="white">
            Account
          </Link>
          <Link href="/subscriptions" underline="hover" color="white">
            Subscriptions
          </Link>
        </Breadcrumbs>
      </div>

      <div className="legend-marketplace-subscriptions-content">
        <div className="legend-marketplace-subscriptions-content__search-section">
          <Typography variant="h2" fontWeight="bold">
            Subscriptions
          </Typography>
          <LegendMarketplaceSearchBar
            placeholder="Search user"
            onSearch={onUserSearch}
          />
          <LegendMarketplaceSearchBar
            placeholder="Search all subscriptions"
            onSearch={() => {}}
          />
        </div>

        <div
          className="legend-marketplace-subscriptions-content__subscription-grid ag-theme-balham"
          style={{ height: '1000px', width: '100%', fontSize: '14px' }}
        >
          <DataGrid
            rowData={subscriptionData}
            columnDefs={[
              {
                minWidth: 50,
                headerName: 'Carrier Vendor',
                field: 'carrierVendor',
                spanRows: true,
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Product',
                field: 'model',
                spanRows: true,
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Source Vendor',
                field: 'sourceVendor',
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Item Type',
                field: 'itemName',
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Service',
                field: 'serviceName',
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Cost (USD)',
                field: 'monthlyAmount',
                suppressHeaderMenuButton: true,
                flex: 1,
              },
              {
                minWidth: 50,
                headerName: 'Cost Code',
                field: 'costCode',
                suppressHeaderMenuButton: true,
                flex: 1,
              },
            ]}
            enableCellSpan={true}
            defaultColDef={{
              headerStyle: {
                fontSize: '18px',
                backgroundColor: '#dce3e8',
              },
            }}
          />
        </div>
      </div>
    </LegendMarketplacePage>
  );
});
