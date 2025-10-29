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
  V1_ContractUserStatusResponse,
  V1_CreateContractPayload,
  V1_CreateSubscriptionInput,
  V1_DataContract,
  V1_DataContractApprovedUsersResponse,
  V1_DataContractsResponse,
  V1_DataSubscriptionResponse,
  V1_EntitlementsDataProductDetailsResponse,
  V1_EntitlementsUserEnvResponse,
  V1_LiteDataContractsResponse,
  V1_PendingTasksResponse,
  V1_TaskResponse,
  V1_TaskStatus,
  V1_UserPendingContractsRecord,
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

  // ------------------------------------------- Data Contracts -------------------------------------------

  private _dataContracts = (): string => `${this.baseUrl}/datacontracts`;

  getDataContracts = (
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsResponse>> =>
    this.get(this._dataContracts(), {}, this._token(token));

  getLiteDataContracts = (
    token: string | undefined,
  ): Promise<PlainObject<V1_LiteDataContractsResponse>> =>
    this.get(`${this._dataContracts()}/lite`, {}, this._token(token));

  getDataContract = (
    id: string,
    withMembers: boolean,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsResponse>> =>
    this.get(
      `${this._dataContracts()}/${encodeURIComponent(id)}?withMembers=${withMembers}`,
      {},
      this._token(token),
    );

  getApprovedUsersForDataContract = (
    id: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractApprovedUsersResponse>> =>
    this.get(
      `${this._dataContracts()}/${encodeURIComponent(id)}/approvedUsers`,
      {},
      this._token(token),
    );

  getContractUserStatus = (
    contractId: string,
    userId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_ContractUserStatusResponse>> =>
    this.get(
      `${this._dataContracts()}/${encodeURIComponent(contractId)}/user/${encodeURIComponent(userId)}`,
      {},
      this._token(token),
    );

  getDataContractsFromDID = (
    body: PlainObject<AppendMode>[],
    token: string | undefined,
  ): Promise<PlainObject<V1_DataContractsResponse>> => {
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
    contractRequest: PlainObject<V1_CreateContractPayload>,
    token: string | undefined,
  ): Promise<V1_DataContract> =>
    this.post(
      `${this._dataContracts()}`,
      contractRequest,
      undefined,
      this._token(token),
    );

  escalateUserOnContract = (
    contractId: string,
    user: string,
    forSystemAccount: boolean,
    token: string | undefined,
  ): Promise<PlainObject<V1_UserPendingContractsRecord>> =>
    this.post(
      `${this._dataContracts()}/escalate/${encodeURIComponent(contractId)}/user/${encodeURIComponent(user)}?forSystemAccount=${forSystemAccount}`,
      {},
      {},
      this._token(token),
      { user },
    );

  // ------------------------------------------- Tasks -------------------------------------------

  private _tasks = (): string => `${this.baseUrl}/datacontracts/tasks`;
  private _contract_tasks = (): string => `${this._tasks()}/query/contract`;

  getPendingTasks = (
    user: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_PendingTasksResponse>> => {
    return this.get(`${this._tasks()}/pending`, {}, this._token(token), {
      user,
    });
  };

  getTask = (
    taskId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_PendingTasksResponse>> => {
    return this.get(
      `${this._tasks()}/${encodeURIComponent(taskId)}`,
      {},
      this._token(token),
      undefined,
    );
  };

  getContractTasks = (
    contractId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_TaskResponse>> => {
    return this.get(
      `${this._contract_tasks()}/${encodeURIComponent(contractId)}`,
      {},
      this._token(token),
      {
        user: contractId,
      },
    );
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
  ): Promise<PlainObject<V1_DataSubscriptionResponse>> =>
    this.get(this._subscriptions(), {}, this._token(token));

  getSubscriptionsForContract = (
    contractId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataSubscriptionResponse>[]> =>
    this.get(
      `${this._subscriptions()}/query/contract/${contractId}`,
      {},
      this._token(token),
    );

  createSubscription = (
    input: PlainObject<V1_CreateSubscriptionInput>,
    token: string | undefined,
  ): Promise<PlainObject<V1_DataSubscriptionResponse>> =>
    this.post(this._subscriptions(), input, {}, this._token(token));

  // --------------------------------------- Data Products ---------------------------------------

  private _dataProducts = (): string => `${this.baseUrl}/dataproducts`;

  getDataProducts = (
    token: string | undefined,
  ): Promise<PlainObject<V1_EntitlementsDataProductDetailsResponse>> =>
    this.get(this._dataProducts(), {}, this._token(token));

  getDataProductsLite = (
    token: string | undefined,
  ): Promise<PlainObject<V1_EntitlementsDataProductDetailsResponse>> =>
    this.get(`${this._dataProducts()}/lite`, {}, this._token(token));

  getDataProduct = (
    dataProductId: string,
    token: string | undefined,
  ): Promise<PlainObject<V1_EntitlementsDataProductDetailsResponse>> =>
    this.get(
      `${this._dataProducts()}/${dataProductId}`,
      {},
      this._token(token),
    );

  getDataProductByIdAndDID = (
    dataProductId: string,
    deploymentId: number,
    token: string | undefined,
  ): Promise<PlainObject<V1_EntitlementsDataProductDetailsResponse>> =>
    this.get(
      `${this._dataProducts()}/${dataProductId}/deployments/${deploymentId}`,
      {},
      this._token(token),
    );

  // --------------------------------------- Org Resolver  ---------------------------------------

  private _orgResolver = (): string => `${this.baseUrl}/orgResolver`;

  getUserEntitlementEnvs = (
    userId: string,
    token: string | undefined,
  ): Promise<V1_EntitlementsUserEnvResponse> =>
    this.get(
      `${this._orgResolver()}/${userId}/lakehouse/environment`,
      {},
      this._token(token),
    );
}
