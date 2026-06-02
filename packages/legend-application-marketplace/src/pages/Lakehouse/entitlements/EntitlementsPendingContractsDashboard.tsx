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

import { V1_LiteDataContractWithUserStatus } from '@finos/legend-graph';
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
import { useEffect, useMemo, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { startCase } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import {
  type ContractErrorLayer,
  MultiUserRenderer,
  isContractInTerminalState,
  DataAccessRequestViewer,
  isApprovalStatusTerminal,
} from '@finos/legend-extension-dsl-data-product';
import type { LakehouseEntitlementsStore } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { flowResult } from 'mobx';
import {
  getCommonEntitlementsColDefs,
  type EntitlementsRow,
  getContractData,
  getSelectedRowId,
  getSelectedContractGuid,
  getOpenTaskAssignees,
  EntitlementsColumnHeader,
  CONTRACT_STATE_DISPLAY_LABELS,
  ENTITLEMENTS_DEFAULT_COL_DEF,
  ROW_KIND_CONTRACT,
  ROW_KIND_REQUEST,
  TERMINAL_DATA_REQUEST_STATES,
  UNKNOWN,
  useSelectedViewerState,
  useGetDataProductUrl,
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
      assignees = getOpenTaskAssignees(row.data);
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
    const getDataProductUrl = useGetDataProductUrl();

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
    const [contractErrors, setContractErrors] = useState<
      ContractErrorLayer | undefined
    >(undefined);

    const selectedRowId = getSelectedRowId(selectedRow);
    const selectedViewerState = useSelectedViewerState(
      selectedRow,
      selectedRowId,
    );

    const [showForOthers, setShowForOthers] = useState<boolean>(
      myPendingContracts.length === 0 && pendingContractsForOthers.length > 0,
    );

    useEffect(() => {
      setContractErrors(undefined);
      if (selectedRow?.kind === ROW_KIND_CONTRACT) {
        const contract = selectedRow.data.contractResultLite;
        dashboardState
          .getContractErrors(contract.guid, auth.user?.access_token)
          .then((result) => setContractErrors(result))
          .catch(() => setContractErrors(undefined));
      }
    }, [selectedRow, auth.user?.access_token, dashboardState]);

    const selectedContractGuid = getSelectedContractGuid(selectedRow);

    const colDefs: DataGridColumnDefinition<EntitlementsRow>[] = useMemo(
      () => [
        ...getCommonEntitlementsColDefs(dashboardState),
        {
          headerName: EntitlementsColumnHeader.STATE,
          valueGetter: (params) => {
            if (!params.data) {
              return UNKNOWN;
            }
            if (params.data.kind === ROW_KIND_CONTRACT) {
              const state = getContractData(params.data)?.state;
              return state
                ? (CONTRACT_STATE_DISPLAY_LABELS[state] ?? startCase(state))
                : UNKNOWN;
            }
            return startCase(params.data.data.dataRequest.state);
          },
        },
        {
          headerName: EntitlementsColumnHeader.ASSIGNEES,
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
            const openAssignees = getOpenTaskAssignees(params.data.data);
            return openAssignees.length > 0 ? openAssignees.join(', ') : 'None';
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
            defaultColDef={ENTITLEMENTS_DEFAULT_COL_DEF}
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
            dataProductEnvironment={
              marketplaceBaseStore.envState.lakehouseEnvironment
            }
          />
        )}
      </Box>
    );
  },
);
