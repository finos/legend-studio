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
  V1_AdhocTeam,
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startCase } from '@finos/legend-shared';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { useAuth } from 'react-oidc-context';
import {
  type ContractErrorLayer,
  DataAccessRequestViewer,
  isApprovalStatusTerminal,
  isContractInTerminalState,
} from '@finos/legend-extension-dsl-data-product';
import { flowResult } from 'mobx';
import {
  getCommonEntitlementsColDefs,
  type EntitlementsRow,
  getSelectedRowId,
  getSelectedContractGuid,
  EntitlementsColumnHeader,
  ENTITLEMENTS_DEFAULT_COL_DEF,
  ROW_KIND_CONTRACT,
  ROW_KIND_REQUEST,
  CONTRACT_STATE_DISPLAY_LABELS,
  getLiteAccessRequest,
  getSyncCheckId,
  isApprovedRow,
  TERMINAL_DATA_REQUEST_STATES,
  UNKNOWN,
  useSelectedViewerState,
  useGetDataProductUrl,
} from '../../../utils/EntitlementsUtils.js';
import { LegendMarketplaceTelemetryHelper } from '../../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { ContractAccessStatusCell } from './ContractAccessStatusCell.js';

const getClosedStateLabel = (row: EntitlementsRow): string => {
  if (row.kind === ROW_KIND_CONTRACT) {
    if (row.data instanceof V1_LiteDataContractWithUserStatus) {
      return startCase(row.data.status);
    }
    const lite = row.data.contractResultLite;
    return lite instanceof V1_LiteDataContract
      ? (CONTRACT_STATE_DISPLAY_LABELS[lite.state] ?? startCase(lite.state))
      : UNKNOWN;
  }
  return startCase(row.data.dataRequest.state);
};

