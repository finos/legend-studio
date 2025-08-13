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
  type V1_LiteDataContract,
  V1_ApprovalType,
  V1_ResourceType,
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
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from '../../../components/DataContractViewer/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { startCase } from '@finos/legend-shared';

const EntitlementsDashboardActionModal = (props: {
  open: boolean;
  selectedTasks: V1_ContractUserEventRecord[];
  dashboardState: EntitlementsDashboardState;
  onClose: () => void;
  action: 'approve' | 'deny' | undefined;
  allContracts: V1_LiteDataContract[];
  marketplaceStore: LegendMarketplaceBaseStore;
}) => {
  const {
    open,
    selectedTasks,
    dashboardState,
    onClose,
    action,
    allContracts,
    marketplaceStore,
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

    // Refresh pending tasks and contracts after taking action
    await flowResult(dashboardState.init(auth.user?.access_token));
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
              const contract = allContracts.find(
                (_contract) => _contract.guid === contractId,
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
                      <UserRenderer
                        userId={task.consumer}
                        marketplaceStore={marketplaceStore}
                      />
                    </div>{' '}
                    for {startCase(contract?.resourceType.toLowerCase())}{' '}
                    <span className="marketplace-lakehouse-text__emphasis">
                      {contract?.accessPointGroup}
                    </span>{' '}
                    on Data Product{' '}
                    <span className="marketplace-lakehouse-text__emphasis">
                      {contract?.resourceId}
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
    // State and props

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
    const loading = dashboardState.initializationState.isInProgress;

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedAction, setSelectedAction] = useState<
      'approve' | 'deny' | undefined
    >();
    const [selectedTaskIdsSet, setSelectedTaskIdsSet] = useState(
      new Set<string>(searchParams.get('selectedTasks')?.split(',') ?? []),
    );
    const [selectedContract, setSelectedContract] = useState<
      V1_LiteDataContract | undefined
    >();
    const [selectedContractTargetUser, setSelectedContractTargetUser] =
      useState<string | undefined>();

    // Effects

    useEffect(() => {
      if (dashboardState.initializationState.hasCompleted) {
        setSelectedTaskIdsSet((prev) => {
          const selectedArray = Array.from(prev.values());
          return new Set<string>(
            selectedArray.filter((taskId) =>
              tasks?.map((task) => task.taskId).includes(taskId),
            ),
          );
        });
      }
    }, [dashboardState.initializationState.hasCompleted, tasks]);

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

    // Callbacks

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
        setSelectedContractTargetUser(event.data?.consumer);
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
      const checked =
        taskSet.length > 0 &&
        taskSet.every((task) => selectedTaskIdsSet.has(task.taskId));
      const indeterminate =
        taskSet.length > 0 &&
        !checked &&
        taskSet.some((task) => selectedTaskIdsSet.has(task.taskId));

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
          disabled={taskSet.length === 0}
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
        valueGetter: (params) => {
          const taskType = params.data?.eventPayload.type;
          const timestamp = params.data?.eventPayload.eventTimestamp;
          return `${taskType}: ${timestamp}`;
        },
      },
      {
        minWidth: 25,
        sortable: true,
        resizable: true,
        colId: 'consumerType',
        headerName: 'Consumer Type',
        flex: 1,
        cellRenderer: (
          params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
        ) => {
          const contractId = params.data?.dataContractId;
          const consumer = allContracts?.find(
            (contract) => contract.guid === contractId,
          )?.consumer;
          const typeName = consumer
            ? getOrganizationalScopeTypeName(
                consumer,
                dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
              )
            : undefined;
          const typeDetails = consumer
            ? getOrganizationalScopeTypeDetails(
                consumer,
                dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
              )
            : undefined;
          return (
            <>
              {typeName ?? 'Unknown'}
              {typeDetails !== undefined && (
                <Tooltip
                  className="marketplace-lakehouse-entitlements__grid__consumer-type__tooltip__icon"
                  title={typeDetails}
                >
                  <InfoCircleIcon />
                </Tooltip>
              )}
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
            <UserRenderer
              userId={params.data?.consumer}
              marketplaceStore={marketplaceBaseStore}
              className="marketplace-lakehouse-entitlements__grid__user-display"
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
            <UserRenderer
              userId={requester}
              marketplaceStore={marketplaceBaseStore}
              className="marketplace-lakehouse-entitlements__grid__user-display"
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
        valueGetter: (params) => {
          const contractId = params.data?.dataContractId;
          const contract = allContracts?.find(
            (_contract) => _contract.guid === contractId,
          );
          return contract?.resourceId ?? 'Unknown';
        },
      },
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        headerName: 'Target Access Point Group',
        flex: 1,
        valueGetter: (params) => {
          const contractId = params.data?.dataContractId;
          const contract = allContracts?.find(
            (_contract) => _contract.guid === contractId,
          );
          const accessPointGroup =
            contract?.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
              ? contract.accessPointGroup
              : `${contract?.accessPointGroup ?? 'Unknown'} (${contract?.resourceType ?? 'Unknown Type'})`;
          return accessPointGroup ?? 'Unknown';
        },
      },
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        headerName: 'Business Justification',
        flex: 2,
        valueGetter: (params) => {
          const contractId = params.data?.dataContractId;
          const businessJustification = allContracts?.find(
            (contract) => contract.guid === contractId,
          )?.description;
          return businessJustification ?? 'Unknown';
        },
      },
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        hide: true,
        headerName: 'Contract ID',
        flex: 2,
        valueGetter: (params) => params.data?.dataContractId ?? 'Unknown',
      },
    ];

    return (
      <>
        <Box className="marketplace-lakehouse-entitlements__pending-tasks">
          <Box className="marketplace-lakehouse-entitlements__pending-tasks__action-btns">
            <Button
              variant="contained"
              color="success"
              disabled={!selectedTaskIdsSet.size || loading}
              onClick={() => setSelectedAction('approve')}
            >
              Approve {selectedTaskIdsSet.size} tasks
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={!selectedTaskIdsSet.size || loading}
              onClick={() => setSelectedAction('deny')}
            >
              Deny {selectedTaskIdsSet.size} tasks
            </Button>
          </Box>
          <Box className="marketplace-lakehouse-entitlements__pending-tasks__grids">
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
                  overlayNoRowsTemplate="You have no contracts to approve as a Privilege Manager"
                  loading={loading}
                />
              </Box>
            </Box>
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
                  overlayNoRowsTemplate="You have no contracts to approve as a Data Owner"
                  loading={loading}
                />
              </Box>
            </Box>
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
                    loading={loading}
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
          marketplaceStore={marketplaceBaseStore}
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
            initialSelectedUser={selectedContractTargetUser}
          />
        )}
      </>
    );
  },
);
