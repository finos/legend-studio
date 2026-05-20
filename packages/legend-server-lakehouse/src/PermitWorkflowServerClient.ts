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

import { AbstractServerClient, type PlainObject } from '@finos/legend-shared';
import type {
  V1_DataRequestsWithWorkflowResponse,
  V1_PermitProcessInstanceDetail,
  V1_PermitTaskActionResponse,
  V1_PermitTaskAction,
} from '@finos/legend-graph';

// -------------------------------- Config --------------------------------

export interface PermitWorkflowServerClientConfig {
  authBaseUrl: string;
  workflowBaseUrl: string;
}

// -------------------------------- Client --------------------------------

export class PermitWorkflowServerClient extends AbstractServerClient {
  private readonly authBaseUrl: string;
  private readonly workflowBaseUrl: string;

  constructor(config: PermitWorkflowServerClientConfig) {
    super({ baseUrl: config.workflowBaseUrl });
    this.authBaseUrl = config.authBaseUrl;
    this.workflowBaseUrl = config.workflowBaseUrl;
  }

  private readonly _authToken = (token?: string) => ({
    Authorization: `Bearer ${token}`,
  });

  // -------------------------------- Data Requests (auth server) --------------------------------

  private readonly _dataRequests = (): string =>
    `${this.authBaseUrl}/datarequests`;

  getDataRequestWithWorkflow = (
    dataRequestId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataRequestsWithWorkflowResponse>> =>
    this.get(
      `${this._dataRequests()}/${encodeURIComponent(dataRequestId)}/withWorkflow`,
      {},
      this._authToken(token),
    );

  getDataRequestsCreatedByUser = (
    userId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataRequestsWithWorkflowResponse>> =>
    this.get(
      `${this._dataRequests()}/withWorkflow/createdBy/${encodeURIComponent(userId)}`,
      {},
      this._authToken(token),
    );

  cancelWorkflow = (
    dataRequestId: string,
    token: string | undefined,
    justification?: string | undefined,
  ): Promise<PlainObject> =>
    this.delete(
      `${this._dataRequests()}/${encodeURIComponent(dataRequestId)}`,
      {},
      {},
      this._authToken(token),
      { justification },
    );

  // -------------------------------- Workflow Service --------------------------------

  private readonly _workflow = (): string =>
    `${this.workflowBaseUrl}/access/workflow`;

  getProcessInstanceDetail = (
    instanceId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_PermitProcessInstanceDetail>> =>
    this.get(
      `${this._workflow()}/${encodeURIComponent(instanceId)}`,
      {},
      this._authToken(token),
    );

  performTaskAction = (
    instanceId: string,
    taskId: string,
    action: V1_PermitTaskAction,
    justification: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_PermitTaskActionResponse>> =>
    this.post(
      `${this._workflow()}/${encodeURIComponent(instanceId)}/task/${encodeURIComponent(taskId)}/${action}`,
      { justification },
      undefined,
      this._authToken(token),
    );
}
