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
  type V1_DataRequestsWithWorkflowResponse,
  GraphManagerState,
  V1_AdhocTeam,
  V1_LiteDataContractWithUserStatus,
  V1_deserializeDataRequestsWithWorkflowResponse,
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
import { useMemo, useState } from 'react';
import { startCase, type PlainObject } from '@finos/legend-shared';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { useAuth } from 'react-oidc-context';
import {
  DataAccessRequestViewer,
  DataContractViewerState,
  PermitDataAccessRequestState,
  isApprovalStatusTerminal,
  isContractInTerminalState,
} from '@finos/legend-extension-dsl-data-product';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
  generatePermitDataAccessRequestPagePath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
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
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myClosedContracts.length === 0 && closedContractsForOthers.length > 0,
    );

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

    const getInitialUserForViewer = (): string | undefined => {
      if (!selectedRow || selectedRow.kind !== ROW_KIND_CONTRACT) {
        return undefined;
      }
      const contract = selectedRow.data.contractResultLite;
      const currentUser =
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser;
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
              return params.data.data instanceof
                V1_LiteDataContractWithUserStatus
                ? params.data.data.status
                : params.data.data.contractResultLite.state;
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
            defaultColDef={defaultColDef}
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
            onClose={() => setSelectedRow(undefined)}
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
