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
import { useAuth, withAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { DataGrid } from '@finos/legend-lego/data-grid';
import { Box, Typography } from '@mui/material';
import { LakehouseMarketplaceHeader } from '../LakehouseHeader.js';
import {
  type V1_DataSubscription,
  V1_SnowflakeTarget,
} from '@finos/legend-graph';
import {
  useLakehouseSubscriptionsStore,
  withLakehouseSubscriptionsStore,
} from './LakehouseSubscriptionsStoreProvider.js';

export const LakehouseSubscriptionsMainView = withAuth(
  observer((props: { subscriptions: V1_DataSubscription[] }) => {
    const { subscriptions } = props;

    return (
      <Box className="subscriptions">
        <Typography variant="h4" gutterBottom={true}>
          ALL SUBSCRIPTIONS
        </Typography>
        <div
          className={clsx('subscriptions__grid', {
            'ag-theme-balham': true,
          })}
        >
          {subscriptions && (
            <DataGrid
              rowData={subscriptions}
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={[
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Subscription Id',
                  valueGetter: (p) => p.data?.guid,
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Contract ID',
                  valueGetter: (p) => p.data?.dataContractId,
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Target Type',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? 'Snowflake'
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Account ID',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeAccountId
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Region',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeRegion
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Network',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeNetwork
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Created By',
                  valueGetter: (p) => p.data?.createdBy,
                  flex: 1,
                },
              ]}
            />
          )}
        </div>
      </Box>
    );
  }),
);

export const LakehouseSubscriptions = withLakehouseSubscriptionsStore(
  observer(() => {
    const subscriptionsStore = useLakehouseSubscriptionsStore();
    const auth = useAuth();

    useEffect(() => {
      subscriptionsStore.init(auth.user?.access_token);
    }, [auth.user?.access_token, subscriptionsStore]);

    return (
      <div className="app__page">
        <div className="legend-marketplace-home">
          <div className="legend-marketplace-data-product-home__body">
            <LakehouseMarketplaceHeader />
            <div className="legend-marketplace-home__content">
              <div className="legend-marketplace-data-product__content">
                <CubesLoadingIndicator
                  isLoading={Boolean(
                    subscriptionsStore.initializationState.isInProgress,
                  )}
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
                <LakehouseSubscriptionsMainView
                  subscriptions={subscriptionsStore.subscriptions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
