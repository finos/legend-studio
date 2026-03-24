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

export class V1_WorkflowChildProcessInstance {
  processInstanceId!: string;
  processVersion!: number;
}

export class V1_WorkflowTaskSummary {
  completed!: boolean;
  processInstanceId!: string;
  reference!: string;
  taskId!: string;
  type!: string;
}

export class V1_WorkflowProcessInstance {
  active!: boolean;
  processInstanceId!: string;
  childProcessInstances: V1_WorkflowChildProcessInstance[] = [];
  taskSummaries: V1_WorkflowTaskSummary[] = [];
}

export class V1_RawWorkflowTask {
  completed!: boolean;
  createdDate!: Date;
  parentTaskId!: string;
  potentialAssignees: string[] = [];
  processInstanceId!: string;
  reference!: string;
  status!: string;
  taskId!: string;
  type!: string;
}
