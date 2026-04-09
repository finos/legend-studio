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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import {
  createModelSchema,
  list,
  optional,
  primitive,
  raw,
  custom,
} from 'serializr';

export enum V1_WorkflowStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum V1_WorkflowProcessAction {
  ADD = 'ADD',
  DELETE = 'DELETE',
}

export enum V1_WorkflowProcessSubjectType {
  WORKFORCE_USER = 'WORKFORCE_USER',
  ORG_NODE = 'ORG_NODE',
}

export enum V1_WorkflowProcessResourceType {
  PRIVILEGE = 'PRIVILEGE',
}

export enum V1_WorkflowTaskWorkItemType {
  TASK = 'TASK',
  PROCESS = 'PROCESS',
}

export enum V1_WorkflowTaskStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  OBSOLETE = 'OBSOLETE',
}

export enum V1_WorkflowTaskCompletionReason {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ESCALATED = 'Escalated',
}

export class V1_WorkflowProcessDetails {
  requestedFor?: string;
  roleName?: string;
  requestedBy?: string;
  did?: string;
  subjectId?: string;
  resourceId?: string;
  action?: V1_WorkflowProcessAction;
  subjectType?: V1_WorkflowProcessSubjectType;
  resouceType?: V1_WorkflowProcessResourceType;
  processId!: string;
  processName!: string;
  requestedCoverage?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_WorkflowProcessDetails, {
      action: optional(primitive()),
      did: optional(primitive()),
      processId: primitive(),
      processName: primitive(),
      requestedBy: optional(primitive()),
      requestedCoverage: optional(raw()),
      requestedFor: optional(primitive()),
      resouceType: optional(primitive()),
      resourceId: optional(primitive()),
      roleName: optional(primitive()),
      subjectId: optional(primitive()),
      subjectType: optional(primitive()),
    }),
  );
}

export class V1_WorkflowTask {
  taskId!: string;
  processInstanceId!: string;
  workItemType!: V1_WorkflowTaskWorkItemType;
  workItemName!: string;
  status!: V1_WorkflowTaskStatus;
  assignees: string[] = [];
  createdDate!: number;
  completedDate?: number;
  completedBy?: string;
  completionReason?: V1_WorkflowTaskCompletionReason;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_WorkflowTask, {
      assignees: list(primitive()),
      completedBy: optional(primitive()),
      completionReason: optional(primitive()),
      completedDate: optional(primitive()),
      createdDate: primitive(),
      processInstanceId: primitive(),
      status: primitive(),
      taskId: primitive(),
      workItemName: primitive(),
      workItemType: primitive(),
    }),
  );
}

export class V1_WorkflowInstance {
  processInstanceId!: string;
  status!: V1_WorkflowStatus;
  taskId!: string;
  createdDate!: number;
  completedDate?: number;
  processDetails!: V1_WorkflowProcessDetails;
  childProcesses?: V1_WorkflowInstance[] = [];
  tasks?: V1_WorkflowTask[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_WorkflowInstance, {
      childProcesses: optional(
        list(
          custom(
            (val: V1_WorkflowInstance) =>
              V1_WorkflowInstance.serialization.toJson(val),
            (val: Record<PropertyKey, unknown>) =>
              V1_WorkflowInstance.serialization.fromJson(val),
          ),
        ),
      ),
      completedDate: optional(primitive()),
      createdDate: primitive(),
      processDetails: usingModelSchema(
        V1_WorkflowProcessDetails.serialization.schema,
      ),
      processInstanceId: primitive(),
      status: primitive(),
      taskId: primitive(),
      tasks: optional(
        list(usingModelSchema(V1_WorkflowTask.serialization.schema)),
      ),
    }),
  );
}
