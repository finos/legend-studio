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

import { type PlainObject } from '@finos/legend-shared';
import {
  type V1_OrganizationalScope,
  type V1_User,
  V1_Resource,
} from './V1_CoreEntitlements.js';
import type { V1_DataSubscription } from '../subscriptions/V1_ConsumerSubscriptions.js';
import type { V1_EntitlementsDataProduct } from './V1_EntitlementsDataProduct.js';

// ------------------------------------------- Data Contracts -------------------------------------------

export class V1_ConsumerEntitlementResource extends V1_Resource {}

export class V1_AccessPointGroupReference extends V1_ConsumerEntitlementResource {
  dataProduct!: V1_EntitlementsDataProduct;
  accessPointGroup!: string;
}

export class V1_DataBundle extends V1_ConsumerEntitlementResource {
  content!: PlainObject;
}

export enum V1_ContractState {
  DRAFT = 'DRAFT',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL = 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
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

export class V1_DataContractSubscriptions {
  dataContract!: V1_DataContract;
  subscriptions?: V1_DataSubscription[];
}

export class V1_DataContractsResponse {
  dataContracts?: V1_DataContractSubscriptions[];
}

// -------------------------------------- Lite Data Contracts ------------------------------------------

export class V1_LiteDataContract {
  description!: string;
  guid!: string;
  version!: number;
  state!: V1_ContractState;
  members: V1_ContractUserMembership[] = [];
  consumer!: V1_OrganizationalScope;
  createdBy!: string;
  resourceId!: string;
  resourceType!: V1_ResourceType;
  deploymentId!: number;
  accessPointGroup?: string;
}

export class V1_LiteDataContractsResponse {
  dataContracts?: V1_LiteDataContract[];
}

// -------------------------------------- Data Contract Approval ---------------------------------------

export enum V1_UserApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  REVOKED = 'REVOKED',
  CLOSED = 'CLOSED',
}

export enum V1_EnrichedUserApprovalStatus {
  PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL = 'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  REVOKED = 'REVOKED',
  CLOSED = 'CLOSED',
}

export class V1_DataContractApprovedUsersResponse {
  approvedUsers?: V1_User[];
}

export class V1_ContractUserMembership {
  guid!: string;
  user!: V1_User;
  status!: V1_UserApprovalStatus;
}

export enum V1_ResourceType {
  ACCESS_POINT_GROUP = 'ACCESS_POINT_GROUP',
  DATA_PRODUCT = 'DATA_PRODUCT',
  DATA_BUNDLE = 'DATA_BUNDLE',
}

export enum V1_ApprovalType {
  DATA_OWNER_APPROVAL = 'DATA_OWNER_APPROVAL',
  CONSUMER_PRIVILEGE_MANAGER_APPROVAL = 'CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
}

export class V1_ContractUserStatusResponse {
  status!: V1_EnrichedUserApprovalStatus;
}

// ---------------------------------------- Data Contract Tasks ----------------------------------------

export enum V1_ContractEventPayloadType {
  CLOSED = 'Closed',
  DATA_PRODUCER_APPROVED = 'DataProducerApproved',
  DATA_PRODUCER_REJECTED = 'DataProducerRejected',
  PRIVILEGE_MANAGER_APPROVED = 'PrivilegeManagerApproved',
  PRIVILEGE_MANAGER_REJECTED = 'PrivilegeManagerRejected',
  SUBMITTED = 'Submitted',
  SUBMITTED_FOR_AUTO_APPROVAL = 'SubmittedForAutoApproval',
}

export class V1_TaskStatus {
  status!: V1_UserApprovalStatus;
  errorType: string | undefined;
  errorMessage: string | undefined;
}

export class V1_CreateContractPayload {
  description!: string;
  resourceId!: string;
  resourceType!: V1_ResourceType;
  deploymentId!: number;
  accessPointGroup?: string | undefined;
  consumer!: V1_OrganizationalScope;
}

export abstract class V1_ContractUserEventPayload {
  type!: V1_ContractEventPayloadType;
  eventTimestamp!: string;
}

export class V1_TerminalOrderItem {
  providerName!: string;
  productName!: string;
  category!: string;
  price!: number;
  id!: number;
  perm_id?: number;
}

export class V1_TerminalProvisionPayload {
  ordered_by!: string;
  kerberos!: string;
  order_items!: Record<number, V1_TerminalOrderItem[]>;
  business_justification!: string;
}

export class V1_ContractUserEventPrivilegeManagerPayload extends V1_ContractUserEventPayload {
  candidateIdentity!: string;
  managerIdentity!: string;
  taskId!: string;
}

export class V1_ContractUserEventDataProducerPayload extends V1_ContractUserEventPayload {
  candidateIdentity!: string;
  dataProducerIdentity!: string;
  taskId!: string;
}

export class V1_ContractUserEventRecord {
  taskId!: string;
  dataContractId!: string;
  status!: V1_UserApprovalStatus;
  consumer!: string;
  eventPayload!: V1_ContractUserEventPayload | undefined;
  type!: V1_ApprovalType;
}

export class V1_PendingTasksResponse {
  privilegeManager: V1_ContractUserEventRecord[] = [];
  dataOwner: V1_ContractUserEventRecord[] = [];
}

export class V1_TaskStatusChangeResponse {
  status!: V1_UserApprovalStatus;
  errorType: string | undefined;
  errorMessage: string | undefined;
}

export class V1_TaskMetadata {
  rec!: V1_ContractUserEventRecord;
  assignees: string[] = [];
}

export class V1_TaskResponse {
  tasks: V1_TaskMetadata[] | undefined;
}

// ---------------------------------------- Pending Data Contracts ----------------------------------------

export type V1_PendingTaskWithAssignees = {
  taskId: string;
  assignees: string[];
};

export type V1_UserPendingContractsRecord = {
  contractId: string;
  contractDescription: string;
  pendingTaskWithAssignees: V1_PendingTaskWithAssignees;
};

export type V1_UserPendingContractsResponse = {
  records: V1_UserPendingContractsRecord[] | undefined;
};
