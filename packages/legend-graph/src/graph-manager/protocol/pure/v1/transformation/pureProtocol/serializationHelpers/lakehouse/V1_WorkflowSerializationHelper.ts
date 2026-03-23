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

import { createModelSchema, list, primitive } from 'serializr';
import { V1_RawWorkflowTask } from '../../../../lakehouse/entitlements/V1_Workflow.js';

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
