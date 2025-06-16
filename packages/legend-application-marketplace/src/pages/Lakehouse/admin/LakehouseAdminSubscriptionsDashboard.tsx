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
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { DataGrid } from '@finos/legend-lego/data-grid';
import { Box } from '@mui/material';
import { V1_SnowflakeTarget } from '@finos/legend-graph';
import type { LakehouseAdminStore } from '../../../stores/lakehouse/admin/LakehouseAdminStore.js';

export const LakehouseAdminSubscriptionsDashboard = observer(
  (props: { adminStore: LakehouseAdminStore }) => {
    const { adminStore } = props;

    const subscriptions = adminStore.subscriptions;

    return (
      <>
        <CubesLoadingIndicator
          isLoading={Boolean(
            adminStore.subscriptionsInitializationState.isInProgress,
          )}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        <Box
          className={clsx('marketplace-lakehouse-admin__subscriptions__grid', {
            'ag-theme-balham': true,
          })}
        >
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
        </Box>
      </>
    );
  },
);
