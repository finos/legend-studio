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
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  UserRenderer,
  MultiUserRenderer,
  stringifyOrganizationalScope,
} from '@finos/legend-extension-dsl-data-product';
import {
  V1_LiteDataContractWithUserStatus,
  V1_ResourceType,
  V1_AccessPointGroupReference,
  V1_RequestState,
  type V1_DataRequestWithWorkflow,
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

export const UNKNOWN = 'Unknown';
export const ROW_KIND_CONTRACT = 'contract';
export const ROW_KIND_REQUEST = 'request';

export const TERMINAL_DATA_REQUEST_STATES = new Set<string>([
  V1_RequestState.COMPLETED,
  V1_RequestState.REJECTED,
  V1_RequestState.INVALIDATED,
  V1_RequestState.OBSOLETE,
]);

export type EntitlementsRow =
  | {
      kind: 'contract';
      data: V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails;
    }
  | { kind: 'request'; data: V1_DataRequestWithWorkflow };

export const getContractData = (row: EntitlementsRow) =>
  row.kind === ROW_KIND_CONTRACT ? row.data.contractResultLite : undefined;

export const getRequestData = (row: EntitlementsRow) =>
  row.kind === ROW_KIND_REQUEST ? row.data.dataRequest : undefined;

export const getConsumer = (row: EntitlementsRow) =>
  getContractData(row)?.consumer ?? getRequestData(row)?.consumer;

const TargetUserCellRenderer = observer(
  (props: {
    row: EntitlementsRow | undefined;
    entitlementsStore: LakehouseEntitlementsStore;
  }): React.ReactNode => {
    const { row, entitlementsStore } = props;
    if (!row) {
      return <>{UNKNOWN}</>;
    }
    if (row.kind === ROW_KIND_CONTRACT) {
      const dataContract = row.data;
      const userIds =
        dataContract instanceof V1_LiteDataContractWithUserStatus
          ? [dataContract.user]
          : dataContract.sortedMemberIds;
      return (
        <MultiUserRenderer
          userIds={userIds}
          applicationStore={entitlementsStore.applicationStore}
          userSearchService={
            entitlementsStore.marketplaceBaseStore.userSearchService
          }
          disableOnClick={true}
          singleUserClassName="marketplace-lakehouse-entitlements__grid__user-display"
        />
      );
    }
    const consumer = row.data.dataRequest.consumer;
    return <>{stringifyOrganizationalScope(consumer)}</>;
  },
);

export const getCommonEntitlementsColDefs = (
  dashboardState: EntitlementsDashboardState,
): DataGridColumnDefinition<EntitlementsRow>[] => [
  {
    headerName: 'Type',
    colId: 'type',
    valueGetter: (params) =>
      params.data?.kind === ROW_KIND_CONTRACT
        ? 'Data Contract'
        : 'Data Request',
  },
  {
    headerName: 'Date Created',
    colId: 'dateCreated',
    sort: 'desc',
    comparator: (_, __, val1, val2) => {
      const getTime = (row: EntitlementsRow | undefined): number => {
        if (!row) {
          return 0;
        }
        const contract = getContractData(row);
        if (contract) {
          return contract.createdAt
            ? new Date(contract.createdAt).getTime()
            : 0;
        }
        const c = (row as { data: V1_DataRequestWithWorkflow }).data
          .workflows[0]?.tasks[0]?.createdOn;
        if (!c) {
          return 0;
        }
        const dateStr = c instanceof Date ? c.toISOString() : String(c);
        return new Date(dateStr).getTime();
      };
      return getTime(val1.data) - getTime(val2.data);
    },
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      const contract = getContractData(params.data);
      if (contract) {
        return formatOrderDate(contract.createdAt) ?? UNKNOWN;
      }
      const createdOn = (params.data as { data: V1_DataRequestWithWorkflow })
        .data.workflows[0]?.tasks[0]?.createdOn;
      if (!createdOn) {
        return UNKNOWN;
      }
      return (
        formatOrderDate(
          createdOn instanceof Date
            ? createdOn.toISOString()
            : String(createdOn),
        ) ?? UNKNOWN
      );
    },
  },
  {
    colId: 'consumerType',
    headerName: 'Consumer Type',
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      const consumer = getConsumer(params.data);
      return consumer
        ? getOrganizationalScopeTypeName(
            consumer,
            dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
          )
        : UNKNOWN;
    },
    cellRenderer: (params: DataGridCellRendererParams<EntitlementsRow>) => {
      if (!params.data) {
        return UNKNOWN;
      }
      const consumer = getConsumer(params.data);
      const plugins =
        dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins();
      const typeName = consumer
        ? getOrganizationalScopeTypeName(consumer, plugins)
        : undefined;
      const typeDetails = consumer
        ? getOrganizationalScopeTypeDetails(consumer, plugins)
        : undefined;
      return (
        <>
          {typeName ?? UNKNOWN}
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
      if (!params.data) {
        return UNKNOWN;
      }
      if (params.data.kind === ROW_KIND_CONTRACT) {
        const userIds =
          params.data.data instanceof V1_LiteDataContractWithUserStatus
            ? [params.data.data.user]
            : params.data.data.sortedMemberIds;
        return userIds.length > 0 ? userIds.join(', ') : UNKNOWN;
      }
      const consumer = params.data.data.dataRequest.consumer;
      return stringifyOrganizationalScope(consumer);
    },
    cellRenderer: (params: DataGridCellRendererParams<EntitlementsRow>) => (
      <TargetUserCellRenderer
        row={params.data}
        entitlementsStore={dashboardState.lakehouseEntitlementsStore}
      />
    ),
  },
  {
    headerName: 'Requester',
    colId: 'requester',
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      return (
        getContractData(params.data)?.createdBy ??
        getRequestData(params.data)?.createdBy ??
        UNKNOWN
      );
    },
    cellRenderer: (params: DataGridCellRendererParams<EntitlementsRow>) => {
      if (!params.data) {
        return <>{UNKNOWN}</>;
      }
      const requester =
        getContractData(params.data)?.createdBy ??
        getRequestData(params.data)?.createdBy;
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
          disableOnClick={true}
          className="marketplace-lakehouse-entitlements__grid__user-display"
        />
      ) : (
        <>{UNKNOWN}</>
      );
    },
  },
  {
    headerName: 'Target Data Product',
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      const contract = getContractData(params.data);
      if (contract) {
        return contract.resourceId;
      }
      const resource = getRequestData(params.data)?.resource;
      return resource instanceof V1_AccessPointGroupReference
        ? resource.dataProduct.name
        : UNKNOWN;
    },
  },
  {
    headerName: 'Target Access Point Group',
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      const contract = getContractData(params.data);
      if (contract) {
        const accessPointGroup =
          contract.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
            ? contract.accessPointGroup
            : `${contract.accessPointGroup ?? UNKNOWN} (${contract.resourceType})`;
        return accessPointGroup ?? UNKNOWN;
      }
      const resource = getRequestData(params.data)?.resource;
      return resource instanceof V1_AccessPointGroupReference
        ? resource.accessPointGroup
        : UNKNOWN;
    },
  },
  {
    headerName: 'Business Justification',
    valueGetter: (params) => {
      if (!params.data) {
        return UNKNOWN;
      }
      return (
        getContractData(params.data)?.description ??
        getRequestData(params.data)?.businessJustification ??
        UNKNOWN
      );
    },
  },
];
