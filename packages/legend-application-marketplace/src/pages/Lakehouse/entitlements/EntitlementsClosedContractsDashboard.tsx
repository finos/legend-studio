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
  type V1_DataContract,
  type V1_DataContractsResponse,
  type V1_UserApprovalStatus,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_dataContractsResponseModelSchemaToContracts,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { Box, CircularProgress, FormControlLabel, Switch } from '@mui/material';
import { useEffect, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import {
  isContractInTerminalState,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { startCase, type PlainObject } from '@finos/legend-shared';
import { MultiUserCellRenderer } from '../../../components/MultiUserCellRenderer/MultiUserCellRenderer.js';
import { useAuth } from 'react-oidc-context';

const ContractStateCellRenderer = (props: {
  contract: V1_DataContract;
  dashboardState: EntitlementsDashboardState;
}): React.ReactNode => {
  const { contract, dashboardState } = props;
  const auth = useAuth();
  const [userStatus, setUserStatus] = useState<
    V1_UserApprovalStatus | undefined
  >(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserStatus = async (): Promise<void> => {
      setLoading(true);
      try {
        const status =
          await dashboardState.lakehouseEntitlementsStore.lakehouseServerClient.getContractUserStatus(
            contract.guid,
            dashboardState.lakehouseEntitlementsStore.applicationStore
              .identityService.currentUser,
            auth.user?.access_token,
          );
        setUserStatus(status);
      } catch (error) {
        dashboardState.lakehouseEntitlementsStore.applicationStore.notificationService.notifyError(
          `Failed to fetch user status for contract ${contract.guid}: ${error}`,
        );
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line no-void
    void fetchUserStatus();
  }, [auth.user?.access_token, contract.guid, dashboardState]);

  if (loading) {
    return <CircularProgress size={20} />;
  } else if (userStatus === undefined) {
    return <>Unknown</>;
  } else {
    return <>{startCase(userStatus)}</>;
  }
};

export const EntitlementsClosedContractsDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { allContracts } = dashboardState;
    const auth = useAuth();

    const closedContracts =
      allContracts?.filter(
        (contract) =>
          isContractInTerminalState(contract) &&
          contract.consumer instanceof V1_AdhocTeam &&
          contract.consumer.users.some(
            (user) =>
              user.name ===
              dashboardState.lakehouseEntitlementsStore.applicationStore
                .identityService.currentUser,
          ),
      ) ?? [];
    const closedContractsForOthers =
      allContracts?.filter(
        (contract) =>
          isContractInTerminalState(contract) &&
          contract.createdBy ===
            dashboardState.lakehouseEntitlementsStore.applicationStore
              .identityService.currentUser &&
          !closedContracts.includes(contract),
      ) ?? [];

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      closedContracts.length === 0 && closedContractsForOthers.length > 0,
    );

    const handleCellClicked = async (
      event: DataGridCellClickedEvent<V1_DataContract>,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'actioner'
      ) {
        if (event.data) {
          const rawEnrichedContract =
            (await dashboardState.lakehouseEntitlementsStore.lakehouseServerClient.getDataContract(
              event.data?.guid,
              auth.user?.access_token,
            )) as PlainObject<V1_DataContractsResponse>;
          const enrichedContract =
            V1_dataContractsResponseModelSchemaToContracts(
              rawEnrichedContract,
              dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
            )[0];
          if (enrichedContract) {
            setSelectedContract(enrichedContract);
          }
        }
      }
    };

    const defaultColDef: DataGridColumnDefinition<V1_DataContract> = {
      minWidth: 50,
      sortable: true,
      resizable: true,
      flex: 1,
    };

    const colDefs: DataGridColumnDefinition<V1_DataContract>[] = [
      {
        headerName: 'Target User',
        colId: 'targetUser',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => {
          const consumer = params.data?.consumer;

          if (consumer instanceof V1_AdhocTeam) {
            return (
              <MultiUserCellRenderer
                userIds={consumer.users.map((user) => user.name)}
                marketplaceStore={marketplaceBaseStore}
                singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
              />
            );
          } else if (consumer) {
            return <>{stringifyOrganizationalScope(consumer)}</>;
          } else {
            return <>Unknown</>;
          }
        },
      },
      {
        headerName: 'Requester',
        colId: 'requester',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => {
          const requester = params.data?.createdBy;
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
        headerName: 'Target Data Product',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => {
          const resource = params.data?.resource;
          const dataProduct =
            resource instanceof V1_AccessPointGroupReference
              ? resource.dataProduct
              : undefined;
          return <>{dataProduct?.name ?? 'Unknown'}</>;
        },
      },
      {
        headerName: 'Target Access Point Group',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => {
          const resource = params.data?.resource;
          const accessPointGroup =
            resource instanceof V1_AccessPointGroupReference
              ? resource.accessPointGroup
              : undefined;
          return <>{accessPointGroup ?? 'Unknown'}</>;
        },
      },
      {
        headerName: 'State',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => {
          return params.data ? (
            <ContractStateCellRenderer
              contract={params.data}
              dashboardState={dashboardState}
            />
          ) : (
            <>Unknown</>
          );
        },
      },
      {
        headerName: 'Business Justification',
        valueGetter: (p) => p.data?.description,
      },
      {
        hide: true,
        headerName: 'Contract ID',
        valueGetter: (p) => p.data?.guid,
      },
    ];

    return (
      <Box className="marketplace-lakehouse-entitlements__completed-contracts">
        <Box className="marketplace-lakehouse-entitlements__completed-contracts__action-btns">
          <FormControlLabel
            control={
              <Switch
                checked={showForOthers}
                onChange={(event) => setShowForOthers(event.target.checked)}
              />
            }
            label="Show my requests for others"
          />
        </Box>
        <Box className="marketplace-lakehouse-entitlements__completed-contracts__grid ag-theme-balham">
          <DataGrid
            rowData={
              showForOthers
                ? [...closedContracts, ...closedContractsForOthers]
                : closedContracts
            }
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressContextMenu={false}
            columnDefs={colDefs}
            onCellClicked={handleCellClicked}
            defaultColDef={defaultColDef}
            rowHeight={45}
            overlayNoRowsTemplate="You have no closed contracts"
          />
        </Box>
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
      </Box>
    );
  },
);
