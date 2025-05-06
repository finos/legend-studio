/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  V1_ContractCreate_LegendDataProduct,
  V1_CreateSubscriptionInput,
  V1_DataContract,
  V1_DataContractsRecord,
  V1_DataSubscriptionResponse,
  V1_PendingTasksRespond,
  V1_TaskStatus,
  V1_UserPendingContractsResponse,
} from '@finos/legend-graph';
import { AbstractServerClient, type PlainObject } from '@finos/legend-shared';

export interface LakehouseContractServerClientConfig {
  baseUrl: string;
}

export class LakehouseContractServerClient extends AbstractServerClient {
  constructor(config: LakehouseContractServerClientConfig) {
    super({
      baseUrl: config.baseUrl,
    });
  }

  // auth
  private _token = (token?: string) => ({
    Authorization: `Bearer ${token}`,
  });

  private _contracts = (): string => `${this.baseUrl}/contracts`;

  getDataProducts = (token?: string | undefined): Promise<PlainObject[]> =>
    this.get(`${this._contracts()}/dataProducts`, {}, this._token(token));

  // ------------------------------------------- Data Contracts -------------------------------------------

  private _dataContracts = (): string => `${this.baseUrl}/datacontracts`;

  getDataContracts = (
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsRecord>> =>
    this.get(this._dataContracts(), {}, this._token(token));

  getDataContract = (
    id: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsRecord>> =>
    this.get(
      `${this._dataContracts()}/${encodeURIComponent(id)}`,
      {},
      this._token(token),
    );

  getApprovedUsersForDataContract = (
    id: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsRecord>> =>
    this.get(
      `${this._dataContracts()}/${encodeURIComponent(id)}/approvedUsers`,
      {},
      this._token(token),
    );

  getDataContractsFromDID = (
    body: PlainObject<AppendMode>[],
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsRecord>> => {
    return this.post(
      `${this._dataContracts()}/query/accessPointsOwnedByDeployments`,
      body,
      undefined,
      this._token(token),
    );
  };

  getPendingContracts = (
    user: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_UserPendingContractsResponse>> => {
    return this.get(
      `${this._dataContracts()}/pendingContractsForUser`,
      {},
      this._token(token),
      { user },
    );
  };

  createContract = (
    contractRequest: PlainObject<V1_ContractCreate_LegendDataProduct>,
    token: string | undefined,
  ): Promise<V1_DataContract> =>
    this.post(
      `${this._dataContracts()}/alloyDataProduct`,
      contractRequest,
      undefined,
      this._token(token),
    );

  // ------------------------------------------- Tasks -------------------------------------------

  private _tasks = (): string => `${this.baseUrl}/datacontracts/tasks`;

  getPendingTasks = (
    user: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_PendingTasksRespond>> => {
    return this.get(`${this._tasks()}/pending`, {}, this._token(token), {
      user,
    });
  };

  approveTask = (
    id: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_TaskStatus>> =>
    this.post(
      `${this._tasks()}/${encodeURIComponent(id)}/approve`,
      {},
      {},
      this._token(token),
    );

  denyTask = (
    id: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_TaskStatus>> =>
    this.post(
      `${this._tasks()}/${encodeURIComponent(id)}/deny`,
      {},
      {},
      this._token(token),
    );

  // --------------------------------------- Subscriptions ---------------------------------------

  private _subscriptions = (): string => `${this.baseUrl}/subscriptions`;

  getAllSubscriptions = (
    token: string | undefined,
  ): Promise<PlainObject<V1_DataSubscriptionResponse>[]> =>
    this.get(this._subscriptions(), {}, this._token(token));

  createSubscription = (
    input: PlainObject<V1_CreateSubscriptionInput>,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataSubscriptionResponse>> =>
    this.post(`${this._subscriptions()}`, input, {}, this._token(token));
}
