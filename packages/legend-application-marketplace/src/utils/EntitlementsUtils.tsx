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
  type ContractErrorLayer,
  ContractSyncStatus,
  getOrganizationalScopeTypeName,
  getOrganizationalScopeTypeDetails,
  UserRenderer,
  MultiUserRenderer,
  stringifyOrganizationalScope,
  renderOrganizationalScopeConsumer,
  DataContractViewerState,
  PermitDataAccessRequestState,
} from '@finos/legend-extension-dsl-data-product';
import {
  GraphManagerState,
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
  V1_ResourceType,
  V1_AccessPointGroupReference,
  V1_ContractState,
  V1_EnrichedUserApprovalStatus,
  V1_RequestState,
  V1_WorkflowTaskStatus,
  type V1_DataRequestWithWorkflow,
  type V1_LiteAccessRequest,
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_transformDataRequestWithWorkflowToLiteDataAccessRequest,
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
import { useMemo } from 'react';
import { createModelSchema, list, object, primitive } from 'serializr';
import { useLegendMarketplaceBaseStore } from '../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
  generatePermitDataAccessRequestPagePath,
} from '../__lib__/LegendMarketplaceNavigation.js';

export const UNKNOWN = 'Unknown';
export const ROW_KIND_CONTRACT = 'contract';
export const ROW_KIND_REQUEST = 'request';

export enum EntitlementsColumnHeader {
  TYPE = 'Type',
  DATE_CREATED = 'Date Created',
  CONSUMER_TYPE = 'Consumer Type',
  TARGET_USERS = 'Target User(s)',
  REQUESTER = 'Requester',
  TARGET_DATA_PRODUCT = 'Target Data Product',
  TARGET_ACCESS_POINT_GROUP = 'Target Access Point Group',
  BUSINESS_JUSTIFICATION = 'Business Justification',
  STATE = 'State',
  ASSIGNEES = 'Assignees',
}

export const CONTRACT_STATE_DISPLAY_LABELS: Record<string, string> = {
  [V1_ContractState.DRAFT]: 'Draft',
  [V1_ContractState.PENDING_DATA_OWNER_APPROVAL]: 'Data Owner Approval',
  [V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL]:
    'Privilege Manager Approval',
  [V1_ContractState.COMPLETED]: 'Completed',
  [V1_ContractState.REJECTED]: 'Rejected',
  [V1_ContractState.CLOSED]: 'Closed',
};

export const TERMINAL_DATA_REQUEST_STATES = new Set<string>([
  V1_RequestState.COMPLETED,
  V1_RequestState.REJECTED,
  V1_RequestState.INVALIDATED,
  V1_RequestState.OBSOLETE,
]);

export const ENTITLEMENTS_DEFAULT_COL_DEF: DataGridColumnDefinition<EntitlementsRow> =
  {
    minWidth: 50,
    sortable: true,
    resizable: true,
    flex: 1,
  };

export type EntitlementsRow =
  | {
      kind: 'contract';
      data: V1_LiteDataContractWithUserStatus | ContractCreatedByUserDetails;
    }
  | { kind: 'request'; data: V1_DataRequestWithWorkflow };

export const getContractData = (
  row: EntitlementsRow,
): V1_LiteDataContract | undefined => {
  if (row.kind === ROW_KIND_CONTRACT) {
    const lite = row.data.contractResultLite;
    return lite instanceof V1_LiteDataContract ? lite : undefined;
  }
  return undefined;
};

export const getRequestData = (row: EntitlementsRow) =>
  row.kind === ROW_KIND_REQUEST ? row.data.dataRequest : undefined;

export const getSelectedRowId = (
  row: EntitlementsRow | undefined,
): string | undefined =>
  row ? (getContractData(row)?.guid ?? getRequestData(row)?.guid) : undefined;

export const getSelectedContractGuid = (
  row: EntitlementsRow | undefined,
): string | undefined => (row ? getContractData(row)?.guid : undefined);

