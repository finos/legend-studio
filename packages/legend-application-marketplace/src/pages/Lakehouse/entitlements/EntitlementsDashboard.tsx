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

import { useAuth, withAuth } from 'react-oidc-context';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type V1_ContractUserEventRecord,
  type V1_DataContract,
  type V1_UserPendingContractsRecord,
  V1_AccessPointGroupReference,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridFirstDataRenderedEvent,
  type DataGridIRowNode,
  type DataGridRowSelectedEvent,
  type DataGridRowSelectionOptions,
} from '@finos/legend-lego/data-grid';
import {
  generateLakehouseContractPath,
  generateLakehouseTaskPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  UserDisplay,
} from '@finos/legend-art';
import { LegendUser, type UserSearchService } from '@finos/legend-shared';
import type { NavigationService } from '@finos/legend-application';
import { getUserById } from '../../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { useSearchParams } from 'react-router';

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

const UserCellRenderer = (props: {
  userId: string | undefined;
  userDataMap: Map<string, LegendUser | string>;
  setUserDataMap: React.Dispatch<
    React.SetStateAction<Map<string, string | LegendUser>>
  >;
  navigationService: NavigationService;
  userSearchService?: UserSearchService | undefined;
  userProfileImageUrl?: string | undefined;
  applicationDirectoryUrl?: string | undefined;
}): React.ReactNode => {
  const {
    userId,
    userDataMap,
    setUserDataMap,
    navigationService,
    userSearchService,
    userProfileImageUrl,
    applicationDirectoryUrl,
  } = props;
  const [isLoading, setIsLoading] = useState(false);

  const userData = userId ? userDataMap.get(userId) : undefined;

  useEffect(() => {
    const fetchUserData = async (_userId: string) => {
      setIsLoading(true);
      try {
        const fetchedUserData: LegendUser | string = userSearchService
          ? ((await getUserById(_userId, userSearchService)) ?? _userId)
          : _userId;
        setUserDataMap((prev: Map<string, LegendUser | string>) => {
          const newMap = new Map<string, LegendUser | string>(prev);
          newMap.set(_userId, fetchedUserData);
          return newMap;
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (userId && userData === undefined) {
      // eslint-disable-next-line no-void
      void fetchUserData(userId);
    }
  }, [setUserDataMap, userData, userId, userSearchService]);

  if (isLoading) {
    return <CircularProgress size={20} />;
  } else if (userData instanceof LegendUser) {
    const imgSrc = userProfileImageUrl?.replace('{userId}', userData.id);
    const openUserDirectoryLink = (): void =>
      navigationService.navigator.visitAddress(
        `${applicationDirectoryUrl}/${userId}`,
      );

    return (
      <UserDisplay
        user={userData}
        imgSrc={imgSrc}
        onClick={() => openUserDirectoryLink()}
        className="marketplace-lakehouse-entitlements__grid__user-display"
      />
    );
  } else if (userData) {
    return <>{userData}</>;
  } else {
    return <>{userId}</>;
  }
};

const enum EntitlementsTabs {
  PENDING_TASKS = 'pendingTasks',
  PENDING_CONTRACTS = 'pendingContracts',
  ALL_CONTRACTS = 'allContracts',
}

const EntitlementsDashboardActionModal = (props: {
  open: boolean;
  selectedTasks: V1_ContractUserEventRecord[];
  dashboardState: EntitlementsDashboardState;
  onClose: () => void;
  action: 'approve' | 'deny' | undefined;
  allContracts: V1_DataContract[];
}) => {
  const { open, selectedTasks, dashboardState, onClose, action, allContracts } =
    props;

  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessages, setErrorMessages] = useState<
    [V1_ContractUserEventRecord, string][]
  >([]);
  const [successCount, setSuccessCount] = useState(0);

  const handleApprove = async () => {
    setIsLoading(true);
    await Promise.all(
      Array.from(selectedTasks).map(async (task) => {
        return flowResult(dashboardState.approve(task, auth.user?.access_token))
          .then(() => setSuccessCount((prev) => prev++))
          .catch((error) =>
            setErrorMessages((prev) => [...prev, [task, error.message]]),
          );
      }),
    );
    setIsLoading(false);
    if (errorMessages.length === 0) {
      dashboardState.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `${selectedTasks.length} selected contract requests have been approved successfully.`,
      );
      setErrorMessages([]);
      setSuccessCount(0);
      onClose();
    }
  };

  const handleDeny = async () => {
    setIsLoading(true);
    await Promise.all(
      Array.from(selectedTasks).map(async (task) => {
        return flowResult(dashboardState.deny(task, auth.user?.access_token))
          .then(() => setSuccessCount((prev) => prev++))
          .catch((error) =>
            setErrorMessages((prev) => [...prev, [task, error.message]]),
          );
      }),
    );
    setIsLoading(false);
    if (errorMessages.length === 0) {
      dashboardState.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `${selectedTasks.length} selected contract requests have been denied successfully.`,
      );
      setErrorMessages([]);
      setSuccessCount(0);
      onClose();
    }
  };

  if (action === undefined) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
      <DialogTitle>
        {action === 'approve' ? 'Approve' : 'Deny'} Contract Requests
      </DialogTitle>
      <DialogContent className="marketplace-lakehouse-entitlements__data-contract-approval__content">
        <CubesLoadingIndicator isLoading={isLoading}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {!isLoading && errorMessages.length === 0 && (
          <div>
            {action === 'approve' ? 'Approve' : 'Deny'} {selectedTasks.length}{' '}
            selected contract requests
          </div>
        )}
        {!isLoading && errorMessages.length > 0 && (
          <>
            {successCount > 0 && (
              <Box className="marketplace-lakehouse-entitlements__data-contract-approval__success">
                {successCount} selected contract requests were{' '}
                {action === 'approve' ? 'approved' : 'denied'} successfully
              </Box>
            )}
            {errorMessages.map(([task, errorMessage]) => {
              const contractId = task.dataContractId;
              const resource = allContracts?.find(
                (contract) => contract.guid === contractId,
              )?.resource;
              const dataProduct =
                resource instanceof V1_AccessPointGroupReference
                  ? resource.dataProduct.name
                  : 'unknown';
              const accessPointGroup =
                resource instanceof V1_AccessPointGroupReference
                  ? resource.accessPointGroup
                  : 'unknown';
              return (
                <Box key={task.taskId}>
                  <div>
                    Encountered an error{' '}
                    {action === 'approve' ? 'approving' : 'denying'}{' '}
                    {task.consumer} request for Access Point Group{' '}
                    {accessPointGroup} on Data Product {dataProduct}:
                  </div>
                  <div>{errorMessage}</div>
                </Box>
              );
            })}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={
            action === 'approve' ? () => handleApprove() : () => handleDeny()
          }
          variant="contained"
          disabled={isLoading || errorMessages.length > 0}
          color={action === 'approve' ? 'success' : 'error'}
        >
          {action === 'approve' ? 'Approve' : 'Deny'} Selected Contracts
        </Button>
        <Button onClick={onClose} variant="outlined" disabled={isLoading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EntitlementsDashboard = withAuth(
  observer((props: { dashboardState: EntitlementsDashboardState }) => {
    const { dashboardState } = props;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const lakehouseEntitlementsStore =
      dashboardState.lakehouseEntitlementsStore;
    const tasks = dashboardState.pendingTasks;
    const pendingConctracts = dashboardState.pendingContracts;
    const allContracts = dashboardState.allContracts;

    const [userDataMap, setUserDataMap] = useState(
      new Map<string, LegendUser | string>(),
    );
    const [selectedTaskIdsSet, setSelectedTaskIdsSet] = useState(
      new Set<string>(searchParams.get('selectedTasks')?.split(',') ?? []),
    );
    const [selectedTab, setSelectedTab] = useState(
      EntitlementsTabs.PENDING_TASKS,
    );
    const [selectedAction, setSelectedAction] = useState<
      'approve' | 'deny' | undefined
    >();

    useEffect(() => {
      setSearchParams((params) => {
        if (selectedTaskIdsSet.size === 0) {
          params.delete('selectedTasks');
        } else {
          params.set(
            'selectedTasks',
            Array.from(selectedTaskIdsSet.values()).join(','),
          );
        }
        return params;
      });
    }, [selectedTaskIdsSet, setSearchParams]);

    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: EntitlementsTabs,
    ) => {
      setSelectedTab(newValue);
    };

    const handleRowSelected = (
      event: DataGridRowSelectedEvent<V1_ContractUserEventRecord>,
    ) => {
      const selectedTask = event.data;
      if (selectedTask) {
        setSelectedTaskIdsSet((prev) => {
          const newSet = new Set<string>(prev);
          if (event.node.isSelected()) {
            newSet.add(selectedTask.taskId);
          } else {
            newSet.delete(selectedTask.taskId);
          }
          return newSet;
        });
      }
    };

    const handleFirstDataRendered = (
      event: DataGridFirstDataRenderedEvent<
        V1_ContractUserEventRecord,
        unknown
      >,
    ) => {
      const nodesToSelect: DataGridIRowNode<V1_ContractUserEventRecord>[] = [];
      event.api.forEachNode((node) => {
        if (node.data && selectedTaskIdsSet.has(node.data?.taskId)) {
          nodesToSelect.push(node);
        }
      });
      event.api.setNodesSelected({ nodes: nodesToSelect, newValue: true });
    };

    const rowSelection = useMemo<
      DataGridRowSelectionOptions | 'single' | 'multiple'
    >(() => ({ mode: 'multiRow' }), []);

    return (
      <Container
        className="marketplace-lakehouse-entitlements-dashboard"
        maxWidth="xxl"
      >
        <Tabs value={selectedTab} onChange={handleTabChange}>
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
        {selectedTab === EntitlementsTabs.PENDING_TASKS && (
          <>
            <Box className="marketplace-lakehouse-entitlements__pending-tasks">
              <div
                className={clsx(
                  'marketplace-lakehouse-entitlements__grid data-access-overview__grid',
                  {
                    'ag-theme-balham': true,
                  },
                )}
              >
                {tasks && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={!selectedTaskIdsSet.size}
                    >
                      Approve {selectedTaskIdsSet.size} tasks
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      disabled={!selectedTaskIdsSet.size}
                    >
                      Reject {selectedTaskIdsSet.size} tasks
                    </Button>
                    <DataGrid
                      rowData={tasks}
                      onRowDataUpdated={(params) => {
                        params.api.refreshCells({ force: true });
                      }}
                      suppressFieldDotNotation={true}
                      suppressContextMenu={false}
                      rowHeight={45}
                      rowSelection={rowSelection}
                      onRowSelected={handleRowSelected}
                      onFirstDataRendered={handleFirstDataRendered}
                      columnDefs={[
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          headerName: 'Target User',
                          flex: 1,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            return (
                              <UserCellRenderer
                                userId={params.data?.consumer}
                                userDataMap={userDataMap}
                                setUserDataMap={setUserDataMap}
                                navigationService={
                                  lakehouseEntitlementsStore.applicationStore
                                    .navigationService
                                }
                                userSearchService={
                                  marketplaceBaseStore.userSearchService
                                }
                                userProfileImageUrl={
                                  marketplaceBaseStore.applicationStore.config
                                    .marketplaceUserProfileImageUrl
                                }
                                applicationDirectoryUrl={
                                  marketplaceBaseStore.applicationStore.config
                                    .lakehouseEntitlementsConfig
                                    ?.applicationDirectoryUrl
                                }
                              />
                            );
                          },
                        },
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          headerName: 'Requester',
                          flex: 1,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            const contractId = params.data?.dataContractId;
                            const requester = allContracts?.find(
                              (contract) => contract.guid === contractId,
                            )?.createdBy;
                            return requester ? (
                              <UserCellRenderer
                                userId={requester}
                                userDataMap={userDataMap}
                                setUserDataMap={setUserDataMap}
                                navigationService={
                                  lakehouseEntitlementsStore.applicationStore
                                    .navigationService
                                }
                                userSearchService={
                                  marketplaceBaseStore.userSearchService
                                }
                                userProfileImageUrl={
                                  marketplaceBaseStore.applicationStore.config
                                    .marketplaceUserProfileImageUrl
                                }
                                applicationDirectoryUrl={
                                  marketplaceBaseStore.applicationStore.config
                                    .lakehouseEntitlementsConfig
                                    ?.applicationDirectoryUrl
                                }
                              />
                            ) : (
                              <>Unknown</>
                            );
                          },
                        },
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          headerName: 'Target Data Product',
                          flex: 1,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            const contractId = params.data?.dataContractId;
                            const resource = allContracts?.find(
                              (contract) => contract.guid === contractId,
                            )?.resource;
                            const dataProduct =
                              resource instanceof V1_AccessPointGroupReference
                                ? resource.dataProduct
                                : undefined;
                            return <>{dataProduct?.name ?? 'Unknown'}</>;
                          },
                        },
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          headerName: 'Target Access Point Group',
                          flex: 1,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            const contractId = params.data?.dataContractId;
                            const resource = allContracts?.find(
                              (contract) => contract.guid === contractId,
                            )?.resource;
                            const accessPointGroup =
                              resource instanceof V1_AccessPointGroupReference
                                ? resource.accessPointGroup
                                : undefined;
                            return <>{accessPointGroup ?? 'Unknown'}</>;
                          },
                        },
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          headerName: 'Business Justification',
                          flex: 2,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            const contractId = params.data?.dataContractId;
                            const businessJustification = allContracts?.find(
                              (contract) => contract.guid === contractId,
                            )?.description;
                            return <>{businessJustification ?? 'Unknown'}</>;
                          },
                        },
                        {
                          minWidth: 50,
                          sortable: true,
                          resizable: true,
                          hide: true,
                          headerName: 'Contract ID',
                          flex: 2,
                          cellRenderer: (
                            params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
                          ) => {
                            return (
                              <>{params.data?.dataContractId ?? 'Unknown'}</>
                            );
                          },
                        },
                      ]}
                    />
                  </>
                )}
              </div>
            </Box>
            <EntitlementsDashboardActionModal
              open={selectedAction !== undefined}
              selectedTasks={
                tasks?.filter((task) => selectedTaskIdsSet.has(task.taskId)) ??
                []
              }
              dashboardState={dashboardState}
              onClose={() => setSelectedAction(undefined)}
              action={selectedAction}
              allContracts={allContracts ?? []}
            />
          </>
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
        {selectedTab === EntitlementsTabs.ALL_CONTRACTS && (
          <Box className="marketplace-lakehouse-entitlements__all-contracts">
            <div
              className={clsx(
                'marketplace-lakehouse-entitlements__grid data-access-overview__grid',
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
                            lakehouseEntitlementsStore.applicationStore.navigationService.navigator.updateCurrentLocation(
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
