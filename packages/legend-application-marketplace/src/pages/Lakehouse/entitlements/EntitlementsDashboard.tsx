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

import { withAuth, type AuthContextProps } from 'react-oidc-context';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  type V1_ContractUserEventRecord,
  type V1_DataContract,
  type V1_UserPendingContractsRecord,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  generateLakehouseContractPath,
  generateLakehouseTaskPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  Box,
  Button,
  Container,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { clsx } from '@finos/legend-art';

const TDSColumnApprovalCellRenderer = (
  params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
  handleApprove: (task: V1_ContractUserEventRecord) => void,
  handleDeny: (task: V1_ContractUserEventRecord) => void,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const onApprove = () => {
    handleApprove(data);
  };
  const onDeny = () => {
    handleDeny(data);
  };
  return (
    <Stack direction={'row'} spacing={1} justifyContent={'center'}>
      <Button
        variant="contained"
        size="small"
        onClick={onApprove}
        disabled={data.status !== V1_UserApprovalStatus.PENDING}
        color="success"
      >
        Approve
      </Button>
      <Button
        disabled={data.status !== V1_UserApprovalStatus.PENDING}
        color="error"
        variant="contained"
        size="small"
        onClick={onDeny}
      >
        Deny
      </Button>
    </Stack>
  );
};

const Task_IdColumnClickableCellRenderer = (
  params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
  onHandleClick: (id: string) => void,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    onHandleClick(data.taskId);
  };
  return (
    <span
      className="marketplace-lakehouse-entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.taskId}
    </span>
  );
};

const Task_ContractClickableCellRenderer = (
  params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
  onHandleClick: (id: string) => void,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    onHandleClick(data.dataContractId);
  };
  return (
    <span
      className="marketplace-lakehouse-entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.dataContractId}
    </span>
  );
};

const Contract_IdColumnClickableCellRenderer = (
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
      className="marketplace-lakehouse-entitlements-tasks__grid-taskid-cell"
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
      className="marketplace-lakehouse-entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.pendingTaskWithAssignees.taskId}
    </span>
  );
};

type TaksProps = {
  currentViewer: EntitlementsDashboardState;
};

export const EntitlementsDashboard = withAuth(
  observer((props: TaksProps) => {
    const { currentViewer } = props;
    const state = currentViewer.state;
    const tasks = currentViewer.pendingTasks;
    const pendingConctracts = currentViewer.pendingContracts;
    const allContracts = currentViewer.allContracts;
    const auth = (props as unknown as { auth: AuthContextProps }).auth;
    const enum EntitlementsTabs {
      PENDING_TASKS = 'pendingTasks',
      PENDING_CONTRACTS = 'pendingContracts',
      ALL_CONTRACTS = 'allContracts',
    }

    const [value, setValue] = useState(EntitlementsTabs.PENDING_TASKS);

    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: EntitlementsTabs,
    ) => {
      setValue(newValue);
    };
    const handleApprove = (task: V1_ContractUserEventRecord) => {
      flowResult(currentViewer.approve(task, auth.user?.access_token)).catch(
        state.applicationStore.alertUnhandledError,
      );
    };
    const handleDeny = (task: V1_ContractUserEventRecord) => {
      flowResult(currentViewer.deny(task, auth.user?.access_token)).catch(
        state.applicationStore.alertUnhandledError,
      );
    };
    return (
      <Container
        className="marketplace-lakehouse-entitlements-dashboard"
        maxWidth="xxl"
      >
        <Tabs value={value} onChange={handleTabChange}>
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                PENDING TASKS
              </Typography>
            }
            value={EntitlementsTabs.PENDING_TASKS}
          />
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                PENDING CONTRACTS
              </Typography>
            }
            value={EntitlementsTabs.PENDING_CONTRACTS}
          />
          <Tab
            label={
              <Typography variant="h4" gutterBottom={true}>
                ALL CONTRACTS
              </Typography>
            }
            value={EntitlementsTabs.ALL_CONTRACTS}
          />
        </Tabs>
        {value === EntitlementsTabs.PENDING_TASKS && (
          <Box className="marketplace-lakehouse-entitlements-tasks">
            <div
              className={clsx(
                'marketplace-lakehouse-entitlements-tasks__grid data-access-overview__grid',
                {
                  'ag-theme-balham': true,
                },
              )}
            >
              {tasks && (
                <DataGrid
                  rowData={tasks}
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
                      headerName: 'Task Id',
                      cellRenderer: (
                        params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                      ) => {
                        return Task_IdColumnClickableCellRenderer(
                          params,
                          (taskId) =>
                            state.applicationStore.navigationService.navigator.updateCurrentLocation(
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
                      headerName: 'Contract Id',
                      cellRenderer: (
                        params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                      ) => {
                        return Task_ContractClickableCellRenderer(
                          params,
                          (taskId) =>
                            state.applicationStore.navigationService.navigator.updateCurrentLocation(
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
                      headerName: 'Consumer',
                      valueGetter: (p) => p.data?.consumer,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Status',
                      valueGetter: (p) => p.data?.status,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Approve/Deny',
                      flex: 1,
                      cellRenderer: (
                        params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                      ) => {
                        return TDSColumnApprovalCellRenderer(
                          params,
                          handleApprove,
                          handleDeny,
                        );
                      },
                    },
                  ]}
                />
              )}
            </div>
          </Box>
        )}
        {value === EntitlementsTabs.PENDING_CONTRACTS && (
          <Box className="marketplace-lakehouse-entitlements-tasks">
            <div
              className={clsx(
                'marketplace-lakehouse-entitlements-tasks__grid data-access-overview__grid',
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
                            state.applicationStore.navigationService.navigator.updateCurrentLocation(
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
                            state.applicationStore.navigationService.navigator.updateCurrentLocation(
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
        {value === EntitlementsTabs.ALL_CONTRACTS && (
          <Box className="marketplace-lakehouse-entitlements-tasks">
            <div
              className={clsx(
                'marketplace-lakehouse-entitlements-tasks__grid data-access-overview__grid',
                {
                  'ag-theme-balham': true,
                },
              )}
            >
              {allContracts && (
                <DataGrid
                  rowData={allContracts}
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
                        params: DataGridCellRendererParams<V1_DataContract>,
                      ) => {
                        return Contract_IdColumnClickableCellRenderer(
                          params.data?.guid,
                          (taskId) =>
                            state.applicationStore.navigationService.navigator.updateCurrentLocation(
                              generateLakehouseContractPath(taskId),
                            ),
                        );
                      },
                      flex: 2,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Contract Description',
                      valueGetter: (p) => p.data?.description,
                      flex: 2,
                    },
                    {
                      minWidth: 10,
                      sortable: true,
                      resizable: true,
                      headerName: 'Version',
                      valueGetter: (p) => p.data?.version,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'State',
                      valueGetter: (p) => p.data?.state,
                      flex: 2,
                    },
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      headerName: 'Members',
                      valueGetter: (p) => p.data?.members.map((m) => m.user),
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
        )}
      </Container>
    );
  }),
);