/**
 * The lite access request of a row, whether it is a contract or a (RMS) data
 * request. This is what contract errors (unverified ingests, unsynced
 * entities, ...) are looked up with.
 */
export const getLiteAccessRequest = (
  row: EntitlementsRow,
): V1_LiteAccessRequest =>
  row.kind === ROW_KIND_CONTRACT
    ? row.data.contractResultLite
    : V1_transformDataRequestWithWorkflowToLiteDataAccessRequest(row.data);

/**
 * Whether the row has approved access, which is when its sync status is
 * meaningful. Only such rows are ever checked for their sync status.
 *
 * - Rows of the user's own contracts: the user's status is APPROVED.
 * - Contracts requested for others: the contract is COMPLETED, and, when the
 *   members are known, at least one of them is APPROVED. A contract is COMPLETED
 *   once no user is pending, even if every user was denied.
 * - Data requests: the request is COMPLETED.
 */
export const isApprovedRow = (row: EntitlementsRow): boolean => {
  if (row.kind === ROW_KIND_CONTRACT) {
    const lite = row.data.contractResultLite;
    if (!(lite instanceof V1_LiteDataContract)) {
      return false;
    }
    if (row.data instanceof V1_LiteDataContractWithUserStatus) {
      return row.data.status === V1_EnrichedUserApprovalStatus.APPROVED;
    }
    if (lite.state !== V1_ContractState.COMPLETED) {
      return false;
    }
    const memberStatuses = Array.from(row.data.members.values());
    return (
      memberStatuses.length === 0 ||
      memberStatuses.includes(V1_EnrichedUserApprovalStatus.APPROVED)
    );
  }
  return row.data.dataRequest.state === V1_RequestState.COMPLETED;
};

/**
 * Returns the id to check the sync status for, if the row has approved access.
 * Rows that are not approved (pending, denied, closed, revoked, ...) have
 * nothing to sync, so they get no id.
 */
export const getSyncCheckId = (row: EntitlementsRow): string | undefined =>
  isApprovedRow(row) ? getSelectedRowId(row) : undefined;

export const getOpenTaskAssignees = (
  data: V1_DataRequestWithWorkflow,
): string[] => {
  const openTask = data.workflows
    .flatMap((w) => w.tasks)
    .find((t) => t.status === V1_WorkflowTaskStatus.OPEN);
  return openTask?.assignees.toSorted() ?? [];
};

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
    return (
      <>
        {renderOrganizationalScopeConsumer(
          consumer,
          entitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
        )}
      </>
    );
  },
);

