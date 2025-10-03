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
import {
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { assertErrorThrown, lodashCapitalize } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { deserialize } from 'serializr';
import { InfoCircleIcon } from '@finos/legend-art';
import {
  EntitlementsDataContractViewer,
  EntitlementsDataContractViewerState,
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
  isContractInTerminalState,
  MultiUserRenderer,
  stringifyOrganizationalScope,
  UserRenderer,
} from '@finos/legend-extension-dsl-data-product';
import {
  generateLakehouseDataProductPath,
  generateLakehouseTaskPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { LakehouseEntitlementsStore } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';

const UserAccessStatusCellRenderer = (props: {
  dataContract: V1_LiteDataContract | undefined;
  entitlementsStore: LakehouseEntitlementsStore;
  token: string | undefined;
}): React.ReactNode => {
  const { dataContract, entitlementsStore, token } = props;
  const [status, setStatus] = useState<
    V1_EnrichedUserApprovalStatus | undefined
  >(
    dataContract
      ? entitlementsStore.contractIdToUserStatusMap.get(dataContract.guid)
      : undefined,
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserStatusByContractId = async (): Promise<void> => {
      if (dataContract) {
        setLoading(true);
        try {
          const rawUserStatus =
            await entitlementsStore.lakehouseContractServerClient.getContractUserStatus(
              dataContract.guid,
              entitlementsStore.applicationStore.identityService.currentUser,
              token,
            );
          const userStatus = deserialize(
            V1_ContractUserStatusResponseModelSchema,
            rawUserStatus,
          ).status;
          setStatus(userStatus);
          entitlementsStore.contractIdToUserStatusMap.set(
            dataContract.guid,
            userStatus,
          );
        } catch (error) {
          assertErrorThrown(error);
          entitlementsStore.applicationStore.notificationService.notifyError(
            `Error fetching contact user access status: ${error.message}`,
          );
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === undefined) {
      // eslint-disable-next-line no-void
      void fetchUserStatusByContractId();
    }
  }, [
    dataContract,
    entitlementsStore.applicationStore.identityService.currentUser,
    entitlementsStore.applicationStore.notificationService,
    entitlementsStore.contractIdToUserStatusMap,
    entitlementsStore.lakehouseContractServerClient,
    status,
    token,
  ]);

  return loading ? (
    <CircularProgress size={20} />
  ) : (
    lodashCapitalize(status ?? dataContract?.state ?? 'Unknown')
  );
};

export const EntitlementsClosedContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { allContracts } = dashboardState;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const auth = useAuth();

    const myClosedContracts = useMemo(
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
            !myClosedContracts.includes(contract),
        ) ?? [],
      [allContracts, myClosedContracts, dashboardState],
    );

    const [selectedContract, setSelectedContract] = useState<
      V1_LiteDataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myClosedContracts.length === 0 && closedContractsForOthers.length > 0,
    );

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

    const defaultColDef: DataGridColumnDefinition<V1_LiteDataContract> =
      useMemo(
        () => ({
          minWidth: 50,
          sortable: true,
          resizable: true,
          flex: 1,
        }),
        [],
      );

    const colDefs: DataGridColumnDefinition<V1_LiteDataContract>[] = useMemo(
      () => [
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
                <MultiUserRenderer
                  userIds={consumer.users.map((user) => user.name)}
                  applicationStore={marketplaceBaseStore.applicationStore}
                  userSearchService={marketplaceBaseStore.userSearchService}
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
                applicationStore={marketplaceBaseStore.applicationStore}
                userSearchService={marketplaceBaseStore.userSearchService}
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
          cellRenderer: (
            params: DataGridCellRendererParams<V1_LiteDataContract>,
          ) => (
            <UserAccessStatusCellRenderer
              dataContract={params.data}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
              token={auth.user?.access_token}
            />
          ),
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
      ],
      [
        auth.user?.access_token,
        dashboardState.lakehouseEntitlementsStore,
        marketplaceBaseStore.applicationStore,
        marketplaceBaseStore.userSearchService,
      ],
    );

    const gridRowData = useMemo(
      () =>
        showForOthers
          ? [...myClosedContracts, ...closedContractsForOthers]
          : myClosedContracts,
      [myClosedContracts, closedContractsForOthers, showForOthers],
    );

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
            rowData={gridRowData}
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
            onClose={() => setSelectedContract(undefined)}
            currentViewer={
              new EntitlementsDataContractViewerState(
                selectedContract,
                marketplaceBaseStore.applicationStore,
                marketplaceBaseStore.lakehouseContractServerClient,
                marketplaceBaseStore.userSearchService,
              )
            }
            getContractTaskUrl={(taskId: string) =>
              marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                generateLakehouseTaskPath(taskId),
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
