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
  type V1_EnrichedUserApprovalStatus,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ContractUserStatusResponseModelSchema,
  V1_dataContractsResponseModelSchemaToContracts,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { Box, FormControlLabel, Switch } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import {
  getOrganizationalScopeTypeName,
  isContractInTerminalState,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { lodashCapitalize } from '@finos/legend-shared';
import { MultiUserCellRenderer } from '../../../components/MultiUserCellRenderer/MultiUserCellRenderer.js';
import { useAuth } from 'react-oidc-context';
import { deserialize } from 'serializr';

export const EntitlementsClosedContractsDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { allContracts } = dashboardState;
    const auth = useAuth();

    const closedContracts = useMemo(
      () =>
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
        ) ?? [],
      [
        allContracts,
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser,
      ],
    );
    const closedContractsForOthers = useMemo(
      () =>
        allContracts?.filter(
          (contract) =>
            isContractInTerminalState(contract) &&
            contract.createdBy ===
              dashboardState.lakehouseEntitlementsStore.applicationStore
                .identityService.currentUser &&
            !closedContracts.includes(contract),
        ) ?? [],
      [allContracts, closedContracts, dashboardState],
    );

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      closedContracts.length === 0 && closedContractsForOthers.length > 0,
    );
    const [contractUserStatus, setContractUserStatus] = useState<
      Map<string, V1_EnrichedUserApprovalStatus | undefined>
    >(new Map<string, V1_EnrichedUserApprovalStatus>());

    useEffect(() => {
      const fetchUserStatusesByContractId = async (): Promise<void> => {
        const userStatusesByContractId: [
          string,
          V1_EnrichedUserApprovalStatus | undefined,
        ][] = await Promise.all(
          closedContracts.map(async (contract) => {
            const rawUserStatus =
              await dashboardState.lakehouseEntitlementsStore.lakehouseServerClient.getContractUserStatus(
                contract.guid,
                dashboardState.lakehouseEntitlementsStore.applicationStore
                  .identityService.currentUser,
                auth.user?.access_token,
              );
            const userStatus = deserialize(
              V1_ContractUserStatusResponseModelSchema,
              rawUserStatus,
            ).status;
            return [contract.guid, userStatus];
          }),
        );
        setContractUserStatus(
          new Map<string, V1_EnrichedUserApprovalStatus | undefined>(
            userStatusesByContractId,
          ),
        );
      };

      // eslint-disable-next-line no-void
      void fetchUserStatusesByContractId();
    }, [auth.user?.access_token, closedContracts, dashboardState]);

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
            await dashboardState.lakehouseEntitlementsStore.lakehouseServerClient.getDataContract(
              event.data.guid,
              auth.user?.access_token,
            );
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
        colId: 'consumerType',
        headerName: 'Consumer Type',
        valueGetter: (params) => {
          const consumer = params.data?.consumer;
          return consumer
            ? getOrganizationalScopeTypeName(
                consumer,
                dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
              )
            : 'Unknown';
        },
      },
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
        valueGetter: (params) => {
          const resource = params.data?.resource;
          const dataProduct =
            resource instanceof V1_AccessPointGroupReference
              ? resource.dataProduct
              : undefined;
          return dataProduct?.name ?? 'Unknown';
        },
      },
      {
        headerName: 'Target Access Point Group',
        valueGetter: (params) => {
          const resource = params.data?.resource;
          const accessPointGroup =
            resource instanceof V1_AccessPointGroupReference
              ? resource.accessPointGroup
              : undefined;
          return accessPointGroup ?? 'Unknown';
        },
      },
      {
        headerName: 'State',
        valueGetter: (p) =>
          p.data?.guid
            ? lodashCapitalize(
                contractUserStatus.get(p.data.guid) ?? p.data.state,
              )
            : 'Unknown',
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
            onCellClicked={(event: DataGridCellClickedEvent<V1_DataContract>) =>
              // eslint-disable-next-line no-void
              void handleCellClicked(event)
            }
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
