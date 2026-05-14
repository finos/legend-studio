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
  GraphManagerState,
  V1_ContractState,
  V1_LiteDataContractWithUserStatus,
  type V1_DataRequestsWithWorkflowResponse,
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_WorkflowTaskStatus,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import {
  Box,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Switch,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { startCase, type PlainObject } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import {
  MultiUserRenderer,
  isContractInTerminalState,
  DataAccessRequestViewer,
  isApprovalStatusTerminal,
  DataContractViewerState,
  PermitDataAccessRequestState,
} from '@finos/legend-extension-dsl-data-product';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
  generatePermitDataAccessRequestPagePath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { LakehouseEntitlementsStore } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { flowResult } from 'mobx';
import {
  getCommonEntitlementsColDefs,
  type EntitlementsRow,
  getContractData,
  getRequestData,
  ROW_KIND_CONTRACT,
  ROW_KIND_REQUEST,
  TERMINAL_DATA_REQUEST_STATES,
  UNKNOWN,
} from '../../../utils/EntitlementsUtils.js';

const AssigneesCellRenderer = observer(
  (props: {
    row: EntitlementsRow | undefined;
    entitlementsStore: LakehouseEntitlementsStore;
  }): React.ReactNode => {
    const { row, entitlementsStore } = props;
    if (!row) {
      return null;
    }

    let assignees: string[];
    if (row.kind === ROW_KIND_CONTRACT) {
      assignees =
        (row.data instanceof V1_LiteDataContractWithUserStatus
          ? row.data.pendingTaskWithAssignees?.assignees.toSorted()
          : row.data.sortedAssigneeIds) ?? [];
    } else {
      const openTask = row.data.workflows
        .flatMap((w) => w.tasks)
        .find((t) => t.status === V1_WorkflowTaskStatus.OPEN);
      assignees = openTask?.assignees.toSorted() ?? [];
    }

    return (
      <MultiUserRenderer
        userIds={assignees}
        applicationStore={entitlementsStore.applicationStore}
        userSearchService={
          entitlementsStore.marketplaceBaseStore.userSearchService
        }
        disableOnClick={true}
        singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
      />
    );
  },
);

export const EntitlementsPendingContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const {
      allContractsForUser,
      allContractsCreatedByUser,
      dataRequestsCreatedByUser,
    } = dashboardState;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const auth = useAuth();

    const myPendingContracts = useMemo(
      () =>
        allContractsForUser?.filter(
          (contract) => !isApprovalStatusTerminal(contract.status),
        ) ?? [],
      [allContractsForUser],
    );
    const myPendingContractIds = useMemo(
      () => new Set(myPendingContracts.map((c) => c.contractResultLite.guid)),
      [myPendingContracts],
    );
    const pendingContractsForOthers = useMemo(
      () =>
        allContractsCreatedByUser.filter(
          (contract) =>
            !isContractInTerminalState(contract.contractResultLite) &&
            !myPendingContractIds.has(contract.contractResultLite.guid),
        ),
      [allContractsCreatedByUser, myPendingContractIds],
    );

    const pendingDataRequests = useMemo(
      () =>
        (dataRequestsCreatedByUser ?? []).filter(
          (dr) => !TERMINAL_DATA_REQUEST_STATES.has(dr.dataRequest.state),
        ),
      [dataRequestsCreatedByUser],
    );

    const [selectedRow, setSelectedRow] = useState<
      EntitlementsRow | undefined
    >();

    const selectedRowId = selectedRow
      ? (getContractData(selectedRow)?.guid ??
        getRequestData(selectedRow)?.guid)
      : undefined;
    const selectedViewerState = useMemo(() => {
      if (!selectedRow) {
        return undefined;
      }
      if (selectedRow.kind === ROW_KIND_CONTRACT) {
        const contract = selectedRow.data.contractResultLite;
        return new DataContractViewerState(
          contract,
          (contractId: string, taskId: string) =>
            marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
              generateContractPagePath(contractId, taskId),
            ),
          undefined,
          marketplaceBaseStore.applicationStore,
          marketplaceBaseStore.lakehouseContractServerClient,
          new GraphManagerState(
            marketplaceBaseStore.applicationStore.pluginManager,
            marketplaceBaseStore.applicationStore.logService,
          ),
          marketplaceBaseStore.userSearchService,
        );
      }
      const guid = selectedRow.data.dataRequest.guid;
      const authClient = marketplaceBaseStore.lakehouseContractServerClient;
      const pluginManager = marketplaceBaseStore.applicationStore.pluginManager;
      return new PermitDataAccessRequestState(
        guid,
        marketplaceBaseStore.applicationStore,
        marketplaceBaseStore.permitWorkflowServerClient,
        marketplaceBaseStore.userSearchService,
        {
          authServerClient: authClient,
          initialData: selectedRow.data,
          fetchFresh: async (token) => {
            const raw = await authClient.getDataAccessRequestWithWorkflow(
              guid,
              token,
            );
            return V1_deserializeDataRequestsWithWorkflowResponse(
              raw as unknown as PlainObject<V1_DataRequestsWithWorkflowResponse>,
              pluginManager.getPureProtocolProcessorPlugins(),
            )[0];
          },
          getTaskPageUrl: (id) =>
            marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
              generatePermitDataAccessRequestPagePath(id),
            ),
        },
      );
      // Re-create only when the selected row changes (different guid)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRowId]);

    const [showForOthers, setShowForOthers] = useState<boolean>(
      myPendingContracts.length === 0 && pendingContractsForOthers.length > 0,
    );

    const selectedContractGuid = selectedRow
      ? getContractData(selectedRow)?.guid
      : undefined;

    const defaultColDef: DataGridColumnDefinition<EntitlementsRow> = useMemo(
      () => ({
        minWidth: 50,
        sortable: true,
        resizable: true,
        flex: 1,
      }),
      [],
    );

    const colDefs: DataGridColumnDefinition<EntitlementsRow>[] = useMemo(
      () => [
        ...getCommonEntitlementsColDefs(dashboardState),
        {
          headerName: 'State',
          valueGetter: (params) => {
            if (!params.data) {
              return UNKNOWN;
            }
            if (params.data.kind === ROW_KIND_CONTRACT) {
              const state = getContractData(params.data)?.state;
              switch (state) {
                case V1_ContractState.PENDING_DATA_OWNER_APPROVAL:
                  return 'Data Owner Approval';
                case V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL:
                  return 'Privilege Manager Approval';
                default:
                  return state ? startCase(state) : UNKNOWN;
              }
            }
            return startCase(params.data.data.dataRequest.state);
          },
        },
        {
          headerName: 'Assignees',
          colId: 'assignees',
          valueGetter: (params) => {
            if (!params.data) {
              return UNKNOWN;
            }
            if (params.data.kind === ROW_KIND_CONTRACT) {
              const assignees =
                (params.data.data instanceof V1_LiteDataContractWithUserStatus
                  ? params.data.data.pendingTaskWithAssignees?.assignees.toSorted()
                  : params.data.data.sortedAssigneeIds) ?? [];
              return assignees.length > 0 ? assignees.join(', ') : UNKNOWN;
            }
            const openTask = params.data.data.workflows
              .flatMap((w) => w.tasks)
              .find((t) => t.status === V1_WorkflowTaskStatus.OPEN);
            const assignees = openTask?.assignees.toSorted() ?? [];
            return assignees.length > 0 ? assignees.join(', ') : 'None';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<EntitlementsRow>,
          ) => (
            <AssigneesCellRenderer
              row={params.data}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
            />
          ),
        },
      ],
      [dashboardState],
    );

    const gridRowData: EntitlementsRow[] = useMemo(() => {
      const contracts = showForOthers
        ? [...myPendingContracts, ...pendingContractsForOthers]
        : myPendingContracts;
      return [
        ...contracts.map(
          (c): EntitlementsRow => ({ kind: ROW_KIND_CONTRACT, data: c }),
        ),
        ...pendingDataRequests.map(
          (r): EntitlementsRow => ({ kind: ROW_KIND_REQUEST, data: r }),
        ),
      ];
    }, [
      showForOthers,
      myPendingContracts,
      pendingContractsForOthers,
      pendingDataRequests,
    ]);

    return (
      <Box className="marketplace-lakehouse-entitlements__pending-contracts">
        <FormGroup className="marketplace-lakehouse-entitlements__pending-contracts__action-btns">
          <FormControlLabel
            control={
              dashboardState.fetchingContractsByUserState.isInProgress ? (
                <Box className="marketplace-lakehouse-entitlements__pending-contracts__action-btn--loading">
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Switch
                  checked={showForOthers}
                  onChange={(event) => setShowForOthers(event.target.checked)}
                />
              )
            }
            label="Show my requests for others"
            title={
              dashboardState.fetchingContractsByUserState.isInProgress
                ? 'Loading requests for others'
                : undefined
            }
            disabled={dashboardState.fetchingContractsByUserState.isInProgress}
            className="marketplace-lakehouse-entitlements__pending-contracts__action-btn"
          />
        </FormGroup>
        <Box className="marketplace-lakehouse-entitlements__pending-contracts__grid ag-theme-balham">
          <DataGrid
            rowData={gridRowData}
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressContextMenu={false}
            columnDefs={colDefs}
            onCellClicked={(event) => event.data && setSelectedRow(event.data)}
            defaultColDef={defaultColDef}
            rowHeight={45}
            overlayNoRowsTemplate="You have no pending contracts or data requests"
            loading={
              dashboardState.fetchingContractsForUserState.isInProgress ||
              dashboardState.fetchingDataRequestsCreatedByUserState.isInProgress
            }
            overlayLoadingTemplate="Loading"
          />
        </Box>
        {selectedRow !== undefined && selectedViewerState !== undefined && (
          <DataAccessRequestViewer
            open={true}
            onClose={() => setSelectedRow(undefined)}
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
            getDataProductUrl={(dataProductId: string, deploymentId: number) =>
              marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                generateLakehouseDataProductPath(dataProductId, deploymentId),
              )
            }
            dataProductEnvironment={
              marketplaceBaseStore.envState.lakehouseEnvironment
            }
          />
        )}
      </Box>
    );
  },
);