export const getCommonEntitlementsColDefs = (
  dashboardState: EntitlementsDashboardState,
): DataGridColumnDefinition<EntitlementsRow>[] => [
  {
    headerName: EntitlementsColumnHeader.TYPE,
    colId: 'type',
    valueGetter: (params) =>
      params.data?.kind === ROW_KIND_CONTRACT
        ? 'Data Contract'
        : 'Data Request',
  },
  {
    headerName: EntitlementsColumnHeader.DATE_CREATED,
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
        if (row.kind !== ROW_KIND_REQUEST) {
          return 0;
        }
        const c = row.data.workflows[0]?.tasks[0]?.createdOn;
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
      if (params.data.kind !== ROW_KIND_REQUEST) {
        return UNKNOWN;
      }
      const createdOn = params.data.data.workflows[0]?.tasks[0]?.createdOn;
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
    headerName: EntitlementsColumnHeader.CONSUMER_TYPE,
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
    headerName: EntitlementsColumnHeader.TARGET_USERS,
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
      return stringifyOrganizationalScope(
        consumer,
        dashboardState.lakehouseEntitlementsStore.applicationStore.pluginManager.getApplicationPlugins(),
      );
    },
    cellRenderer: (params: DataGridCellRendererParams<EntitlementsRow>) => (
      <TargetUserCellRenderer
        row={params.data}
        entitlementsStore={dashboardState.lakehouseEntitlementsStore}
      />
    ),
  },
  {
    headerName: EntitlementsColumnHeader.REQUESTER,
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
          options={{
            disableOnClick: true,
            className: 'marketplace-lakehouse-entitlements__grid__user-display',
          }}
        />
      ) : (
        <>{UNKNOWN}</>
      );
    },
  },
  {
    headerName: EntitlementsColumnHeader.TARGET_DATA_PRODUCT,
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
    headerName: EntitlementsColumnHeader.TARGET_ACCESS_POINT_GROUP,
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
    headerName: EntitlementsColumnHeader.BUSINESS_JUSTIFICATION,
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

export const useSelectedViewerState = (
  selectedRow: EntitlementsRow | undefined,
  selectedRowId: string | undefined,
) => {
  const marketplaceBaseStore = useLegendMarketplaceBaseStore();
  return useMemo(() => {
    if (!selectedRow) {
      return undefined;
    }
    if (selectedRow.kind === ROW_KIND_CONTRACT) {
      const contract = selectedRow.data.contractResultLite;
      if (!(contract instanceof V1_LiteDataContract)) {
        return undefined;
      }
      return new DataContractViewerState(
        contract,
        (contractId: string, taskId: string) =>
          marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
            generateContractPagePath(contractId, taskId),
          ),
        undefined,
        marketplaceBaseStore.applicationStore,
        marketplaceBaseStore.lakehouseContractServerClient,
        new GraphManagerState(
          marketplaceBaseStore.applicationStore.pluginManager,
          marketplaceBaseStore.applicationStore.logService,
        ),
        marketplaceBaseStore.userSearchService,
      );
    }
    const guid = selectedRow.data.dataRequest.guid;
    const authClient = marketplaceBaseStore.lakehouseContractServerClient;
    const pluginManager = marketplaceBaseStore.applicationStore.pluginManager;
    return new PermitDataAccessRequestState(
      guid,
      marketplaceBaseStore.applicationStore,
      marketplaceBaseStore.permitWorkflowServerClient,
      marketplaceBaseStore.userSearchService,
      {
        authServerClient: authClient,
        initialData: selectedRow.data,
        fetchFresh: async (token) => {
          const raw = await authClient.getDataAccessRequestWithWorkflow(
            guid,
            token,
          );
          return V1_deserializeDataRequestsWithWorkflowResponse(
            raw,
            pluginManager.getPureProtocolProcessorPlugins(),
          )[0];
        },
        getTaskPageUrl: (id) =>
          marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
            generatePermitDataAccessRequestPagePath(id),
          ),
      },
    );
    // Re-create only when the selected row changes (different guid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowId]);
};

export const useGetDataProductUrl = (): ((
  dataProductId: string,
  deploymentId: number,
) => string) => {
  const marketplaceBaseStore = useLegendMarketplaceBaseStore();
  return (dataProductId: string, deploymentId: number) =>
    marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
      generateLakehouseDataProductPath(dataProductId, deploymentId),
    );
};

// ------------------------------------- Access status (sync) -------------------------------------

/**
 * The response of the sync status endpoint, with only what the access status
 * needs. The endpoint leaves out the lists that are empty, which stay empty here.
 */
export class ContractSyncSubscription {
  guid!: string;
}

export class ContractSyncFailure {
  sqlStatement!: string;
  exception?: string | undefined;
}

export class ContractSyncUser {
  username!: string;
}

export class ContractSyncAccessPoint {
  accessPointName!: string;
}

export class ContractSyncStatusResponse {
  status!: string;
  subscriptions: ContractSyncSubscription[] = [];
  syncFailures: ContractSyncFailure[] = [];
  unsyncedUsers: ContractSyncUser[] = [];
  unsyncedAccessPoints: ContractSyncAccessPoint[] = [];
  unsyncedTargetAccounts: string[] = [];
}

const contractSyncSubscriptionModelSchema = createModelSchema(
  ContractSyncSubscription,
  { guid: primitive() },
);

const contractSyncFailureModelSchema = createModelSchema(ContractSyncFailure, {
  sqlStatement: primitive(),
  exception: primitive(),
});

