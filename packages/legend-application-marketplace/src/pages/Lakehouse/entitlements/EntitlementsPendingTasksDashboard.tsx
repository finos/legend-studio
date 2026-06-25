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

import {
  type V1_PendingTaskRecord,
  type V1_LiteAccessRequest,
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
import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { observer } from 'mobx-react-lite';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { startCase } from '@finos/legend-shared';
import {
  type ContractErrorLayer,
  UserRenderer,
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  DataAccessRequestViewer,
} from '@finos/legend-extension-dsl-data-product';
import {
  CONTRACT_ACTION,
  LegendMarketplaceTelemetryHelper,
} from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { formatOrderDate } from '../../../stores/orders/OrderHelpers.js';
import {
  ContractCreatedByUserDetails,
  type EntitlementsDashboardState,
} from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import {
  type EntitlementsRow,
  ROW_KIND_CONTRACT,
  ROW_KIND_REQUEST,
  getSelectedRowId,
  getSelectedContractGuid,
  useSelectedViewerState,
  useGetDataProductUrl,
} from '../../../utils/EntitlementsUtils.js';

const EntitlementsDashboardActionModal = (props: {
  open: boolean;
  selectedTasks: V1_PendingTaskRecord[];
  dashboardState: EntitlementsDashboardState;
  onClose: () => void;
  action: 'approve' | 'deny' | undefined;
  pendingTaskContracts: V1_LiteAccessRequest[];
  marketplaceBaseStore: LegendMarketplaceBaseStore;
}) => {
  const {
    open,
    selectedTasks,
    dashboardState,
    onClose,
    action,
    pendingTaskContracts,
    marketplaceBaseStore,
  } = props;

  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessages, setErrorMessages] = useState<
    [V1_PendingTaskRecord, string][]
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
      LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .telemetryService,
        selectedTasks,
        pendingTaskContracts,
        action === 'approve'
          ? CONTRACT_ACTION.APPROVED
          : CONTRACT_ACTION.DENIED,
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser,
        undefined,
      );
    } else {
      // If there were errors, we won't close the modal and will show the errors in the modal.
      setErrorMessages(currentErrorMessages);
      LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .telemetryService,
        selectedTasks,
        pendingTaskContracts,
        action === 'approve'
          ? CONTRACT_ACTION.APPROVED
          : CONTRACT_ACTION.DENIED,
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser,
        currentErrorMessages.map((error) => error[1]),
      );
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
              const contractId = task.accessRequestId;
              const contract = pendingTaskContracts.find(
                (c) => c.guid === contractId,
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
                        applicationStore={marketplaceBaseStore.applicationStore}
                        userSearchService={
                          marketplaceBaseStore.userSearchService
                        }
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

export const EntitlementsPendingTasksDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    // State and props
    const { dashboardState } = props;
    const pendingTasks = dashboardState.pendingTasks;
    const pendingTaskContracts = dashboardState.pendingTaskContracts;
    const privilegeManagerTasks = useMemo(
      () =>
        pendingTasks?.filter(
          (task) =>
            task.type === V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        ) ?? [],
      [pendingTasks],
    );
    const dataOwnerTasks = useMemo(
      () =>
        pendingTasks?.filter(
          (task) => task.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
        ) ?? [],
      [pendingTasks],
    );
    const otherTasks = useMemo(
      () =>
        pendingTasks?.filter(
          (task) =>
            !privilegeManagerTasks.includes(task) &&
            !dataOwnerTasks.includes(task),
        ) ?? [],
      [dataOwnerTasks, privilegeManagerTasks, pendingTasks],
    );
    const loading = dashboardState.fetchingPendingTasksState.isInProgress;

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedAction, setSelectedAction] = useState<
      'approve' | 'deny' | undefined
    >();
    const selectedTaskIdsSet = dashboardState.selectedTaskIds;
    const [selectedRow, setSelectedRow] = useState<
      EntitlementsRow | undefined
    >();
    const [selectedContractTargetUser, setSelectedContractTargetUser] =
      useState<string | undefined>();
    const [contractErrors, setContractErrors] = useState<
      ContractErrorLayer | undefined
    >(undefined);

    const auth = useAuth();
    const getDataProductUrl = useGetDataProductUrl();

    const selectedRowId = getSelectedRowId(selectedRow);
    const selectedViewerState = useSelectedViewerState(
      selectedRow,
      selectedRowId,
    );
    const selectedContractGuid = getSelectedContractGuid(selectedRow);

    // Callbacks

    const handleFirstDataRendered = (
      event: DataGridFirstDataRenderedEvent<V1_PendingTaskRecord, unknown>,
    ) => {
      const nodesToSelect: DataGridIRowNode<V1_PendingTaskRecord>[] = [];
      event.api.forEachNode((node) => {
        if (node.data && selectedTaskIdsSet.has(node.data.taskId)) {
          nodesToSelect.push(node);
        }
      });
      event.api.setNodesSelected({ nodes: nodesToSelect, newValue: true });
    };

    const handleCellClicked = (
      event: DataGridCellClickedEvent<V1_PendingTaskRecord, unknown>,
    ) => {
      if (event.colDef.colId !== 'selection') {
        setSelectedContractTargetUser(event.data?.consumer);

        const dataRequestId = event.data?.accessRequestId;
        const isDataRequest =
          dataRequestId !== undefined &&
          dashboardState.pendingDataRequestIds.has(dataRequestId);

        if (isDataRequest && dataRequestId) {
          const detail =
            dashboardState.pendingDataRequestDetailsMap.get(dataRequestId);
          if (detail) {
            setContractErrors(undefined);
            setSelectedRow({ kind: ROW_KIND_REQUEST, data: detail });
          }
        } else {
          const contract = pendingTaskContracts.find(
            (c) => c.guid === event.data?.accessRequestId,
          );
          if (contract) {
            setContractErrors(undefined);
            setSelectedRow({
              kind: ROW_KIND_CONTRACT,
              data: new ContractCreatedByUserDetails(contract),
            });
            dashboardState
              .getContractErrors(contract.guid, auth.user?.access_token)
              .then((result) => setContractErrors(result))
              .catch(() => setContractErrors(undefined));
          }
        }
      }
    };

    const rowSelection = useMemo<
      DataGridRowSelectionOptions | 'single' | 'multiple'
    >(
      () => ({
        mode: 'multiRow',
        checkboxes: false,
        headerCheckbox: false,
      }),
      [],
    );

    const CustomSelectionRenderer = useCallback(
      (params: DataGridCellRendererParams<V1_PendingTaskRecord>) => {
        const handleChange = (_: ChangeEvent<HTMLInputElement>) => {
          if (params.data) {
            const newSet = new Set<string>(selectedTaskIdsSet);
            if (selectedTaskIdsSet.has(params.data.taskId)) {
              newSet.delete(params.data.taskId);
            } else {
              newSet.add(params.data.taskId);
            }
            dashboardState.setSelectedTaskIds(newSet);
          }
        };

        return (
          <Checkbox
            size="large"
            checked={selectedTaskIdsSet.has(params.data?.taskId ?? '')}
            onChange={handleChange}
            sx={{ padding: 0 }}
          />
        );
      },
      [selectedTaskIdsSet, dashboardState],
    );

    const CustomSelectionHeaderRenderer = useCallback(
      (_props: {
        params: DataGridCustomHeaderProps<V1_PendingTaskRecord>;
        taskSet: V1_PendingTaskRecord[];
      }) => {
        const { taskSet } = _props;
        const checked =
          taskSet.length > 0 &&
          taskSet.every((task) => selectedTaskIdsSet.has(task.taskId));
        const indeterminate =
          taskSet.length > 0 &&
          !checked &&
          taskSet.some((task) => selectedTaskIdsSet.has(task.taskId));

        const handleChange = (_e: ChangeEvent<HTMLInputElement>) => {
          if (!checked || indeterminate) {
            const newSet = new Set<string>(selectedTaskIdsSet);
            taskSet.forEach((task) => newSet.add(task.taskId));
            dashboardState.setSelectedTaskIds(newSet);
          } else {
            const newSet = new Set<string>(selectedTaskIdsSet);
            taskSet.forEach((task) => newSet.delete(task.taskId));
            dashboardState.setSelectedTaskIds(newSet);
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
      },
      [selectedTaskIdsSet, dashboardState],
    );

    const colDefs: DataGridColumnDefinition<V1_PendingTaskRecord>[] = useMemo(
      () => [
        {
          headerName: 'Date Created',
          colId: 'dateCreated',
          valueGetter: (params) => {
            const contractId = params.data?.accessRequestId;
            const createdAt = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.createdAt;
            return formatOrderDate(createdAt) ?? 'Unknown';
          },
          sortable: true,
          sort: 'desc',
          comparator: (_, __, val1, val2) => {
            const contractId1 = val1.data?.accessRequestId;
            const contractId2 = val2.data?.accessRequestId;
            const createdAt1 = pendingTaskContracts.find(
              (c) => c.guid === contractId1,
            )?.createdAt;
            const createdAt2 = pendingTaskContracts.find(
              (c) => c.guid === contractId2,
            )?.createdAt;
            const dateA = createdAt1 ? new Date(createdAt1).getTime() : 0;
            const dateB = createdAt2 ? new Date(createdAt2).getTime() : 0;
            return dateA - dateB;
          },
        },
        {
          minWidth: 25,
          sortable: true,
          resizable: true,
          colId: 'consumerType',
          headerName: 'Consumer Type',
          flex: 1,
          valueGetter: (params) => {
            const contractId = params.data?.accessRequestId;
            const consumer = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.consumer;
            const typeName = consumer
              ? getOrganizationalScopeTypeName(
                  consumer,
                  dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
                )
              : undefined;
            return typeName ?? 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<V1_PendingTaskRecord>,
          ) => {
            const contractId = params.data?.accessRequestId;
            const consumer = pendingTaskContracts.find(
              (c) => c.guid === contractId,
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
          valueGetter: (params) => {
            return params.data?.consumer ?? 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<V1_PendingTaskRecord>,
          ) => {
            return (
              <UserRenderer
                userId={params.data?.consumer}
                applicationStore={marketplaceBaseStore.applicationStore}
                userSearchService={marketplaceBaseStore.userSearchService}
                disableOnClick={true}
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
          valueGetter: (params) => {
            const contractId = params.data?.accessRequestId;
            const requester = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.createdBy;
            return requester ?? 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<V1_PendingTaskRecord>,
          ) => {
            const contractId = params.data?.accessRequestId;
            const requester = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.createdBy;
            return requester ? (
              <UserRenderer
                userId={requester}
                applicationStore={marketplaceBaseStore.applicationStore}
                userSearchService={marketplaceBaseStore.userSearchService}
                disableOnClick={true}
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
            const contractId = params.data?.accessRequestId;
            const contract = pendingTaskContracts.find(
              (c) => c.guid === contractId,
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
            const contractId = params.data?.accessRequestId;
            const contract = pendingTaskContracts.find(
              (c) => c.guid === contractId,
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
            const contractId = params.data?.accessRequestId;
            const businessJustification = pendingTaskContracts.find(
              (c) => c.guid === contractId,
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
          valueGetter: (params) => params.data?.accessRequestId ?? 'Unknown',
        },
      ],
      [
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .pluginManager,
        marketplaceBaseStore.applicationStore,
        marketplaceBaseStore.userSearchService,
        pendingTaskContracts,
      ],
    );

    const privilegeManagerColDefs: DataGridColumnDefinition<V1_PendingTaskRecord>[] =
      useMemo(
        () => [
          {
            headerName: '',
            colId: 'selection',
            width: 50,
            cellRenderer: CustomSelectionRenderer,
            headerComponent: (
              params: DataGridCustomHeaderProps<V1_PendingTaskRecord>,
            ) => (
              <CustomSelectionHeaderRenderer
                params={params}
                taskSet={privilegeManagerTasks}
              />
            ),
            pinned: 'left',
          },
          ...colDefs,
        ],
        [
          CustomSelectionHeaderRenderer,
          CustomSelectionRenderer,
          colDefs,
          privilegeManagerTasks,
        ],
      );

    const dataOwnerColDefs: DataGridColumnDefinition<V1_PendingTaskRecord>[] =
      useMemo(
        () => [
          {
            headerName: '',
            colId: 'selection',
            width: 50,
            cellRenderer: CustomSelectionRenderer,
            headerComponent: (
              params: DataGridCustomHeaderProps<V1_PendingTaskRecord>,
            ) => (
              <CustomSelectionHeaderRenderer
                params={params}
                taskSet={dataOwnerTasks}
              />
            ),
            pinned: 'left',
          },
          ...colDefs,
        ],
        [
          CustomSelectionHeaderRenderer,
          CustomSelectionRenderer,
          colDefs,
          dataOwnerTasks,
        ],
      );

    const otherTasksColDefs: DataGridColumnDefinition<V1_PendingTaskRecord>[] =
      useMemo(
        () => [
          {
            headerName: '',
            colId: 'selection',
            width: 50,
            cellRenderer: CustomSelectionRenderer,
            headerComponent: (
              params: DataGridCustomHeaderProps<V1_PendingTaskRecord>,
            ) => (
              <CustomSelectionHeaderRenderer
                params={params}
                taskSet={otherTasks}
              />
            ),
            pinned: 'left',
          },
          ...colDefs,
        ],
        [
          CustomSelectionHeaderRenderer,
          CustomSelectionRenderer,
          colDefs,
          otherTasks,
        ],
      );

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
                  columnDefs={privilegeManagerColDefs}
                  overlayNoRowsTemplate="You have no contracts or data requests to approve as a Privilege Manager"
                  loading={loading}
                  overlayLoadingTemplate="Loading contracts"
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
                  columnDefs={dataOwnerColDefs}
                  overlayNoRowsTemplate="You have no contracts or data requests to approve as a Data Owner"
                  loading={loading}
                  overlayLoadingTemplate="Loading contracts"
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
                    columnDefs={otherTasksColDefs}
                    loading={loading}
                    overlayLoadingTemplate="Loading contracts"
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <EntitlementsDashboardActionModal
          open={selectedAction !== undefined}
          selectedTasks={
            pendingTasks?.filter((task) =>
              selectedTaskIdsSet.has(task.taskId),
            ) ?? []
          }
          dashboardState={dashboardState}
          onClose={() => setSelectedAction(undefined)}
          action={selectedAction}
          pendingTaskContracts={pendingTaskContracts}
          marketplaceBaseStore={marketplaceBaseStore}
        />
        {selectedRow !== undefined && selectedViewerState !== undefined && (
          <DataAccessRequestViewer
            open={true}
            onClose={() => {
              setSelectedRow(undefined);
              setContractErrors(undefined);
            }}
            contractErrors={contractErrors}
            viewerState={selectedViewerState}
            {...(selectedContractGuid
              ? {
                  onRefresh: async () => {
                    await flowResult(
                      dashboardState.updateContract(
                        selectedContractGuid,
                        auth.user?.access_token,
                      ),
                    );
                  },
                }
              : {})}
            getDataProductUrl={getDataProductUrl}
            initialSelectedUser={selectedContractTargetUser}
            //Derives environment from the fact that other environments are filtered out
            dataProductEnvironment={
              marketplaceBaseStore.envState.lakehouseEnvironment
            }
          />
        )}
      </>
    );
  },
);
