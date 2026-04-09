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

import type { V1_WorkflowInstance } from '@finos/legend-graph';
import { AbstractServerClient, type PlainObject } from '@finos/legend-shared';

export interface LakehouseWorkflowServerClientConfig {
  baseUrl: string;
}

export class LakehouseWorkflowServerClient extends AbstractServerClient {
  constructor(config: LakehouseWorkflowServerClientConfig) {
    super({
      baseUrl: config.baseUrl,
    });
  }

  // ------------------------------------- Process Instances -------------------------------------

  private _workflow = (): string => `${this.baseUrl}/access/workflow`;

  getWorkflowInstance = (
    instanceId: string,
  ): Promise<PlainObject<V1_WorkflowInstance>> =>
    this.get(`${this._workflow()}/${encodeURIComponent(instanceId)}`);

  actionTask = (
    instanceId: string,
    taskId: string,
    action: 'APPROVE' | 'REJECT' | 'ESCALATE',
    justification: string,
  ): Promise<void> => {
    const requestBody = {
      justification,
    };

    return this.post(
      `${this._workflow()}/${encodeURIComponent(instanceId)}/task/${encodeURIComponent(taskId)}/${encodeURIComponent(action)}`,
      requestBody,
    );
  };
}
