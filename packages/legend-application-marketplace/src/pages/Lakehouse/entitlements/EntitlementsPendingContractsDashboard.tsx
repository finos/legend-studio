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
  type V1_LiteDataContract,
  type V1_UserPendingContractsRecord,
  V1_AdhocTeam,
  V1_ContractState,
  V1_deserializeTaskResponse,
  V1_ResourceType,
  V1_UserApprovalStatus,
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
import { assertErrorThrown, startCase } from '@finos/legend-shared';
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
} from '@finos/legend-extension-dsl-data-product';
import {
  generateLakehouseTaskPath,
  generateLakehouseDataProductPath,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { LakehouseEntitlementsStore } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';

const AssigneesCellRenderer = (props: {
  dataContract: V1_LiteDataContract | undefined;
  pendingContractRecords: V1_UserPendingContractsRecord[] | undefined;
  entitlementsStore: LakehouseEntitlementsStore;
  token: string | undefined;
}): React.ReactNode => {
  const { dataContract, pendingContractRecords, entitlementsStore, token } =
    props;
  const pendingContractRecord = pendingContractRecords?.find(
    (record) => record.contractId === dataContract?.guid,
  );
  const [assignees, setAssignees] = useState<string[]>(
    pendingContractRecord?.pendingTaskWithAssignees.assignees ??
      entitlementsStore.contractIdToAssigneesMap.get(
        dataContract?.guid ?? '',
      ) ??
      [],
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAssignees = async () => {
      if (dataContract) {
        setLoading(true);
        try {
          const rawTasks =
            await entitlementsStore.lakehouseContractServerClient.getContractTasks(
              dataContract.guid,
              token,
            );
          const tasks = V1_deserializeTaskResponse(rawTasks);
          const pendingTasks = tasks.filter(
            (task) => task.rec.status === V1_UserApprovalStatus.PENDING,
          );
          const pendingAssignees = Array.from(
            new Set<string>(pendingTasks.map((task) => task.assignees).flat()),
          );
          setAssignees(pendingAssignees);
          entitlementsStore.contractIdToAssigneesMap.set(
            dataContract.guid,
            pendingAssignees,
          );
        } catch (error) {
          assertErrorThrown(error);
          entitlementsStore.applicationStore.notificationService.notifyError(
            `Error fetching contact assignees: ${error.message}`,
          );
        } finally {
          setLoading(false);
        }
      }
    };

    if (assignees.length === 0) {
      // eslint-disable-next-line no-void
      void fetchAssignees();
    }
  }, [
    assignees.length,
    dataContract,
    entitlementsStore.applicationStore.notificationService,
    entitlementsStore.contractIdToAssigneesMap,
    entitlementsStore.lakehouseContractServerClient,
    token,
  ]);

  return loading ? (
    <CircularProgress size={20} />
  ) : assignees.length > 0 ? (
    <MultiUserRenderer
      userIds={assignees}
      applicationStore={entitlementsStore.applicationStore}
      userSearchService={
        entitlementsStore.marketplaceBaseStore.userSearchService
      }
      singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
    />
  ) : (
    <>Unknown</>
  );
};

