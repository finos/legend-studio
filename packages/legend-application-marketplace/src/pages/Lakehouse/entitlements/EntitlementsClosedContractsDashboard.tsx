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
  type V1_LiteDataContract,
  GraphManagerState,
  V1_AdhocTeam,
  V1_LiteDataContractWithUserStatus,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
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
import type {
  ContractCreatedByUserDetails,
  EntitlementsDashboardState,
} from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { useAuth } from 'react-oidc-context';
import {
  EntitlementsDataContractViewer,
  EntitlementsDataContractViewerState,
  isApprovalStatusTerminal,
  isContractInTerminalState,
} from '@finos/legend-extension-dsl-data-product';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { flowResult } from 'mobx';
import { getCommonEntitlementsColDefs } from '../../../utils/EntitlementsUtils.js';

export const EntitlementsClosedContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { allContractsForUser, allContractsCreatedByUser } = dashboardState;
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
        allContractsCreatedByUser?.filter(
          (contract) =>
            isContractInTerminalState(contract.contractResultLite) &&
            !myClosedContractIds.has(contract.contractResultLite.guid),
        ) ?? [],
      [allContractsCreatedByUser, myClosedContractIds],
    );

    const [selectedContract, setSelectedContract] = useState<
      V1_LiteDataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myClosedContracts.length === 0 && closedContractsForOthers.length > 0,
    );

    const handleCellClicked = async (
      event: DataGridCellClickedEvent<
        V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
      >,
    ) => {
      setSelectedContract(event.data?.contractResultLite);
    };

    const defaultColDef: DataGridColumnDefinition<
      V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
    > = useMemo(
      () => ({
        minWidth: 50,
        sortable: true,
        resizable: true,
        flex: 1,
      }),
      [],
    );

    const colDefs: DataGridColumnDefinition<
      V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
    >[] = useMemo(
      () => [
        ...getCommonEntitlementsColDefs(dashboardState),
        {
          headerName: 'State',
          valueGetter: (params) =>
            params.data instanceof V1_LiteDataContractWithUserStatus
              ? params.data.status
              : (params.data?.contractResultLite.state ?? 'Unknown'),
        },
        {
          headerName: 'Business Justification',
          valueGetter: (p) => p.data?.contractResultLite.description,
        },
        {
          hide: true,
          headerName: 'Contract ID',
          valueGetter: (p) => p.data?.contractResultLite.guid,
        },
      ],
      [dashboardState],
    );

    const gridRowData = useMemo(
      () =>
        showForOthers
          ? [...myClosedContracts, ...closedContractsForOthers]
          : myClosedContracts,
      [myClosedContracts, closedContractsForOthers, showForOthers],
    );

    const getInitialUserForViewer = (): string | undefined => {
      const currentUser =
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser;
      if (selectedContract && myClosedContractIds.has(selectedContract.guid)) {
        return currentUser;
      }
      if (
        selectedContract &&
        selectedContract.consumer instanceof V1_AdhocTeam &&
        selectedContract.consumer.users.some(
          (user) => user.name === currentUser,
        )
      ) {
        return currentUser;
      }
      return undefined;
    };

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
            onCellClicked={(
              event: DataGridCellClickedEvent<
                V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
              >,
            ) =>
              // eslint-disable-next-line no-void
              void handleCellClicked(event)
            }
            defaultColDef={defaultColDef}
            rowHeight={45}
            overlayNoRowsTemplate="You have no closed contracts"
            loading={dashboardState.fetchingContractsForUserState.isInProgress}
            overlayLoadingTemplate="Loading contracts"
          />
        </Box>
        {selectedContract !== undefined && (
          <EntitlementsDataContractViewer
            open={true}
            onClose={() => setSelectedContract(undefined)}
            currentViewer={
              new EntitlementsDataContractViewerState(
                selectedContract,
                undefined,
                marketplaceBaseStore.applicationStore,
                marketplaceBaseStore.lakehouseContractServerClient,
                new GraphManagerState(
                  marketplaceBaseStore.applicationStore.pluginManager,
                  marketplaceBaseStore.applicationStore.logService,
                ),
                marketplaceBaseStore.userSearchService,
              )
            }
            initialSelectedUser={getInitialUserForViewer()}
            onRefresh={async () => {
              await flowResult(
                dashboardState.updateContract(
                  selectedContract.guid,
                  auth.user?.access_token,
                ),
              );
            }}
            getContractTaskUrl={(contractId: string, taskId: string) =>
              marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                generateContractPagePath(contractId, taskId),
              )
            }
            getDataProductUrl={(dataProductId: string, deploymentId: number) =>
              marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                generateLakehouseDataProductPath(dataProductId, deploymentId),
              )
            }
          />
        )}
      </Box>
    );
  },
);
