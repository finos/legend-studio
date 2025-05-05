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

import type { PlainObject } from '@finos/legend-shared';
import {
  type V1_OrganizationalScope,
  V1_Resource,
  type V1_User,
  type V1_AppDirNode,
  type V1_AdhocTeam,
} from './V1_CoreEntitlements.js';

export class V1_ConsumerEntitlementResource extends V1_Resource {}

export class V1_AccessPoint_Entitlements {
  name!: string;
  guid!: string;
  groups: string[] = [];
}
export class V1_DataProduct_Entitlements {
  name!: string;
  guid!: string;
  accessPoints: V1_AccessPoint_Entitlements[] = [];
  owner!: V1_AppDirNode;
}

export class V1_AccessPointGroupReference extends V1_ConsumerEntitlementResource {
  dataProduct!: V1_DataProduct_Entitlements;
  accessPointGroup!: string;
}

export class V1_DataBundle extends V1_ConsumerEntitlementResource {
  content!: PlainObject;
}

export class V1_DataContract {
  description!: string;
  guid!: string;
  version!: number;
  state!: V1_ContractState;
  resource!: V1_ConsumerEntitlementResource;
  members: V1_ContractUserMembership[] = [];
  consumer!: V1_OrganizationalScope;
  createdBy!: string;
}

export class V1_DataContractRecord {
  dataContract!: V1_DataContract;
}

export class V1_DataContractsRecord {
  dataContracts!: V1_DataContractRecord[];
}

export class V1_ContractUserMembership {
  guid!: string;
  user!: V1_User;
  status!: V1_UserApprovalStatus;
}

export class V1_DataSubscription {
  guid!: string;
  dataContractId!: string;
  target!: V1_DataSubscriptionTarget;
  createdBy!: string;
}

export abstract class V1_DataSubscriptionTarget {}

export class V1_SnowflakeTarget extends V1_DataSubscriptionTarget {
  snowflakeAccountId!: string;
  snowflakeRegion!: V1_SnowflakeRegion;
  snowflakeNetwork!: V1_SnowflakeNetwork;
}

export enum V1_SnowflakeRegion {
  AWS_US_EAST_1,
  AWS_US_WEST_1,
}

export enum V1_SnowflakeNetwork {
  PUBLIC,
  GOLDMAN,
}

export enum V1_UserApprovalStatus {
  PENDING,
  APPROVED,
  DENIED,
}

export enum V1_ContractState {
  DRAFT = 'DRAFT',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL = 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export enum V1_ApprovalType {
  DATA_OWNER_APPROVAL,
  CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
}

export class V1_BigQueryTarget extends V1_DataSubscriptionTarget {
  gcpProjectId!: string;
}

export class V1_TaskStatus {
  status!: V1_UserApprovalStatus;
  errorType: string | undefined;
  errorMessage: string | undefined;
}

export class V1_ContractCreate_LegendDataProduct {
  description: string | undefined;
  product!: unknown;
  accessPointGroup!: string;
  consumer!: V1_OrganizationalScope;
}

export class V1_ContractUserEventRecord {
  taskId!: string;
  dataContractId!: string;
  status!: V1_UserApprovalStatus;
  consumer!: string;
  eventPayload!: string;
  type!: V1_ApprovalType;
}

export class V1_PendingTasksRespond {
  privilegeManager: V1_ContractUserEventRecord[] = [];
  dataOwner: V1_ContractUserEventRecord[] = [];
}

export class V1_TaskStatusChangeResponse {
  status!: V1_UserApprovalStatus;
  errorType: string | undefined;
  errorMessage: string | undefined;
}

export class V1_ContractApprovedUsersResponse {
  approvedUsers: V1_User[] = [];
}

export type V1_PendingTaskWithAssignees = {
  taskId: string;
  assignee: string[];
};

export type V1_UserPendingContractsRecord = {
  contractId: string;
  contractDescription: string;
  pendingTaskWithAssignees: V1_PendingTaskWithAssignees;
};

export type V1_UserPendingContractsResponse = {
  records: V1_UserPendingContractsRecord[] | undefined;
};

export type V1_DataContractsCreation = {
  description: string;
  product: PlainObject;
  accessPointGroup: string;
  consumer: PlainObject<V1_AdhocTeam>;
};
