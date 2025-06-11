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
import { type V1_UserPendingContractsRecord } from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  generateLakehouseContractPath,
  generateLakehouseTaskPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { clsx } from '@finos/legend-art';
import { EntitlementsPendingTasksDashbaord } from './EntitlementsPendingTasksDashboard.js';

export const Contract_IdColumnClickableCellRenderer = (
  contractId: string | undefined,
  onHandleClick: (id: string) => void,
): React.ReactNode => {
  if (!contractId) {
    return null;
  }
  const handleClick = () => {
    onHandleClick(contractId);
  };
  return (
    <span
      className="marketplace-lakehouse-entitlements__grid__taskid-cell"
      onClick={handleClick}
    >
      {contractId}
    </span>
  );
};

const PendingContract_TaskIdColumnClickableCellRenderer = (
  params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
  onHandleClick: (id: string) => void,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    onHandleClick(data.pendingTaskWithAssignees.taskId);
  };
  return (
    <span
      className="marketplace-lakehouse-entitlements__grid__taskid-cell"
      onClick={handleClick}
    >
      {data.pendingTaskWithAssignees.taskId}
    </span>
  );
};

const enum EntitlementsTabs {
  PENDING_TASKS = 'pendingTasks',
  PENDING_CONTRACTS = 'pendingContracts',
}

export const EntitlementsDashboard = withAuth(
  observer((props: { dashboardState: EntitlementsDashboardState }) => {
    const { dashboardState } = props;

    const lakehouseEntitlementsStore =
      dashboardState.lakehouseEntitlementsStore;
    const tasks = dashboardState.pendingTasks;
    const pendingConctracts = dashboardState.pendingContracts;

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
        </Tabs>
        {selectedTab === EntitlementsTabs.PENDING_TASKS &&
          tasks !== undefined && (
            <EntitlementsPendingTasksDashbaord
              dashboardState={dashboardState}
            />
          )}
        {selectedTab === EntitlementsTabs.PENDING_CONTRACTS && (
          <Box className="marketplace-lakehouse-entitlements__pending-contracts">
            <div
              className={clsx(
                'marketplace-lakehouse-entitlements__grid data-access-overview__grid',
                {
                  'ag-theme-balham': true,
                },
              )}
            >
              {pendingConctracts && (
                <DataGrid
                  rowData={pendingConctracts}
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
                      headerName: 'Contract Id',
                      cellRenderer: (
                        params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
                      ) => {
                        return Contract_IdColumnClickableCellRenderer(
                          params.data?.contractId,
                          (taskId) =>
                            lakehouseEntitlementsStore.applicationStore.navigationService.navigator.updateCurrentLocation(
                              generateLakehouseContractPath(taskId),
                            ),
                        );
                      },
                      flex: 1,
                    },

                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Contract Description',
                      valueGetter: (p) => p.data?.contractDescription,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Pending Task ID',
                      cellRenderer: (
                        params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
                      ) => {
                        return PendingContract_TaskIdColumnClickableCellRenderer(
                          params,
                          (taskId) =>
                            lakehouseEntitlementsStore.applicationStore.navigationService.navigator.updateCurrentLocation(
                              generateLakehouseTaskPath(taskId),
                            ),
                        );
                      },
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Pending Task Assignes',
                      valueGetter: (p) =>
                        p.data?.pendingTaskWithAssignees.assignee.join(','),
                      flex: 1,
                    },
                  ]}
                />
              )}
            </div>
          </Box>
        )}
      </Container>
    );
  }),
);
