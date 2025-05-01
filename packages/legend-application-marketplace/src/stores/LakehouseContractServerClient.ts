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
  V1_DataContract,
  V1_DataContractsRecord,
  V1_TaskStatus,
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

  // ------------------------------------------- Data Contracts -------------------------------------------

  private _dataContracts = (): string => `${this.baseUrl}/datacontracts`;

  private _contracts = (): string => `${this.baseUrl}/contracts`;

  getDataProducts = (token?: string | undefined): Promise<PlainObject[]> =>
    this.get(
      `${this._contracts()}/dataProducts`,
      {},
      { Authorization: `Bearer ${token}` },
    );

  private _tasks = (): string => `${this.baseUrl}/datacontracts/tasks`;

  getDataContracts = (): Promise<PlainObject<V1_DataContractsRecord>> =>
    this.get(this._dataContracts());

  getDataContract = (
    id: string,
  ): Promise<PlainObject<V1_DataContractsRecord>> =>
    this.get(`${this._dataContracts()}/${encodeURIComponent(id)}`);

  approveTask = (id: string): Promise<PlainObject<V1_TaskStatus>> =>
    this.post(`${this._tasks()}/${encodeURIComponent(id)}/approve`);

  denyTaskTask = (id: string): Promise<PlainObject<V1_TaskStatus>> =>
    this.post(`${this._tasks()}/${encodeURIComponent(id)}/deny`);

  createContract = (
    contractRequest: PlainObject<V1_ContractCreate_LegendDataProduct>,
  ): Promise<V1_DataContract> =>
    this.post(`${this._dataContracts()}/alloyDataProduct`, contractRequest);
}