const TargetUserCellRenderer = observer(
  (props: {
    dataContract: V1_LiteDataContract | undefined;
    entitlementsStore: LakehouseEntitlementsStore;
    token: string | undefined;
  }): React.ReactNode => {
    const { dataContract, entitlementsStore, token } = props;
    const [targetUsers, setTargetUsers] = useState<string[]>(
      entitlementsStore.contractIdToTargetUsersMap.get(
        dataContract?.guid ?? '',
      ) ?? [],
    );
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
      const fetchTargetUsers = async () => {
        if (dataContract) {
          setLoading(true);
          try {
            // We try to get the target users from the associated tasks first, since the
            // tasks are what drive the timeline view. If there are no associated tasks,
            // then we use the contract consumer.
            const rawTasks =
              await entitlementsStore.lakehouseContractServerClient.getContractTasks(
                dataContract.guid,
                token,
              );
            const tasks = V1_deserializeTaskResponse(rawTasks);
            const taskTargetUsers = Array.from(
              new Set<string>(tasks.map((task) => task.rec.consumer)),
            );
            const _targetUsers = taskTargetUsers.length
              ? taskTargetUsers
              : dataContract.consumer instanceof V1_AdhocTeam
                ? dataContract.consumer.users.map((user) => user.name)
                : [];
            setTargetUsers(_targetUsers);
            entitlementsStore.contractIdToTargetUsersMap.set(
              dataContract.guid,
              _targetUsers,
            );
          } catch (error) {
            assertErrorThrown(error);
            entitlementsStore.applicationStore.notificationService.notifyError(
              `Error fetching contact target users: ${error.message}`,
            );
          } finally {
            setLoading(false);
          }
        }
      };
      if (targetUsers.length === 0) {
        // eslint-disable-next-line no-void
        void fetchTargetUsers();
      }
    }, [dataContract, entitlementsStore, targetUsers.length, token]);

    return loading ? (
      <CircularProgress size={20} />
    ) : targetUsers.length > 0 ? (
      <MultiUserRenderer
        userIds={targetUsers}
        applicationStore={entitlementsStore.applicationStore}
        userSearchService={
          entitlementsStore.marketplaceBaseStore.userSearchService
        }
        singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
      />
    ) : (
      <>Unknown</>
    );
  },
);

export const EntitlementsPendingContractsDashboard = observer(
  (props: { dashboardState: EntitlementsDashboardState }): React.ReactNode => {
    const { dashboardState } = props;
    const { pendingContracts, allContracts } = dashboardState;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const auth = useAuth();

    const myPendingContracts = useMemo(
      () =>
        allContracts?.filter((contract) =>
          pendingContracts?.some(
            (pendingContract) => pendingContract.contractId === contract.guid,
          ),
        ) ?? [],
      [allContracts, pendingContracts],
    );
    const pendingContractsForOthers = useMemo(
      () =>
        allContracts?.filter(
          (contract) =>
            contract.createdBy ===
              dashboardState.lakehouseEntitlementsStore.applicationStore
                .identityService.currentUser &&
            !isContractInTerminalState(contract) &&
            !myPendingContracts.includes(contract),
        ) ?? [],
      [
        allContracts,
        dashboardState.lakehouseEntitlementsStore.applicationStore
          .identityService.currentUser,
        myPendingContracts,
      ],
    );

    const [selectedContract, setSelectedContract] = useState<
      V1_LiteDataContract | undefined
    >();
    const [showForOthers, setShowForOthers] = useState<boolean>(
      myPendingContracts.length === 0 && pendingContractsForOthers.length > 0,
    );

    const handleCellClicked = (
      event: DataGridCellClickedEvent<V1_LiteDataContract>,
    ) => {
      if (
        event.colDef.colId !== 'targetUser' &&
        event.colDef.colId !== 'requester' &&
        event.colDef.colId !== 'assignees'
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
          headerName: 'Target User(s)',
          colId: 'targetUser',
          cellRenderer: (
            params: DataGridCellRendererParams<V1_LiteDataContract>,
          ) => (
            <TargetUserCellRenderer
              dataContract={params.data}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
              token={auth.user?.access_token}
            />
          ),
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
          valueGetter: (params) => {
            const state = params.data?.state;
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
          valueGetter: (p) => p.data?.description,
        },
        {
          headerName: 'Assignees',
          colId: 'assignees',
          cellRenderer: (
            params: DataGridCellRendererParams<V1_LiteDataContract>,
          ) => (
            <AssigneesCellRenderer
              dataContract={params.data}
              pendingContractRecords={pendingContracts}
              entitlementsStore={dashboardState.lakehouseEntitlementsStore}
              token={auth.user?.access_token}
            />
          ),
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
        pendingContracts,
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
