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
  type V1_UserPendingContractsRecord,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ContractState,
  V1_deserializeTaskResponse,
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
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';
import { startCase } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { MultiUserCellRenderer } from '../../../components/MultiUserCellRenderer/MultiUserCellRenderer.js';

const AssigneesCellRenderer = (props: {
  dataContract: V1_DataContract | undefined;
  pendingContractRecords: V1_UserPendingContractsRecord[] | undefined;
  marketplaceStore: LegendMarketplaceBaseStore;
  token: string | undefined;
}): React.ReactNode => {
  const { dataContract, pendingContractRecords, marketplaceStore, token } =
    props;
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAssignees = async () => {
      if (dataContract) {
        setLoading(true);
        try {
          const rawTasks =
            await marketplaceStore.lakehouseContractServerClient.getContractTasks(
              dataContract.guid,
              token,
            );
          const tasks = V1_deserializeTaskResponse(rawTasks);
          const privilegeManagerApprovalTask = tasks.find(
            (task) =>
              task.rec.type ===
              V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          );
          const dataOwnerApprovalTask = tasks.find(
            (task) => task.rec.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
          );
          const currentTask =
            dataContract.state ===
            V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL
              ? privilegeManagerApprovalTask
              : dataContract.state ===
                  V1_ContractState.PENDING_DATA_OWNER_APPROVAL
                ? dataOwnerApprovalTask
                : undefined;
          setAssignees(currentTask?.assignees ?? []);
        } finally {
          setLoading(false);
        }
      }
    };

    const pendingContractRecord = pendingContractRecords?.find(
      (record) => record.contractId === dataContract?.guid,
    );

    if (pendingContractRecord) {
      setAssignees(pendingContractRecord.pendingTaskWithAssignees.assignees);
    } else {
      // eslint-disable-next-line no-void
      void fetchAssignees();
    }
  }, [
    dataContract,
    marketplaceStore.lakehouseContractServerClient,
    token,
    pendingContractRecords,
  ]);

  return loading ? (
    <CircularProgress size={20} />
  ) : assignees.length > 0 ? (
    <MultiUserCellRenderer
      userIds={assignees}
      marketplaceStore={marketplaceStore}
      singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
    />
  ) : (
    <>Unknown</>
  );
};

export const EntitlementsPendingContractsDashbaord = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { pendingContracts: pendingContractRecords, allContracts } =
      dashboardState;

    const pendingContracts =
      allContracts?.filter((contract) =>
        pendingContractRecords?.some(
          (pendingContract) => pendingContract.contractId === contract.guid,
        ),
      ) ?? [];
    const pendingContractsForOthers =
      allContracts?.filter(
        (contract) =>
          contract.createdBy ===
            dashboardState.lakehouseEntitlementsStore.applicationStore
              .identityService.currentUser &&
          !isContractInTerminalState(contract) &&
          !pendingContracts.includes(contract),
      ) ?? [];

    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      pendingContracts.length === 0 && pendingContractsForOthers.length > 0,
    );
    const auth = useAuth();

    const handleCellClicked = (
      event: DataGridCellClickedEvent<V1_DataContract>,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'assignees'
      ) {
        setSelectedContract(event.data);
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
          const state = params.data?.state;
          switch (state) {
            case V1_ContractState.PENDING_DATA_OWNER_APPROVAL:
              return <>Data Owner Approval</>;
            case V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL:
              return <>Privilege Manager Approval</>;
            default:
              return <>{state ? startCase(state) : 'Unknown'}</>;
          }
        },
      },
      {
        headerName: 'Business Justification',
        valueGetter: (p) => p.data?.description,
      },
      {
        headerName: 'Assignees',
        colId: 'assignees',
        cellRenderer: (params: DataGridCellRendererParams<V1_DataContract>) => (
          <AssigneesCellRenderer
            dataContract={params.data}
            pendingContractRecords={pendingContractRecords}
            marketplaceStore={marketplaceBaseStore}
            token={auth.user?.access_token}
          />
        ),
      },
      {
        hide: true,
        headerName: 'Contract ID',
        valueGetter: (p) => p.data?.guid,
      },
    ];

    return (
      <Box className="marketplace-lakehouse-entitlements__pending-contracts">
        <Box className="marketplace-lakehouse-entitlements__pending-contracts__action-btns">
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
        <Box className="marketplace-lakehouse-entitlements__pending-contracts__grid ag-theme-balham">
          <DataGrid
            rowData={
              showForOthers
                ? [...pendingContracts, ...pendingContractsForOthers]
                : pendingContracts
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
            overlayNoRowsTemplate="You have no pending contracts"
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
