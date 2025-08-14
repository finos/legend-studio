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
  type V1_ContractUserEventRecord,
  type V1_EnrichedUserApprovalStatus,
  type V1_LiteDataContract,
  V1_AdhocTeam,
  V1_ContractUserStatusResponseModelSchema,
  V1_ResourceType,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { Box, FormControlLabel, Switch, Tooltip } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from '../../../components/DataContractViewer/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
  isContractInTerminalState,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { lodashCapitalize } from '@finos/legend-shared';
import { MultiUserCellRenderer } from '../../../components/MultiUserCellRenderer/MultiUserCellRenderer.js';
import { useAuth } from 'react-oidc-context';
import { deserialize } from 'serializr';
import { InfoCircleIcon } from '@finos/legend-art';

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
      V1_LiteDataContract | undefined
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
      event: DataGridCellClickedEvent<V1_LiteDataContract>,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'actioner'
      ) {
        setSelectedContract(event.data);
      }
    };

    const defaultColDef: DataGridColumnDefinition<V1_LiteDataContract> = {
      minWidth: 50,
      sortable: true,
      resizable: true,
      flex: 1,
    };

    const colDefs: DataGridColumnDefinition<V1_LiteDataContract>[] = [
      {
        colId: 'consumerType',
        headerName: 'Consumer Type',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_ContractUserEventRecord>,
        ) => {
          const consumer = params.data?.consumer;
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
        headerName: 'Target User',
        colId: 'targetUser',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_LiteDataContract>,
        ) => {
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
        cellRenderer: (
          params: DataGridCellRendererParams<V1_LiteDataContract>,
        ) => {
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
          return params.data?.resourceId ?? 'Unknown';
        },
      },
      {
        headerName: 'Target Access Point Group',
        valueGetter: (params) => {
          const accessPointGroup =
            params.data?.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
              ? params.data.accessPointGroup
              : `${params.data?.accessPointGroup ?? 'Unknown'} (${params.data?.resourceType ?? 'Unknown Type'})`;
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
            onCellClicked={(
              event: DataGridCellClickedEvent<V1_LiteDataContract>,
            ) =>
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
            legendMarketplaceStore={marketplaceBaseStore}
            onClose={() => setSelectedContract(undefined)}
          />
        )}
      </Box>
    );
  },
);
