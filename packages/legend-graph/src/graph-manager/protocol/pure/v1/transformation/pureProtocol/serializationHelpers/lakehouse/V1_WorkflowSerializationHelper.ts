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

import { usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';
import {
  V1_RawWorkflowTask,
  V1_WorkflowChildProcessInstance,
  V1_WorkflowProcessInstance,
  V1_WorkflowTaskSummary,
} from '../../../../lakehouse/entitlements/V1_Workflow.js';

export const V1_workflowChildProcessInstanceModelSchema = createModelSchema(
  V1_WorkflowChildProcessInstance,
  {
    processInstanceId: primitive(),
    processVersion: primitive(),
  },
);

export const V1_workflowTaskSummaryModelSchema = createModelSchema(
  V1_WorkflowTaskSummary,
  {
    completed: primitive(),
    processInstanceId: primitive(),
    reference: primitive(),
    taskId: primitive(),
    type: primitive(),
  },
);

export const V1_workflowProcessInstanceModelSchema = createModelSchema(
  V1_WorkflowProcessInstance,
  {
    active: primitive(),
    childProcessInstances: list(
      usingModelSchema(V1_workflowChildProcessInstanceModelSchema),
    ),
    processInstanceId: primitive(),
    taskSummaries: list(usingModelSchema(V1_workflowTaskSummaryModelSchema)),
  },
);

export const V1_workflowTaskModelSchema = createModelSchema(
  V1_RawWorkflowTask,
  {
    completed: primitive(),
    createdDate: primitive(),
    parentTaskId: primitive(),
    potentialAssignees: list(primitive()),
    processInstanceId: primitive(),
    reference: primitive(),
    status: primitive(),
    taskId: primitive(),
    type: primitive(),
  },
);
