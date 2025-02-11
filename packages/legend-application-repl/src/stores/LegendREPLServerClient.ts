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

import {
  ContentType,
  guaranteeNonNullable,
  HttpHeader,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type DataCubeSpecification,
  type CompletionItem,
} from '@finos/legend-data-cube';
import {
  type V1_RelationType,
  type PersistentDataCube,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';

type GetValueSpecificationCodeInput = {
  value: PlainObject<V1_ValueSpecification>;
  pretty?: boolean | undefined;
};

type ParseValueSpecificationInput = {
  code: string;
  returnSourceInformation?: boolean | undefined;
};

type QueryTypeaheadInput = {
  code: string;
  baseQuery?: PlainObject<V1_Lambda>;
};

type GetQueryRelationReturnTypeInput = {
  query: PlainObject<V1_Lambda>;
};

type GetQueryCodeRelationReturnTypeInput = {
  code: string;
  baseQuery?: PlainObject<V1_ValueSpecification>;
};

type ExecutionInput = {
  query: PlainObject<V1_Lambda>;
  debug?: boolean | undefined;
};

type ExecutionResult = {
  result: string;
  executedQuery: string;
  executedSQL: string;
};

type InfrastructureInfo = {
  currentUser?: string | undefined;
  gridClientLicense?: string | undefined;
  queryServerBaseUrl?: string | undefined;
  hostedApplicationBaseUrl?: string | undefined;
};

export class LegendREPLServerClient {
  private readonly networkClient: NetworkClient;

  constructor(networkClient: NetworkClient) {
    this.networkClient = networkClient;
  }

  get baseUrl(): string {
    return guaranteeNonNullable(
      this.networkClient.baseUrl,
      `REPL server client has not been configured properly`,
    );
  }

  private get dataCube(): string {
    return `${this.baseUrl}/api/dataCube`;
  }

  async getInfrastructureInfo(): Promise<InfrastructureInfo> {
    return this.networkClient.get(`${this.dataCube}/infrastructureInfo`);
  }

  async getQueryTypeahead(
    input: QueryTypeaheadInput,
  ): Promise<CompletionItem[]> {
    return this.networkClient.post(`${this.dataCube}/typeahead`, input);
  }

  async parseValueSpecification(
    input: ParseValueSpecificationInput,
  ): Promise<PlainObject<V1_ValueSpecification>> {
    return this.networkClient.post(
      `${this.dataCube}/parseValueSpecification`,
      input,
    );
  }

  async getValueSpecificationCode(
    input: GetValueSpecificationCodeInput,
  ): Promise<string> {
    return this.networkClient.post(
      `${this.dataCube}/getValueSpecificationCode`,
      input,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );
  }

  async getBaseSpecification(): Promise<PlainObject<DataCubeSpecification>> {
    return this.networkClient.get(`${this.dataCube}/getBaseQuery`);
  }

  async getQueryRelationReturnType(
    input: GetQueryRelationReturnTypeInput,
  ): Promise<PlainObject<V1_RelationType>> {
    return this.networkClient.post(
      `${this.dataCube}/getRelationReturnType`,
      input,
    );
  }

  async getQueryCodeRelationReturnType(
    input: GetQueryCodeRelationReturnTypeInput,
  ): Promise<PlainObject<V1_RelationType>> {
    return this.networkClient.post(
      `${this.dataCube}/getRelationReturnType/code`,
      input,
    );
  }

  async executeQuery(
    input: PlainObject<ExecutionInput>,
  ): Promise<ExecutionResult> {
    return this.networkClient.post(`${this.dataCube}/executeQuery`, input);
  }

  async publishQuery(
    query: PlainObject<PersistentDataCube>,
    queryStoreBaseUrl: string,
  ): Promise<PlainObject<PersistentDataCube>> {
    return this.networkClient.post(`${queryStoreBaseUrl}`, query);
  }
}