const contractSyncUserModelSchema = createModelSchema(ContractSyncUser, {
  username: primitive(),
});

const contractSyncAccessPointModelSchema = createModelSchema(
  ContractSyncAccessPoint,
  { accessPointName: primitive() },
);

export const ContractSyncStatusResponseModelSchema = createModelSchema(
  ContractSyncStatusResponse,
  {
    status: primitive(),
    subscriptions: list(object(contractSyncSubscriptionModelSchema)),
    syncFailures: list(object(contractSyncFailureModelSchema)),
    unsyncedUsers: list(object(contractSyncUserModelSchema)),
    unsyncedAccessPoints: list(object(contractSyncAccessPointModelSchema)),
    unsyncedTargetAccounts: list(primitive()),
  },
);

/**
 * What the user sees for an approved contract: whether the approved access has
 * actually been applied (synced) on the target, as opposed to only being approved.
 */
export enum ContractAccessStatus {
  SETTING_UP = 'Setting up',
  ACTIVE = 'Active',
  NEEDS_ATTENTION = 'Needs attention',
  NOT_CHECKED = 'Not checked',
}

export type ContractAccessStatusDetail = {
  status: ContractAccessStatus;
  // Explains the status in a tooltip, when there is something worth saying
  reason?: string | undefined;
};

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Derives the access status from the response of the sync status endpoint.
 * Pass `undefined` when the endpoint could not be called or did not return a
 * usable answer (error, unsupported engine, bundle contract, ...).
 *
 * "Active" is only ever returned when the backend reports FULLY_SYNCED.
 */
export const deriveContractAccessStatus = (
  response: ContractSyncStatusResponse | undefined,
): ContractAccessStatusDetail => {
  const status = response?.status.toUpperCase();

  if (status === ContractSyncStatus.FULLY_SYNCED) {
    return { status: ContractAccessStatus.ACTIVE };
  }

  if (
    response &&
    (status === ContractSyncStatus.NEVER_SYNCED ||
      status === ContractSyncStatus.NOT_FULLY_SYNCED)
  ) {
    // Without a subscription for the target, nothing is ever granted
    if (response.subscriptions.length === 0) {
      return {
        status: ContractAccessStatus.NEEDS_ATTENTION,
        reason:
          'This contract has no subscription, so access cannot be applied yet.',
      };
    }
    if (response.syncFailures.length > 0) {
      return {
        status: ContractAccessStatus.NEEDS_ATTENTION,
        reason: `${pluralize(response.syncFailures.length, 'sync failure')} reported while applying access. Contact the data product owner if this persists.`,
      };
    }
    const pending = [
      response.unsyncedUsers.length > 0
        ? pluralize(response.unsyncedUsers.length, 'user')
        : undefined,
      response.unsyncedAccessPoints.length > 0
        ? pluralize(response.unsyncedAccessPoints.length, 'access point')
        : undefined,
      response.unsyncedTargetAccounts.length > 0
        ? pluralize(response.unsyncedTargetAccounts.length, 'target account')
        : undefined,
    ].filter((item): item is string => item !== undefined);
    return {
      status: ContractAccessStatus.SETTING_UP,
      reason:
        pending.length > 0
          ? `Approved. Waiting for ${pending.join(', ')} to be granted.`
          : 'Approved. Waiting for access to be granted.',
    };
  }

  return {
    status: ContractAccessStatus.NOT_CHECKED,
    reason: 'Sync status is not available for this contract.',
  };
};

/**
 * The line of the contract errors that says why the access status is what it is,
 * for when the sync status lists nothing that is unsynced to show. Without it the
 * chip says "Setting up" or "Needs attention" while there is no error to be seen.
 * Nothing is shown for an access status that is not a problem.
 */
export const buildAccessStatusErrorLayer = (
  detail: ContractAccessStatusDetail,
): ContractErrorLayer | undefined =>
  detail.status === ContractAccessStatus.SETTING_UP ||
  detail.status === ContractAccessStatus.NEEDS_ATTENTION
    ? { title: detail.reason ?? detail.status }
    : undefined;
