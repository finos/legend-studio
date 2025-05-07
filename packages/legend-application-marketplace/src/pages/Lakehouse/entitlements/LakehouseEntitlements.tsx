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
  useLakehouseEntitlementsStore,
  withLakehouseEntitlementsStore,
} from './LakehouseEntitlementsStoreProvider.js';
import { useAuth, withAuth, type AuthContextProps } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { useParams } from '@finos/legend-application/browser';
import {
  generateLakehouseContractPath,
  generateLakehouseTaskPath,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LakehouseEntitlementsTasksParam,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  Box,
  Button,
  Divider,
  Grid2,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import type {
  V1_ContractUserEventRecord,
  V1_UserPendingContractsRecord,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { DataContractState } from '../../../stores/lakehouse/entitlements/DataContractState.js';
import { LakehouseEntitlementsMainViewState } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsMainViewState.js';
import { DataContractTaskState } from '../../../stores/lakehouse/entitlements/DataContractTaskState.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';

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
        color="success"
      >
        Approve
      </Button>
      <Button color="error" variant="contained" size="small" onClick={onDeny}>
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
      className="entitlements-tasks__grid-taskid-cell"
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
      className="entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.dataContractId}
    </span>
  );
};

const PendingContract_IdColumnClickableCellRenderer = (
  params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
  onHandleClick: (id: string) => void,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    onHandleClick(data.contractId);
  };
  return (
    <span
      className="entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.contractId}
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
      className="entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.pendingTaskWithAssignees.taskId}
    </span>
  );
};

type TaksProps = {
  currentViewer: LakehouseEntitlementsMainViewState;
};

export const LakehouseEntitlementsMainView = withAuth(
  observer((props: TaksProps) => {
    const { currentViewer } = props;
    const state = currentViewer.state;
    const tasks = currentViewer.pendingTasks;
    const pendingConctracts = currentViewer.pendingContracts;
    const auth = (props as unknown as { auth: AuthContextProps }).auth;
    const enum EntitlementsTabs {
      PENDING_TASKS = 'pendingTasks',
      PENDING_CONTRACTS = 'pendingContracts',
    }

    const [value, setValue] = useState(EntitlementsTabs.PENDING_TASKS);

    const handleTabChange = (
      event: React.SyntheticEvent,
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
      <>
        {/* <Box> */}
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
        </Tabs>
        {value === EntitlementsTabs.PENDING_TASKS && (
          <Box className="entitlements-tasks">
            <div
              className={clsx(
                'entitlements-tasks__grid data-access-overview__grid',
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
          <Box className="entitlements-tasks">
            <div
              className={clsx(
                'entitlements-tasks__grid data-access-overview__grid',
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
                        return PendingContract_IdColumnClickableCellRenderer(
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
      </>
    );
  }),
);
const LakehouseEntitlementsContract = observer(
  (props: { currentViewer: DataContractState }) => {
    const { currentViewer } = props;
    return (
      <div className="entitlements-tasks">
        <Grid2
          container={true}
          spacing={0}
          sx={{
            '--Grid-borderWidth': '1px',
            borderTop: 'var(--Grid-borderWidth) solid',
            borderLeft: 'var(--Grid-borderWidth) solid',
            borderColor: 'divider',
            '& > div': {
              borderRight: 'var(--Grid-borderWidth) solid',
              borderBottom: 'var(--Grid-borderWidth) solid',
              borderColor: 'divider',
            },
          }}
        >
          {currentViewer.taskDetails.map((v, index) => (
            <>
              <Grid2
                container={false}
                size={4}
                sx={{
                  alignContent: 'center',
                  backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                }}
              >
                <Typography
                  variant="button"
                  fontWeight={'bold'}
                  sx={{ fontSize: '14px', padding: '6px' }}
                >
                  {v.name}
                </Typography>
              </Grid2>
              <Grid2
                container={false}
                size={8}
                sx={{
                  alignContent: 'center',
                  backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontSize: '14px', padding: '6px' }}
                >
                  {v.value}
                </Typography>
              </Grid2>
            </>
          ))}
        </Grid2>
      </div>
    );
  },
);

export const LakehouseEntitlementsTask = withAuth(
  observer((props: { currentViewer: DataContractTaskState }) => {
    const auth = (props as unknown as { auth: AuthContextProps }).auth;
    const { currentViewer } = props;
    const handleApprove = (): void => {
      currentViewer.approve(auth.user?.access_token);
    };

    const handleDeny = (): void => {
      currentViewer.deny(auth.user?.access_token);
    };

    return (
      <div className="entitlements-task">
        {currentViewer.canApprove && (
          <>
            <Stack
              className="entitlements-task__action"
              direction={'row'}
              spacing={1}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleApprove}
                color="success"
                sx={{ fontSize: '10px' }}
              >
                Approve
              </Button>
              <Button
                color="error"
                variant="contained"
                size="small"
                onClick={handleDeny}
                sx={{ fontSize: '10px' }}
              >
                Deny
              </Button>
            </Stack>
            <Divider />
          </>
        )}
        <Grid2
          container={true}
          spacing={0}
          sx={{
            '--Grid-borderWidth': '1px',
            borderTop: 'var(--Grid-borderWidth) solid',
            borderLeft: 'var(--Grid-borderWidth) solid',
            borderColor: 'divider',
            '& > div': {
              borderRight: 'var(--Grid-borderWidth) solid',
              borderBottom: 'var(--Grid-borderWidth) solid',
              borderColor: 'divider',
            },
          }}
        >
          {currentViewer.taskDetails.map((v, index) => (
            <>
              <Grid2
                container={false}
                size={4}
                sx={{
                  alignContent: 'center',
                  backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                }}
              >
                <Typography
                  variant="button"
                  fontWeight={'bold'}
                  sx={{ fontSize: '14px', padding: '6px' }}
                >
                  {v.name}
                </Typography>
              </Grid2>
              <Grid2
                container={false}
                size={8}
                sx={{
                  alignContent: 'center',
                  backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontSize: '14px', padding: '6px' }}
                >
                  {v.value}
                </Typography>
              </Grid2>
            </>
          ))}
        </Grid2>
      </div>
    );
  }),
);

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();
    const params = useParams<LakehouseEntitlementsTasksParam>();

    useEffect(() => {
      entitlementsStore.init(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID],
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID],
        auth.user?.access_token,
      );
    }, [auth.user?.access_token, entitlementsStore, params]);

    const renderCurrentViewer = (): React.ReactNode => {
      const currentViewer = entitlementsStore.currentViewer;
      if (currentViewer instanceof LakehouseEntitlementsMainViewState) {
        return <LakehouseEntitlementsMainView currentViewer={currentViewer} />;
      } else if (currentViewer instanceof DataContractTaskState) {
        return <LakehouseEntitlementsTask currentViewer={currentViewer} />;
      } else if (currentViewer instanceof DataContractState) {
        return <LakehouseEntitlementsContract currentViewer={currentViewer} />;
      }

      return null;
    };
    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-entitlements">
        <CubesLoadingIndicator
          isLoading={Boolean(
            entitlementsStore.initializationState.isInProgress ||
              entitlementsStore.currentViewer?.initializationState.isInProgress,
          )}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {renderCurrentViewer()}
      </LegendMarketplacePage>
    );
  }),
);
