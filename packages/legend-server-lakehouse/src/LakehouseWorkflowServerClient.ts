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

import type { V1_RawWorkflowTask } from '@finos/legend-graph';
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

  private _processInstances = (): string => `${this.baseUrl}/processinstances`;

  getProcessInstance = (
    processInstanceId: string,
  ): Promise<PlainObject<V1_RawWorkflowTask>> =>
    this.get(
      `${this._processInstances()}/${encodeURIComponent(processInstanceId)}`,
    );

  // ------------------------------------------- Tasks -------------------------------------------

  private _tasks = (): string => `${this.baseUrl}/tasks`;

  getTask = (taskId: string): Promise<PlainObject<V1_RawWorkflowTask>> =>
    this.get(`${this._tasks()}/${encodeURIComponent(taskId)}`);

  approveTask = (
    taskId: string,
    actioningUserId: string,
    justification: string,
  ): Promise<void> => {
    const requestBody = {
      params: {
        justificationApprove: {
          businessJustification: justification,
        },
      },
      userId: actioningUserId,
      reasonCode: 'Approved',
    };

    return this.post(
      `${this._tasks()}/${encodeURIComponent(taskId)}/complete`,
      requestBody,
    );
  };

  rejectTask = (
    taskId: string,
    actioningUserId: string,
    justification: string,
  ): Promise<void> => {
    const requestBody = {
      params: {
        justificationReject: {
          businessJustification: justification,
        },
      },
      userId: actioningUserId,
      reasonCode: 'Rejected',
    };

    return this.post(
      `${this._tasks()}/${encodeURIComponent(taskId)}/complete`,
      requestBody,
    );
  };

  escalateTask = (taskId: string, actioningUserId: string): Promise<void> => {
    const requestBody = {
      userId: actioningUserId,
      reasonCode: 'Escalated',
    };

    return this.post(
      `${this._tasks()}/${encodeURIComponent(taskId)}/complete`,
      requestBody,
    );
  };
}
