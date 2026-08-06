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
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { InfoCircleIcon } from '@finos/legend-art';
import { ActionAlertType } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { observer } from 'mobx-react-lite';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { startCase } from '@finos/legend-shared';
import { showTaskActionAlert } from './showTaskActionAlert.js';
import {
  type ContractErrorLayer,
  UserRenderer,
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  stringifyOrganizationalScope,
  renderPluginOrganizationalScope,
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
  TaskApprovalAction,
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

const EntitlementsDashboardActionResultsModal = (props: {
  action: TaskApprovalAction;
  errorMessages: [V1_PendingTaskRecord, string][];
  successCount: number;
  pendingTaskContracts: V1_LiteAccessRequest[];
  marketplaceBaseStore: LegendMarketplaceBaseStore;
  onClose: () => void;
}) => {
  const {
    action,
    errorMessages,
    successCount,
    pendingTaskContracts,
    marketplaceBaseStore,
    onClose,
  } = props;

  return (
    <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
      <DialogTitle>
        {action === TaskApprovalAction.APPROVE ? 'Approve' : 'Deny'} Contract
        Requests
      </DialogTitle>
      <DialogContent className="marketplace-lakehouse-entitlements__data-contract-approval__content">
        {successCount > 0 && (
          <Box className="marketplace-lakehouse-entitlements__data-contract-approval__success">
            {successCount} selected contract requests were{' '}
            {action === TaskApprovalAction.APPROVE ? 'approved' : 'denied'}{' '}
            successfully
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
                {action === TaskApprovalAction.APPROVE
                  ? 'approving'
                  : 'denying'}{' '}
                request for{' '}
                <div className="marketplace-lakehouse-entitlements__data-contract-approval__error__user">
                  <UserRenderer
                    userId={task.consumer}
                    applicationStore={marketplaceBaseStore.applicationStore}
                    userSearchService={marketplaceBaseStore.userSearchService}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
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
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [bulkActionResults, setBulkActionResults] = useState<
      | {
          action: TaskApprovalAction;
          errorMessages: [V1_PendingTaskRecord, string][];
          successCount: number;
        }
      | undefined
    >(undefined);
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
    const tokenRef = useRef(auth.user?.access_token);
    tokenRef.current = auth.user?.access_token;
    const getDataProductUrl = useGetDataProductUrl();

    const selectedRowId = getSelectedRowId(selectedRow);
    const selectedViewerState = useSelectedViewerState(
      selectedRow,
      selectedRowId,
    );
    const selectedContractGuid = getSelectedContractGuid(selectedRow);

    const runBulkAction = async (
      action: TaskApprovalAction,
      justification: string,
    ): Promise<void> => {
      const tasks =
        pendingTasks?.filter((task) => selectedTaskIdsSet.has(task.taskId)) ??
        [];
      const actionFunction =
        action === TaskApprovalAction.APPROVE
          ? dashboardState.approve.bind(dashboardState)
          : dashboardState.deny.bind(dashboardState);
      const currentErrorMessages: [V1_PendingTaskRecord, string][] = [];
      let successCount = 0;
      await Promise.all(
        tasks.map(async (task) =>
          flowResult(actionFunction(task, tokenRef.current, justification))
            .then(() => {
              successCount += 1;
            })
            .catch((error) => currentErrorMessages.push([task, error.message])),
        ),
      );
      if (currentErrorMessages.length === 0) {
        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          `${tasks.length} selected contract requests have been ${action === TaskApprovalAction.APPROVE ? 'approved' : 'denied'} successfully.`,
        );
      } else {
        setBulkActionResults({
          action,
          errorMessages: currentErrorMessages,
          successCount,
        });
      }
      LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
        marketplaceBaseStore.applicationStore.telemetryService,
        tasks,
        pendingTaskContracts,
        action === TaskApprovalAction.APPROVE
          ? CONTRACT_ACTION.APPROVED
          : CONTRACT_ACTION.DENIED,
        marketplaceBaseStore.applicationStore.identityService.currentUser,
        currentErrorMessages.length > 0
          ? currentErrorMessages.map((error) => error[1])
          : undefined,
      );

      // Refresh pending tasks and contracts after taking action
      await flowResult(dashboardState.init(tokenRef.current));
    };

    const handleBulkActionClick = (action: TaskApprovalAction): void => {
      const count = selectedTaskIdsSet.size;
      showTaskActionAlert({
        applicationStore: marketplaceBaseStore.applicationStore,
        title: `${action === TaskApprovalAction.APPROVE ? 'Approve' : 'Deny'} Contract Requests`,
        message: `Please provide a business justification for ${action === TaskApprovalAction.APPROVE ? 'approving' : 'denying'} ${count} selected contract request${count === 1 ? '' : 's'}.`,
        confirmLabel:
          action === TaskApprovalAction.APPROVE ? 'Approve' : 'Deny',
        alertType:
          action === TaskApprovalAction.APPROVE
            ? ActionAlertType.STANDARD
            : ActionAlertType.CAUTION,
        requireJustification: true,
        isLoading: isBulkActionLoading,
        setIsLoading: setIsBulkActionLoading,
        onConfirm: (justification) => runBulkAction(action, justification),
        errorPrefix: `Error ${action === TaskApprovalAction.APPROVE ? 'approving' : 'denying'} contract requests`,
      });
    };

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
              .getContractErrors(contract.guid, tokenRef.current)
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
            if (params.data?.consumer) {
              return params.data.consumer;
            }
            const contractId = params.data?.accessRequestId;
            const consumer = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.consumer;
            return consumer
              ? stringifyOrganizationalScope(
                  consumer,
                  dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
                )
              : 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<V1_PendingTaskRecord>,
          ) => {
            // If the row's consumer is an organizational scope a plugin renders
            // specially (e.g. an RMS node link), show that — such scopes are not
            // user ids (the `consumer` string holds their flattened node code).
            const plugins =
              dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins();
            const contractId = params.data?.accessRequestId;
            const consumerScope = pendingTaskContracts.find(
              (c) => c.guid === contractId,
            )?.consumer;
            const orgRendered = consumerScope
              ? renderPluginOrganizationalScope(consumerScope, plugins)
              : undefined;
            if (orgRendered !== undefined) {
              return <>{orgRendered}</>;
            }
            // Otherwise prefer the task's own target user: for a bulk contract
            // covering many candidates, each task pertains to a single candidate,
            // and the parent contract's consumer scope is not representative of
            // this specific task. Fall back to the stringified consumer scope.
            let userId = params.data?.consumer;
            if (!userId) {
              userId = consumerScope
                ? stringifyOrganizationalScope(consumerScope, plugins)
                : undefined;
            }
            return userId ? (
              <UserRenderer
                userId={userId}
                applicationStore={marketplaceBaseStore.applicationStore}
                userSearchService={marketplaceBaseStore.userSearchService}
                options={{
                  disableOnClick: true,
                  className:
                    'marketplace-lakehouse-entitlements__grid__user-display',
                }}
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
                options={{
                  disableOnClick: true,
                  className:
                    'marketplace-lakehouse-entitlements__grid__user-display',
                }}
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
              disabled={
                !selectedTaskIdsSet.size || loading || isBulkActionLoading
              }
              onClick={() => handleBulkActionClick(TaskApprovalAction.APPROVE)}
            >
              Approve {selectedTaskIdsSet.size} tasks
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={
                !selectedTaskIdsSet.size || loading || isBulkActionLoading
              }
              onClick={() => handleBulkActionClick(TaskApprovalAction.DENY)}
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
        {bulkActionResults && (
          <EntitlementsDashboardActionResultsModal
            action={bulkActionResults.action}
            errorMessages={bulkActionResults.errorMessages}
            successCount={bulkActionResults.successCount}
            pendingTaskContracts={pendingTaskContracts}
            marketplaceBaseStore={marketplaceBaseStore}
            onClose={() => setBulkActionResults(undefined)}
          />
        )}
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
                        tokenRef.current,
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
