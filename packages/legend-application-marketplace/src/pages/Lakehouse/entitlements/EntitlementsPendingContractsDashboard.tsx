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
  type V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
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
  FormGroup,
  Switch,
  Tooltip,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type {
  ContractCreatedByUserDetails,
  EntitlementsDashboardState,
} from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { startCase } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { InfoCircleIcon } from '@finos/legend-art';
import {
  MultiUserRenderer,
  isContractInTerminalState,
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  UserRenderer,
  EntitlementsDataContractViewer,
  EntitlementsDataContractViewerState,
  isApprovalStatusTerminal,
} from '@finos/legend-extension-dsl-data-product';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { LakehouseEntitlementsStore } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { flowResult } from 'mobx';
import { formatOrderDate } from '../../../stores/orders/OrderHelpers.js';

const AssigneesCellRenderer = (props: {
  dataContract:
    | V1_LiteDataContractWithUserStatus
    | ContractCreatedByUserDetails
    | undefined;
  entitlementsStore: LakehouseEntitlementsStore;
}): React.ReactNode => {
  const { dataContract, entitlementsStore } = props;

  const assignees =
    (dataContract instanceof V1_LiteDataContractWithUserStatus
      ? dataContract.pendingTaskWithAssignees?.assignees?.toSorted()
      : dataContract?.sortedAssigneeIds) ?? [];

  return (
    <MultiUserRenderer
      userIds={assignees}
      applicationStore={entitlementsStore.applicationStore}
      userSearchService={
        entitlementsStore.marketplaceBaseStore.userSearchService
      }
      singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
    />
  );
};

const TargetUserCellRenderer = observer(
  (props: {
    dataContract:
      | V1_LiteDataContractWithUserStatus
      | ContractCreatedByUserDetails
      | undefined;
    entitlementsStore: LakehouseEntitlementsStore;
  }): React.ReactNode => {
    const { dataContract, entitlementsStore } = props;

    const userIds =
      dataContract instanceof V1_LiteDataContractWithUserStatus
        ? [dataContract.user]
        : (dataContract?.sortedMemberIds ?? []);

    return (
      <MultiUserRenderer
        userIds={userIds}
        applicationStore={entitlementsStore.applicationStore}
        userSearchService={
          entitlementsStore.marketplaceBaseStore.userSearchService
        }
        singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
      />
    );
  },
);

export const EntitlementsPendingContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { allContractsForUser, allContractsCreatedByUser } = dashboardState;
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
        Array.from(allContractsCreatedByUser.values())?.filter(
          (contract) =>
            !isContractInTerminalState(contract.contractResultLite) &&
            !myPendingContractIds.has(contract.contractResultLite.guid),
        ) ?? [],
      [allContractsCreatedByUser, myPendingContractIds],
    );

    const [selectedContract, setSelectedContract] = useState<
      V1_LiteDataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myPendingContracts.length === 0 && pendingContractsForOthers.length > 0,
    );

    const handleCellClicked = (
      event: DataGridCellClickedEvent<
        V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
      >,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'assignees'
      ) {
        setSelectedContract(event.data?.contractResultLite);
      }
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
        {
          headerName: 'Date Created',
          colId: 'dateCreated',
          valueGetter: (params) => {
            return formatOrderDate(params.data?.createdAt) ?? 'Unknown';
          },
          sort: 'desc',
          comparator: (_, __, val1, val2) => {
            const dateA = val1.data?.createdAt
              ? new Date(val1.data.createdAt).getTime()
              : 0;
            const dateB = val2.data?.createdAt
              ? new Date(val2.data.createdAt).getTime()
              : 0;
            return dateA - dateB;
          },
        },
        {
          colId: 'consumerType',
          headerName: 'Consumer Type',
          valueGetter: (params) => {
            const consumer = params.data?.contractResultLite.consumer;
            const typeName = consumer
              ? getOrganizationalScopeTypeName(
                  consumer,
                  dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
                )
              : undefined;
            return typeName ?? 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<
              V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
            >,
          ) => {
            const consumer = params.data?.contractResultLite.consumer;
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
          headerName: 'Target User(s)',
          colId: 'targetUser',
          valueGetter: (params) => {
            const userIds =
              params.data instanceof V1_LiteDataContractWithUserStatus
                ? [params.data.user]
                : (params.data?.sortedMemberIds ?? []);
            return userIds.length > 0 ? userIds.join(', ') : 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<
              V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
            >,
          ) => (
            <TargetUserCellRenderer
              dataContract={params.data}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
            />
          ),
        },
        {
          headerName: 'Requester',
          colId: 'requester',
          valueGetter: (params) =>
            params.data?.contractResultLite.createdBy ?? 'Unknown',
          cellRenderer: (
            params: DataGridCellRendererParams<
              V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
            >,
          ) => {
            const requester = params.data?.contractResultLite.createdBy;
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
            return params.data?.contractResultLite.resourceId ?? 'Unknown';
          },
        },
        {
          headerName: 'Target Access Point Group',
          valueGetter: (params) => {
            const accessPointGroup =
              params.data?.contractResultLite.resourceType ===
              V1_ResourceType.ACCESS_POINT_GROUP
                ? params.data.contractResultLite.accessPointGroup
                : `${params.data?.contractResultLite.accessPointGroup ?? 'Unknown'} (${params.data?.contractResultLite.resourceType ?? 'Unknown Type'})`;
            return accessPointGroup ?? 'Unknown';
          },
        },
        {
          headerName: 'State',
          valueGetter: (params) => {
            const state = params.data?.contractResultLite.state;
            switch (state) {
              case V1_ContractState.PENDING_DATA_OWNER_APPROVAL:
                return 'Data Owner Approval';
              case V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL:
                return 'Privilege Manager Approval';
              default:
                return state ? startCase(state) : 'Unknown';
            }
          },
        },
        {
          headerName: 'Business Justification',
          valueGetter: (p) => p.data?.contractResultLite.description,
        },
        {
          headerName: 'Assignees',
          colId: 'assignees',
          valueGetter: (params) => {
            const assignees =
              (params.data instanceof V1_LiteDataContractWithUserStatus
                ? params.data.pendingTaskWithAssignees?.assignees?.toSorted()
                : params.data?.sortedAssigneeIds) ?? [];
            return assignees.length > 0 ? assignees.join(', ') : 'Unknown';
          },
          cellRenderer: (
            params: DataGridCellRendererParams<
              V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
            >,
          ) => (
            <AssigneesCellRenderer
              dataContract={params.data}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
            />
          ),
        },
        {
          hide: true,
          headerName: 'Contract ID',
          valueGetter: (p) => p.data?.contractResultLite.guid,
        },
      ],
      [
        dashboardState.lakehouseEntitlementsStore,
        marketplaceBaseStore.applicationStore,
        marketplaceBaseStore.userSearchService,
      ],
    );

    const gridRowData = useMemo(
      () =>
        showForOthers
          ? [...myPendingContracts, ...pendingContractsForOthers]
          : myPendingContracts,
      [showForOthers, myPendingContracts, pendingContractsForOthers],
    );

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
            onCellClicked={handleCellClicked}
            defaultColDef={defaultColDef}
            rowHeight={45}
            overlayNoRowsTemplate="You have no pending contracts"
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
