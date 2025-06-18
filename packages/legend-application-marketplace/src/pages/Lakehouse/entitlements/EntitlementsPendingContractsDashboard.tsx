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
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridRowClickedEvent,
} from '@finos/legend-lego/data-grid';
import { Box } from '@mui/material';
import { useState } from 'react';
import type { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import { stringifyOrganizationalScope } from '../../../stores/lakehouse/LakehouseUtils.js';

export const EntitlementsPendingContractsDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { pendingContracts, allContracts } = dashboardState;

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();

    const handleRowClicked = (
      event: DataGridRowClickedEvent<V1_UserPendingContractsRecord>,
    ) => {
      setSelectedContract(
        allContracts?.find(
          (contract) => contract.guid === event.data?.contractId,
        ),
      );
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
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const consumer = allContracts?.find(
            (contract) => contract.guid === params.data?.contractId,
          )?.consumer;
          if (consumer instanceof V1_AdhocTeam) {
            return consumer.users.map((user) => (
              <UserRenderer
                key={user.name}
                userId={user.name}
                marketplaceStore={marketplaceBaseStore}
                className="marketplace-lakehouse-entitlements__grid__user-display"
              />
            ));
          } else if (consumer) {
            return <>{stringifyOrganizationalScope(consumer)}</>;
          } else {
            return <>Unknown</>;
          }
        },
      },
      {
        headerName: 'Requester',
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
        headerName: 'Business Justification',
        valueGetter: (p) => p.data?.contractDescription,
      },
      {
        headerName: 'Assignes',
        cellRenderer: (
          params: DataGridCellRendererParams<V1_UserPendingContractsRecord>,
        ) => {
          const assignees = params.data?.pendingTaskWithAssignees.assignee;
          return assignees ? (
            assignees.map((assignee) => (
              <UserRenderer
                key={assignee}
                userId={assignee}
                marketplaceStore={marketplaceBaseStore}
                className="marketplace-lakehouse-entitlements__grid__user-display"
              />
            ))
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
      <>
        <Box className="marketplace-lakehouse-entitlements__pending-contracts">
          {pendingContracts ? (
            <DataGrid
              rowData={pendingContracts}
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={colDefs}
              onRowClicked={handleRowClicked}
              defaultColDef={defaultColDef}
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
      </>
    );
  },
);
