/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type {
  V1_ConsumerEntitlementResource,
  V1_ContractUserMembership,
  V1_OrganizationalScope,
} from './V1_CoreEntitlements.js';

// --------------------------------- Create Data Access Request Payload ---------------------------------

export class V1_CreateDataAccessRequestPayload {
  description!: string;
  resourceId!: string;
  deploymentId!: number;
  accessPointGroup!: string;
  consumer!: V1_OrganizationalScope;
}

// -------------------------------------------- Requests -----------------------------------------------

export enum V1_RequestState {
  DRAFT = 'DRAFT',
  SUBMITTED_FOR_APPROVALS = 'SUBMITTED_FOR_APPROVALS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  INVALIDATED = 'INVALIDATED',
  OBSOLETE = 'OBSOLETE',
}

export abstract class V1_Request {}

export class V1_DataRequest extends V1_Request {
  businessJustification!: string;
  guid!: string;
  version!: number;
  state!: V1_RequestState;
  resource!: V1_ConsumerEntitlementResource;
  resourceEnvType!: string;
  members: V1_ContractUserMembership[] = [];
  consumer!: V1_OrganizationalScope;
  createdBy!: string;
  userDigest!: string;
}

// ----------------------------------------- Workflow Tasks ---------------------------------------------

export enum V1_DataAccessRequestWorkflowTaskStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  OBSOLETE = 'OBSOLETE',
}

export enum V1_DataAccessRequestWorkflowTaskAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export abstract class V1_DataAccessRequestWorkflowTask {
  taskId!: string;
  processInstanceId!: string;
  status!: V1_DataAccessRequestWorkflowTaskStatus;
  createdOn!: Date;
  assignees: string[] = [];
  actionedOn?: Date | null;
  actionedBy?: string | null;
  url!: string;
  approveUrl?: string | null;
  denyUrl?: string | null;
  action?: V1_DataAccessRequestWorkflowTaskAction | null;
  description?: string | null;
  consumer!: V1_OrganizationalScope;
}

export class V1_PrivilegeManagerApprovalTask extends V1_DataAccessRequestWorkflowTask {
  resourceId!: string;
  accessPointGroup!: string;
}

export class V1_DataOwnerApprovalTask extends V1_DataAccessRequestWorkflowTask {
  resourceId!: string;
  deploymentId!: string;
  accessPointGroup!: string;
}

// -------------------------------------------- Workflows ----------------------------------------------

export enum V1_DataAccessRequestWorkflowStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export class V1_DataAccessRequestWorkflow {
  workflowId!: string;
  dataRequestId!: string;
  status!: V1_DataAccessRequestWorkflowStatus;
  tasks: V1_DataAccessRequestWorkflowTask[] = [];
  url!: string;
}

// ------------------------------------------- Responses -----------------------------------------------

export class V1_DataRequestWithWorkflow {
  dataRequest!: V1_DataRequest;
  workflows!: V1_DataAccessRequestWorkflow[];
}

export class V1_DataRequestsWithWorkflowResponse {
  dataRequests: V1_DataRequestWithWorkflow[] = [];
}

export class V1_DataRequestTasksResponse {
  workflowTasks: V1_DataAccessRequestWorkflowTask[] = [];
}
