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

import { useSearchParams } from '@finos/legend-application/browser';
import {
  type V1_ContractUserEventRecord,
  V1_AccessPointGroupReference,
  V1_ApprovalType,
  type V1_DataContract,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridCustomHeaderProps,
  type DataGridFirstDataRenderedEvent,
  type DataGridIRowNode,
  type DataGridRowSelectionOptions,
} from '@finos/legend-lego/data-grid';
import { LegendUser, type UserSearchService } from '@finos/legend-shared';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import type { NavigationService } from '@finos/legend-application';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
  UserDisplay,
} from '@finos/legend-art';
import { getUserById } from '../../../stores/lakehouse/LakehouseUtils.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { observer } from 'mobx-react-lite';

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

const EntitlementsDashboardActionModal = (props: {
  open: boolean;
  selectedTasks: V1_ContractUserEventRecord[];
  dashboardState: EntitlementsDashboardState;
  onClose: () => void;
  action: 'approve' | 'deny' | undefined;
  allContracts: V1_DataContract[];
  userDataMap: Map<string, LegendUser | string>;
  navigationService: NavigationService;
  userProfileImageUrl?: string | undefined;
  applicationDirectoryUrl?: string | undefined;
}) => {
  const {
    open,
    selectedTasks,
    dashboardState,
    onClose,
    action,
    allContracts,
    userDataMap,
    navigationService,
    userProfileImageUrl,
    applicationDirectoryUrl,
  } = props;

  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessages, setErrorMessages] = useState<
    [V1_ContractUserEventRecord, string][]
  >([]);
  const [successCount, setSuccessCount] = useState(0);

  const handleClose = () => {
    setIsLoading(false);
    setErrorMessages([]);
    setSuccessCount(0);
    onClose();
  };

  const actionFunction =
    action === 'approve'
      ? dashboardState.approve.bind(dashboardState)
      : dashboardState.deny.bind(dashboardState);

  const handleAction = async () => {
    setIsLoading(true);
    const currentErrorMessages: typeof errorMessages = [];
    await Promise.all(
      Array.from(selectedTasks).map(async (task) => {
        return flowResult(actionFunction(task, auth.user?.access_token))
          .then(() => setSuccessCount((prev) => prev++))
          .catch((error) => currentErrorMessages.push([task, error.message]));
      }),
    );
    setIsLoading(false);
    // If everything was successful, show a success message and close the modal.
    if (currentErrorMessages.length === 0) {
      dashboardState.lakehouseEntitlementsStore.applicationStore.notificationService.notifySuccess(
        `${selectedTasks.length} selected contract requests have been ${action === 'approve' ? 'approved' : 'denied'} successfully.`,
      );
      handleClose();
    } else {
      // If there were errors, we won't close the modal and will show the errors in the modal.
      setErrorMessages(currentErrorMessages);
    }
  };

  if (action === undefined) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth={true} maxWidth="md">
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
              const resource = allContracts.find(
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
              const userData = userDataMap.get(task.consumer);
              const userComponent =
                userData instanceof LegendUser ? (
                  <UserDisplay
                    user={userData}
                    imgSrc={userProfileImageUrl?.replace(
                      '{userId}',
                      userData.id,
                    )}
                    onClick={() =>
                      navigationService.navigator.visitAddress(
                        `${applicationDirectoryUrl}/${userData.id}`,
                      )
                    }
                  />
                ) : (
                  <>{task.consumer}</>
                );
              return (
                <Box
                  key={task.taskId}
                  className="marketplace-lakehouse-entitlements__data-contract-approval__error"
                >
                  <div className="marketplace-lakehouse-entitlements__data-contract-approval__error__content">
                    Encountered an error{' '}
                    {action === 'approve' ? 'approving' : 'denying'} request for{' '}
                    <div className="marketplace-lakehouse-entitlements__data-contract-approval__error__user">
                      {userComponent}
                    </div>{' '}
                    for Access Point Group{' '}
                    <span className="marketplace-lakehouse-text__emphasis">
                      {accessPointGroup}
                    </span>{' '}
                    on Data Product{' '}
                    <span className="marketplace-lakehouse-text__emphasis">
                      {dataProduct}
                    </span>
                    :
                  </div>
                  <div>
                    <code>{errorMessage}</code>
                  </div>
                </Box>
              );
            })}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            // eslint-disable-next-line no-void
            void handleAction();
          }}
          variant="contained"
          disabled={isLoading || errorMessages.length > 0}
          color={action === 'approve' ? 'success' : 'error'}
        >
          {action === 'approve' ? 'Approve' : 'Deny'} Selected Contracts
        </Button>
        <Button onClick={handleClose} variant="outlined" disabled={isLoading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EntitlementsPendingTasksDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const tasks = dashboardState.pendingTasks;
    const allContracts = dashboardState.allContracts;
    const privilegeManagerTasks =
      tasks?.filter(
        (task) =>
          task.type === V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      ) ?? [];
    const dataOwnerTasks =
      tasks?.filter(
        (task) => task.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
      ) ?? [];
    const otherTasks =
      tasks?.filter(
        (task) =>
          !privilegeManagerTasks.includes(task) &&
          !dataOwnerTasks.includes(task),
      ) ?? [];

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedAction, setSelectedAction] = useState<
      'approve' | 'deny' | undefined
    >();
    const [userDataMap, setUserDataMap] = useState(
      new Map<string, LegendUser | string>(),
    );
    const [selectedTaskIdsSet, setSelectedTaskIdsSet] = useState(
      new Set<string>(
        searchParams
          .get('selectedTasks')
          ?.split(',')
          .filter((taskId) =>
            tasks?.map((task) => task.taskId)?.includes(taskId),
          ) ?? [],
      ),
    );
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
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

    const handleFirstDataRendered = (
      event: DataGridFirstDataRenderedEvent<
        V1_ContractUserEventRecord,
        unknown
      >,
    ) => {
      const nodesToSelect: DataGridIRowNode<V1_ContractUserEventRecord>[] = [];
      event.api.forEachNode((node) => {
        if (node.data && selectedTaskIdsSet.has(node.data.taskId)) {
          nodesToSelect.push(node);
        }
      });
      event.api.setNodesSelected({ nodes: nodesToSelect, newValue: true });
    };

    const handleCellClicked = (
      event: DataGridCellClickedEvent<V1_ContractUserEventRecord, unknown>,
    ) => {
      if (
        event.colDef.colId !== 'selection' &&
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester'
      ) {
        const contract = allContracts?.find(
          (_contract) => _contract.guid === event.data?.dataContractId,
        );
        setSelectedContract(contract);
      }
    };

    const rowSelection = useMemo<
      DataGridRowSelectionOptions | 'single' | 'multiple'
    >(
      () => ({ mode: 'multiRow', checkboxes: false, headerCheckbox: false }),
      [],
    );

    const CustomSelectionRenderer = (
      params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
    ) => {
      const handleChange = (_: ChangeEvent<HTMLInputElement>) => {
        setSelectedTaskIdsSet((prev) => {
          if (params.data) {
            const newSet = new Set<string>(prev);
            if (prev.has(params.data.taskId)) {
              newSet.delete(params.data.taskId);
            } else {
              newSet.add(params.data.taskId);
            }
            return newSet;
          }
          return prev;
        });
      };

      return (
        <Checkbox
          size="large"
          checked={selectedTaskIdsSet.has(params.data?.taskId ?? '')}
          onChange={handleChange}
          sx={{ padding: 0 }}
        />
      );
    };

    const CustomSelectionHeaderRenderer = (_props: {
      params: DataGridCustomHeaderProps<V1_ContractUserEventRecord>;
      taskSet: V1_ContractUserEventRecord[];
    }) => {
      const { taskSet } = _props;
      const checked = taskSet.every((task) =>
        selectedTaskIdsSet.has(task.taskId),
      );
      const indeterminate =
        !checked && taskSet.some((task) => selectedTaskIdsSet.has(task.taskId));

      const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!checked || indeterminate) {
          setSelectedTaskIdsSet((prev) => {
            const newSet = new Set<string>(prev);
            taskSet.forEach((task) => newSet.add(task.taskId));
            return newSet;
          });
        } else {
          setSelectedTaskIdsSet((prev) => {
            const newSet = new Set<string>(prev);
            taskSet.forEach((task) => newSet.delete(task.taskId));
            return newSet;
          });
        }
      };

      return (
        <Checkbox
          size="large"
          checked={checked}
          indeterminate={indeterminate}
          onChange={handleChange}
          sx={{ padding: 0 }}
        />
      );
    };

    const colDefs: DataGridColumnDefinition<V1_ContractUserEventRecord>[] = [
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        headerName: 'Action Date',
        flex: 1,
        cellRenderer: (
          params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
        ) => {
          const taskType = params.data?.eventPayload.type;
          const timestamp = params.data?.eventPayload.eventTimestamp;
          return (
            <>
              {taskType}: {timestamp}
            </>
          );
        },
      },
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        colId: 'targetUser',
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
                dashboardState.lakehouseEntitlementsStore.applicationStore
                  .navigationService
              }
              userSearchService={marketplaceBaseStore.userSearchService}
              userProfileImageUrl={
                marketplaceBaseStore.applicationStore.config
                  .marketplaceUserProfileImageUrl
              }
              applicationDirectoryUrl={
                marketplaceBaseStore.applicationStore.config
                  .lakehouseEntitlementsConfig?.applicationDirectoryUrl
              }
            />
          );
        },
      },
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        colId: 'requester',
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
                dashboardState.lakehouseEntitlementsStore.applicationStore
                  .navigationService
              }
              userSearchService={marketplaceBaseStore.userSearchService}
              userProfileImageUrl={
                marketplaceBaseStore.applicationStore.config
                  .marketplaceUserProfileImageUrl
              }
              applicationDirectoryUrl={
                marketplaceBaseStore.applicationStore.config
                  .lakehouseEntitlementsConfig?.applicationDirectoryUrl
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
          return <>{params.data?.dataContractId ?? 'Unknown'}</>;
        },
      },
    ];

    return (
      <>
        <Box className="marketplace-lakehouse-entitlements__pending-tasks">
          <Box className="marketplace-lakehouse-entitlements__pending-tasks__action-btns">
            <Button
              variant="contained"
              color="success"
              disabled={!selectedTaskIdsSet.size}
              onClick={() => setSelectedAction('approve')}
            >
              Approve {selectedTaskIdsSet.size} tasks
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={!selectedTaskIdsSet.size}
              onClick={() => setSelectedAction('deny')}
            >
              Deny {selectedTaskIdsSet.size} tasks
            </Button>
          </Box>
          <Box className="marketplace-lakehouse-entitlements__pending-tasks__grids">
            {privilegeManagerTasks.length > 0 && (
              <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid-container">
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid__header">
                  Privilege Manager Approvals
                  <Tooltip
                    className="marketplace-lakehouse-entitlements__pending-tasks__tooltip__icon"
                    title="These are pending requests for which you are listed as a Privilege Manager."
                    slotProps={{
                      tooltip: {
                        className:
                          'marketplace-lakehouse-entitlements__pending-tasks__tooltip',
                      },
                    }}
                  >
                    <InfoCircleIcon />
                  </Tooltip>
                </Box>
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid ag-theme-balham">
                  <DataGrid
                    rowData={privilegeManagerTasks}
                    onRowDataUpdated={(params) => {
                      params.api.refreshCells({ force: true });
                    }}
                    suppressFieldDotNotation={true}
                    suppressContextMenu={false}
                    rowHeight={45}
                    rowSelection={rowSelection}
                    onFirstDataRendered={handleFirstDataRendered}
                    onCellClicked={handleCellClicked}
                    columnDefs={[
                      {
                        headerName: '',
                        colId: 'selection',
                        width: 50,
                        cellRenderer: CustomSelectionRenderer,
                        headerComponent: (
                          params: DataGridCustomHeaderProps<V1_ContractUserEventRecord>,
                        ) => (
                          <CustomSelectionHeaderRenderer
                            params={params}
                            taskSet={privilegeManagerTasks}
                          />
                        ),
                        pinned: 'left',
                      },
                      ...colDefs,
                    ]}
                  />
                </Box>
              </Box>
            )}
            {dataOwnerTasks.length > 0 && (
              <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid-container">
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid__header">
                  Data Owner Approvals
                  <Tooltip
                    className="marketplace-lakehouse-entitlements__pending-tasks__tooltip__icon"
                    title="These are pending requests for which you are listed as a Data Owner."
                    slotProps={{
                      tooltip: {
                        className:
                          'marketplace-lakehouse-entitlements__pending-tasks__tooltip',
                      },
                    }}
                  >
                    <InfoCircleIcon />
                  </Tooltip>
                </Box>
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid ag-theme-balham">
                  <DataGrid
                    rowData={dataOwnerTasks}
                    onRowDataUpdated={(params) => {
                      params.api.refreshCells({ force: true });
                    }}
                    suppressFieldDotNotation={true}
                    suppressContextMenu={false}
                    rowHeight={45}
                    rowSelection={rowSelection}
                    onFirstDataRendered={handleFirstDataRendered}
                    onCellClicked={handleCellClicked}
                    columnDefs={[
                      {
                        headerName: '',
                        colId: 'selection',
                        width: 50,
                        cellRenderer: CustomSelectionRenderer,
                        headerComponent: (
                          params: DataGridCustomHeaderProps<V1_ContractUserEventRecord>,
                        ) => (
                          <CustomSelectionHeaderRenderer
                            params={params}
                            taskSet={dataOwnerTasks}
                          />
                        ),
                        pinned: 'left',
                      },
                      ...colDefs,
                    ]}
                  />
                </Box>
              </Box>
            )}
            {otherTasks.length > 0 && (
              <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid-container">
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid__header">
                  Other Approvals
                </Box>
                <Box className="marketplace-lakehouse-entitlements__pending-tasks__grid ag-theme-balham">
                  <DataGrid
                    rowData={otherTasks}
                    onRowDataUpdated={(params) => {
                      params.api.refreshCells({ force: true });
                    }}
                    suppressFieldDotNotation={true}
                    suppressContextMenu={false}
                    rowHeight={45}
                    rowSelection={rowSelection}
                    onFirstDataRendered={handleFirstDataRendered}
                    onCellClicked={handleCellClicked}
                    columnDefs={[
                      {
                        headerName: '',
                        colId: 'selection',
                        width: 50,
                        cellRenderer: CustomSelectionRenderer,
                        headerComponent: (
                          params: DataGridCustomHeaderProps<V1_ContractUserEventRecord>,
                        ) => (
                          <CustomSelectionHeaderRenderer
                            params={params}
                            taskSet={otherTasks}
                          />
                        ),
                        pinned: 'left',
                      },
                      ...colDefs,
                    ]}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <EntitlementsDashboardActionModal
          open={selectedAction !== undefined}
          selectedTasks={
            tasks?.filter((task) => selectedTaskIdsSet.has(task.taskId)) ?? []
          }
          dashboardState={dashboardState}
          onClose={() => setSelectedAction(undefined)}
          action={selectedAction}
          allContracts={allContracts ?? []}
          userDataMap={userDataMap}
          navigationService={
            dashboardState.lakehouseEntitlementsStore.applicationStore
              .navigationService
          }
          userProfileImageUrl={
            marketplaceBaseStore.applicationStore.config
              .marketplaceUserProfileImageUrl
          }
          applicationDirectoryUrl={
            marketplaceBaseStore.applicationStore.config
              .lakehouseEntitlementsConfig?.applicationDirectoryUrl
          }
        />
        {selectedContract !== undefined && (
          <EntitlementsDataContractViewer
            open={true}
            currentViewer={
              new EntitlementsDataContractViewerState(
                selectedContract,
                marketplaceBaseStore.lakehouseContractServerClient,
              )
            }
            onClose={() => setSelectedContract(undefined)}
          />
        )}
      </>
    );
  },
);