export const EntitlementsClosedContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const {
      allContractsForUser,
      allContractsCreatedByUser,
      dataRequestsCreatedByUser,
    } = dashboardState;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const auth = useAuth();
    const tokenRef = useRef(auth.user?.access_token);
    tokenRef.current = auth.user?.access_token;
    const getDataProductUrl = useGetDataProductUrl();

    const myClosedContracts = useMemo(
      () =>
        allContractsForUser?.filter((contract) =>
          isApprovalStatusTerminal(contract.status),
        ) ?? [],
      [allContractsForUser],
    );
    const myClosedContractIds = useMemo(
      () => new Set(myClosedContracts.map((c) => c.contractResultLite.guid)),
      [myClosedContracts],
    );
    const closedContractsForOthers = useMemo(
      () =>
        allContractsCreatedByUser.filter(
          (contract) =>
            contract.contractResultLite instanceof V1_LiteDataContract &&
            isContractInTerminalState(contract.contractResultLite) &&
            !myClosedContractIds.has(contract.contractResultLite.guid),
        ),
      [allContractsCreatedByUser, myClosedContractIds],
    );

    const closedDataRequests = useMemo(
      () =>
        (dataRequestsCreatedByUser ?? []).filter((dr) =>
          TERMINAL_DATA_REQUEST_STATES.has(dr.dataRequest.state),
        ),
      [dataRequestsCreatedByUser],
    );

    const [selectedRow, setSelectedRow] = useState<
      EntitlementsRow | undefined
    >();
    const [contractErrors, setContractErrors] = useState<
      ContractErrorLayer | undefined
    >(undefined);
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myClosedContracts.length === 0 && closedContractsForOthers.length > 0,
    );

    const loadContractErrors = useCallback(
      async (
        row: EntitlementsRow,
        onProgress?: (errors: ContractErrorLayer | undefined) => void,
      ): Promise<ContractErrorLayer | undefined> =>
        dashboardState.getContractErrors(
          getLiteAccessRequest(row),
          tokenRef.current,
          isApprovedRow(row),
          onProgress,
        ),
      [dashboardState],
    );

    useEffect(() => {
      let isCurrentSelection = true;
      setContractErrors(undefined);
      if (selectedRow) {
        // the errors are shown as each part comes in
        loadContractErrors(selectedRow, (errors) => {
          if (isCurrentSelection) {
            setContractErrors(errors);
          }
        })
          .then((result) => {
            if (isCurrentSelection) {
              setContractErrors(result);
            }
          })
          .catch(() => {
            if (isCurrentSelection) {
              setContractErrors(undefined);
            }
          });
      }
      return () => {
        isCurrentSelection = false;
      };
    }, [selectedRow, loadContractErrors]);

    const selectedRowId = getSelectedRowId(selectedRow);

    const selectedViewerState = useSelectedViewerState(
      selectedRow,
      selectedRowId,
    );

    const getInitialUserForViewer = (): string | undefined => {
      if (selectedRow?.kind !== ROW_KIND_CONTRACT) {
        return undefined;
      }
      const contract = selectedRow.data.contractResultLite;
      const currentUser =
        marketplaceBaseStore.applicationStore.identityService.currentUser;
      if (myClosedContractIds.has(contract.guid)) {
        return currentUser;
      }
      if (
        contract.consumer instanceof V1_AdhocTeam &&
        contract.consumer.users.some((user) => user.name === currentUser)
      ) {
        return currentUser;
      }
      return undefined;
    };

    const selectedContractGuid = getSelectedContractGuid(selectedRow);

    const colDefs: DataGridColumnDefinition<EntitlementsRow>[] = useMemo(
      () => [
        ...getCommonEntitlementsColDefs(dashboardState),
        {
          headerName: EntitlementsColumnHeader.STATE,
          // Sorting, filtering and copying use the state alone: the access status
          // arrives later, and is only shown by the cell
          valueGetter: (params) =>
            params.data ? getClosedStateLabel(params.data) : UNKNOWN,
          cellRenderer: (
            params: DataGridCellRendererParams<EntitlementsRow>,
          ) =>
            params.data ? (
              <ContractAccessStatusCell
                stateLabel={getClosedStateLabel(params.data)}
                syncCheckId={getSyncCheckId(params.data)}
                dashboardState={dashboardState}
              />
            ) : null,
        },
      ],
      [dashboardState],
    );

    const gridRowData: EntitlementsRow[] = useMemo(() => {
      const contracts = showForOthers
        ? [...myClosedContracts, ...closedContractsForOthers]
        : myClosedContracts;
      return [
        ...contracts.map(
          (c): EntitlementsRow => ({ kind: ROW_KIND_CONTRACT, data: c }),
        ),
        ...closedDataRequests.map(
          (r): EntitlementsRow => ({ kind: ROW_KIND_REQUEST, data: r }),
        ),
      ];
    }, [
      showForOthers,
      myClosedContracts,
      closedContractsForOthers,
      closedDataRequests,
    ]);

    return (
      <Box className="marketplace-lakehouse-entitlements__completed-contracts">
        <FormGroup className="marketplace-lakehouse-entitlements__completed-contracts__action-btns">
          <FormControlLabel
            control={
              dashboardState.fetchingContractsByUserState.isInProgress ? (
                <Box className="marketplace-lakehouse-entitlements__pending-contracts__action-btn--loading">
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Switch
                  checked={showForOthers}
                  onChange={(event) => {
                    setShowForOthers(event.target.checked);
                    LegendMarketplaceTelemetryHelper.logEvent_ToggleShowRequestsForOthers(
                      marketplaceBaseStore.applicationStore.telemetryService,
                      event.target.checked,
                      'Closed Requests',
                    );
                  }}
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
            className="marketplace-lakehouse-entitlements__completed-contracts__action-btn"
          />
        </FormGroup>
        <Box className="marketplace-lakehouse-entitlements__completed-contracts__grid ag-theme-balham">
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
            overlayNoRowsTemplate="You have no closed contracts or data requests"
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
            initialSelectedUser={getInitialUserForViewer()}
            onRefresh={async () => {
              if (selectedContractGuid) {
                await flowResult(
                  dashboardState.updateContract(
                    selectedContractGuid,
                    tokenRef.current,
                  ),
                );
              }
              // the sync may have finished since the row was opened, so its status
              // and its unsynced entities are fetched again
              const syncCheckId = getSyncCheckId(selectedRow);
              if (syncCheckId !== undefined) {
                await dashboardState.refreshAccessStatus(
                  syncCheckId,
                  tokenRef.current,
                );
              }
              setContractErrors(
                await loadContractErrors(selectedRow, setContractErrors),
              );
            }}
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
