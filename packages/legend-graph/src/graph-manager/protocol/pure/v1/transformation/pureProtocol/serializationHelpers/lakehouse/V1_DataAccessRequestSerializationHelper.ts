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

import {
  customListWithSchema,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
} from 'serializr';
import {
  type V1_WorkflowTask,
  V1_CreateDataAccessRequestPayload,
  V1_DataOwnerApprovalTask,
  V1_DataRequest,
  V1_DataRequestsWithWorkflowResponse,
  V1_DataRequestWithWorkflow,
  V1_PrivilegeManagerApprovalTask,
  V1_Workflow,
} from '../../../../lakehouse/entitlements/V1_DataAccessRequest.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import {
  V1_serializeOrganizationalScope,
  V1_deserializeOrganizationalScope,
  V1_contractUserMembershipModelSchema,
  V1_deseralizeConsumerEntitlementResource,
  V1_seralizeConsumerEntitlementResource,
} from './V1_CoreEntitlementsSerializationHelper.js';

// ---------------------------------------- Workflow Task Types ----------------------------------------

export enum V1_WorkflowTaskType {
  PrivilegeManagerApprovalTask = 'PrivilegeManagerApprovalTask',
  DataOwnerApprovalTask = 'DataOwnerApprovalTask',
}

// --------------------------------- Create Data Access Request Payload ---------------------------------

export const V1_createDataAccessRequestPayloadModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_CreateDataAccessRequestPayload, {
    description: primitive(),
    resourceId: primitive(),
    deploymentId: primitive(),
    accessPointGroup: primitive(),
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
  });

// ------------------------------------------ Data Request ---------------------------------------------

export const V1_dataRequestModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataRequest, {
    businessJustification: primitive(),
    guid: primitive(),
    version: primitive(),
    state: primitive(),
    resource: custom(
      V1_seralizeConsumerEntitlementResource,
      V1_deseralizeConsumerEntitlementResource,
    ),
    resourceEnvType: primitive(),
    members: list(usingModelSchema(V1_contractUserMembershipModelSchema)),
    consumer: custom(
      (val) => V1_serializeOrganizationalScope(val, plugins),
      (val) => V1_deserializeOrganizationalScope(val, plugins),
    ),
    createdBy: primitive(),
    userDigest: primitive(),
  });

// ----------------------------------------- Workflow Tasks --------------------------------------------

const V1_workflowTaskBaseProps = (plugins: PureProtocolProcessorPlugin[]) => ({
  taskId: primitive(),
  workflowGuid: primitive(),
  status: primitive(),
  createdOn: primitive(),
  assignees: list(primitive()),
  actionedOn: optional(primitive()),
  actionedBy: optional(primitive()),
  url: primitive(),
  approveUrl: optional(primitive()),
  denyUrl: optional(primitive()),
  action: optional(primitive()),
  description: optional(primitive()),
  consumer: custom(
    (val) => V1_serializeOrganizationalScope(val, plugins),
    (val) => V1_deserializeOrganizationalScope(val, plugins),
  ),
});

export const V1_privilegeManagerApprovalTaskModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_PrivilegeManagerApprovalTask, {
    _type: usingConstantValueSchema(
      V1_WorkflowTaskType.PrivilegeManagerApprovalTask,
    ),
    ...V1_workflowTaskBaseProps(plugins),
    resourceId: primitive(),
    accessPointGroup: primitive(),
  });

export const V1_dataOwnerApprovalTaskModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataOwnerApprovalTask, {
    _type: usingConstantValueSchema(V1_WorkflowTaskType.DataOwnerApprovalTask),
    ...V1_workflowTaskBaseProps(plugins),
    resourceId: primitive(),
    deploymentId: primitive(),
    accessPointGroup: primitive(),
  });

const V1_serializeWorkflowTask = (
  task: V1_WorkflowTask,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_WorkflowTask> => {
  if (task instanceof V1_PrivilegeManagerApprovalTask) {
    return serialize(V1_privilegeManagerApprovalTaskModelSchema(plugins), task);
  } else if (task instanceof V1_DataOwnerApprovalTask) {
    return serialize(V1_dataOwnerApprovalTaskModelSchema(plugins), task);
  }
  throw new UnsupportedOperationError(
    `Can't serialize unsupported workflow task type: ${task.constructor.name}`,
  );
};

const V1_deserializeWorkflowTask = (
  json: PlainObject<V1_WorkflowTask>,
  plugins: PureProtocolProcessorPlugin[],
): V1_WorkflowTask => {
  switch (json._type) {
    case V1_WorkflowTaskType.PrivilegeManagerApprovalTask:
      return deserialize(
        V1_privilegeManagerApprovalTaskModelSchema(plugins),
        json,
      );
    case V1_WorkflowTaskType.DataOwnerApprovalTask:
      return deserialize(V1_dataOwnerApprovalTaskModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize unsupported workflow task type: ${json._type}`,
      );
  }
};

// -------------------------------------------- Workflow ------------------------------------------------

export const V1_workflowModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_Workflow, {
    workflowId: primitive(),
    dataRequestId: primitive(),
    status: primitive(),
    tasks: custom(
      (val: V1_WorkflowTask[]) =>
        val.map((task) => V1_serializeWorkflowTask(task, plugins)),
      (val: PlainObject<V1_WorkflowTask>[]) =>
        val.map((task) => V1_deserializeWorkflowTask(task, plugins)),
    ),
    url: primitive(),
  });

// --------------------------------- Data Request With Workflow -----------------------------------------

export const V1_dataRequestWithWorkflowModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataRequestWithWorkflow, {
    dataRequest: usingModelSchema(V1_dataRequestModelSchema(plugins)),
    workflows: customListWithSchema(V1_workflowModelSchema(plugins)),
  });

// ----------------------------- Data Requests With Workflow Response -----------------------------------

export const V1_dataRequestsWithWorkflowResponseModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
) =>
  createModelSchema(V1_DataRequestsWithWorkflowResponse, {
    dataRequests: customListWithSchema(
      V1_dataRequestWithWorkflowModelSchema(plugins),
    ),
  });

export const V1_deserializeDataRequestsWithWorkflowResponse = (
  json: PlainObject<V1_DataRequestsWithWorkflowResponse>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataRequestWithWorkflow[] => {
  const response = deserialize(
    V1_dataRequestsWithWorkflowResponseModelSchema(plugins),
    json,
  );
  return response.dataRequests ?? [];
};
