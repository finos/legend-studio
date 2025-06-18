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
  V1_AccessPointGroupReference,
  type V1_DataContract,
  type V1_UserPendingContractsRecord,
  V1_AdhocTeam,
} from '@finos/legend-graph';
import {
  DataGrid,
  type DataGridCellClickedEvent,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { Box, Link, Popover } from '@mui/material';
import { useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import { stringifyOrganizationalScope } from '../../../stores/lakehouse/LakehouseUtils.js';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';

const MultiUserCellRenderer = (props: {
  userIds: string[];
  marketplaceStore: LegendMarketplaceBaseStore;
}): React.ReactNode => {
  const { userIds, marketplaceStore } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (userIds.length === 1) {
    return (
      <UserRenderer
        userId={userIds[0]}
        marketplaceStore={marketplaceStore}
        className="marketplace-lakehouse-entitlements__grid__user-display"
      />
    );
  } else {
    return (
      <>
        <Link
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="marketplace-lakehouse-entitlements__grid__multi-user__link"
        >
          {userIds.length} Users
        </Link>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box className="marketplace-lakehouse-entitlements__grid__multi-user__popover">
            {userIds.map((userId) => (
              <UserRenderer
                key={userId}
                userId={userId}
                marketplaceStore={marketplaceStore}
              />
            ))}
          </Box>
        </Popover>
      </>
    );
  }
};

export const EntitlementsPendingContractsDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { pendingContracts, allContracts } = dashboardState;

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();

    const handleCellClicked = (
      event: DataGridCellClickedEvent<V1_UserPendingContractsRecord>,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'assignees'
      ) {
        const contract = allContracts?.find(
          (_contract) => _contract.guid === event.data?.contractId,
        );
        setSelectedContract(contract);
      }
    };

    const defaultColDef: DataGridColumnDefinition<V1_UserPendingContractsRecord> =
      {
        minWidth: 50,
        sortable: true,
        resizable: true,
        flex: 1,
      };

    const colDefs: DataGridColumnDefinition<V1_UserPendingContractsRecord>[] = [
      {
        headerName: 'Target User',
        colId: 'targetUser',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const consumer = allContracts?.find(
            (contract) => contract.guid === params.data?.contractId,
          )?.consumer;

          if (consumer instanceof V1_AdhocTeam) {
            return (
              <MultiUserCellRenderer
                userIds={consumer.users.map((user) => user.name)}
                marketplaceStore={marketplaceBaseStore}
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
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const requester = allContracts?.find(
            (contract) => contract.guid === params.data?.contractId,
          )?.createdBy;
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
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const resource = allContracts?.find(
            (contract) => contract.guid === params.data?.contractId,
          )?.resource;
          const dataProduct =
            resource instanceof V1_AccessPointGroupReference
              ? resource.dataProduct
              : undefined;
          return <>{dataProduct?.name ?? 'Unknown'}</>;
        },
      },
      {
        headerName: 'Target Access Point Group',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const resource = allContracts?.find(
            (contract) => contract.guid === params.data?.contractId,
          )?.resource;
          const accessPointGroup =
            resource instanceof V1_AccessPointGroupReference
              ? resource.accessPointGroup
              : undefined;
          return <>{accessPointGroup ?? 'Unknown'}</>;
        },
      },
      {
        headerName: 'State',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const contract = allContracts?.find(
            (_contract) => _contract.guid === params.data?.contractId,
          );
          return <>{contract?.state ?? 'Unknown'}</>;
        },
      },
      {
        headerName: 'Business Justification',
        valueGetter: (p) => p.data?.contractDescription,
      },
      {
        headerName: 'Assignees',
        colId: 'assignees',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const assignees = params.data?.pendingTaskWithAssignees.assignee;
          return assignees ? (
            <MultiUserCellRenderer
              userIds={assignees}
              marketplaceStore={marketplaceBaseStore}
            />
          ) : (
            <>Unknown</>
          );
        },
      },
      {
        hide: true,
        headerName: 'Contract ID',
        valueGetter: (p) => p.data?.contractId,
      },
      {
        hide: true,
        headerName: 'Pending Task ID',
        valueGetter: (p) => p.data?.pendingTaskWithAssignees.taskId,
      },
    ];

    return (
      <Box className="marketplace-lakehouse-entitlements__pending-contracts">
        <Box className="marketplace-lakehouse-entitlements__pending-contracts__grid ag-theme-balham">
          {pendingContracts ? (
            <DataGrid
              rowData={pendingContracts}
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={colDefs}
              onCellClicked={handleCellClicked}
              defaultColDef={defaultColDef}
              rowHeight={45}
            />
          ) : (
            <>You have no pending contracts</>
          )}
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
