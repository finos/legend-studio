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
} from './V1_ConsumerEntitlements.js';
import type { V1_OrganizationalScope } from './V1_CoreEntitlements.js';

export class V1_CreateDataAccessRequestPayload {
  description!: string;
  resourceId!: string;
  deploymentId!: number;
  accessPointGroup!: string;
  consumer!: V1_OrganizationalScope;
}

export enum V1_RequestState {
  DRAFT = 'DRAFT',
  SUBMITTED_FOR_APPROVALS = 'SUBMITTED_FOR_APPROVALS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  INVALIDATED = 'INVALIDATED',
  OBSOLETE = 'OBSOLETE',
}

export enum V1_WorkflowStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum V1_WorkflowTaskStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  OBSOLETE = 'OBSOLETE',
}

export enum V1_WorkflowTaskAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export class V1_DataRequest {
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

export abstract class V1_WorkflowTask {
  taskId!: string;
  workflowGuid!: string;
  status!: V1_WorkflowTaskStatus;
  createdOn!: Date;
  assignees: string[] = [];
  actionedOn?: Date;
  actionedBy?: string;
  url!: string;
  approveUrl?: string;
  denyUrl?: string;
  action?: V1_WorkflowTaskAction;
  description?: string;
  consumer!: V1_OrganizationalScope;
}

export class V1_PrivilegeManagerApprovalTask extends V1_WorkflowTask {
  resourceId!: string;
  accessPointGroup!: string;
}

export class V1_DataOwnerApprovalTask extends V1_WorkflowTask {
  resourceId!: string;
  deploymentId!: string;
  accessPointGroup!: string;
}

export class V1_Workflow {
  workflowId!: string;
  dataRequestId!: string;
  status!: V1_WorkflowStatus;
  tasks: V1_WorkflowTask[] = [];
  url!: string;
}

export class V1_DataRequestWithWorkflow {
  dataRequest!: V1_DataRequest;
  workflows!: V1_Workflow[];
}

export class V1_DataRequestsWithWorkflowResponse {
  dataRequests!: V1_DataRequestWithWorkflow[];
}
