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
  V1_ContractState,
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
} from '@finos/legend-graph';
import {
  DataGrid,
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
  TERMINAL_DATA_REQUEST_STATES,
  UNKNOWN,
  useSelectedViewerState,
  useGetDataProductUrl,
} from '../../../utils/EntitlementsUtils.js';

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

    useEffect(() => {
      setContractErrors(undefined);
      if (
        selectedRow?.kind === ROW_KIND_CONTRACT &&
        selectedRow.data.contractResultLite instanceof V1_LiteDataContract
      ) {
        const contract = selectedRow.data.contractResultLite;
        const isCompleted = contract.state === V1_ContractState.COMPLETED;
        dashboardState
          .getContractErrors(
            contract.guid,
            auth.user?.access_token,
            isCompleted,
          )
          .then((result) => setContractErrors(result))
          .catch(() => setContractErrors(undefined));
      }
    }, [selectedRow, auth.user?.access_token, dashboardState]);

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
          valueGetter: (params) => {
            if (!params.data) {
              return UNKNOWN;
            }
            if (params.data.kind === ROW_KIND_CONTRACT) {
              if (
                params.data.data instanceof V1_LiteDataContractWithUserStatus
              ) {
                return params.data.data.status;
              }
              const lite = params.data.data.contractResultLite;
              return lite instanceof V1_LiteDataContract ? lite.state : UNKNOWN;
            }
            return startCase(params.data.data.dataRequest.state);
          },
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
