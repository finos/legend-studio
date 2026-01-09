import {
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  UserRenderer,
  MultiUserRenderer,
} from '@finos/legend-extension-dsl-data-product';
import {
  V1_LiteDataContractWithUserStatus,
  V1_ResourceType,
} from '@finos/legend-graph';
import type {
  DataGridCellRendererParams,
  DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import type {
  ContractCreatedByUserDetails,
  EntitlementsDashboardState,
} from '../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { formatOrderDate } from '../stores/orders/OrderHelpers.js';
import { InfoCircleIcon } from '@finos/legend-art';
import { Tooltip } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { LakehouseEntitlementsStore } from '../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';

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

export const getCommonEntitlementsColDefs = (
  dashboardState: EntitlementsDashboardState,
): DataGridColumnDefinition<
  V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails
>[] => [
  {
    headerName: 'Date Created',
    colId: 'dateCreated',
    valueGetter: (params) => {
      return (
        formatOrderDate(params.data?.contractResultLite.createdAt) ?? 'Unknown'
      );
    },
    sort: 'desc',
    comparator: (_, __, val1, val2) => {
      const dateA = val1.data?.contractResultLite.createdAt
        ? new Date(val1.data.contractResultLite.createdAt).getTime()
        : 0;
      const dateB = val2.data?.contractResultLite.createdAt
        ? new Date(val2.data.contractResultLite.createdAt).getTime()
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
          applicationStore={
            dashboardState.lakehouseEntitlementsStore.applicationStore
          }
          userSearchService={
            dashboardState.lakehouseEntitlementsStore.marketplaceBaseStore
              .userSearchService
          }
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
];
