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
  SerializationFactory,
  usingConstantValueSchema,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type DataCubeQuery,
  type CompletionItem,
  type RelationType,
} from '@finos/legend-data-cube';
import {
  type PersistentDataCubeQuery,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { createModelSchema, optional, primitive, raw } from 'serializr';

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

export const REPL_DATA_CUBE_SOURCE_TYPE = 'repl';

class REPLBaseDataCubeQuerySource {
  query!: string;
  runtime!: string;
  model?: PlainObject | undefined;

  mapping?: string | undefined;
  timestamp!: number;
  isLocal!: boolean;
  isPersistenceSupported!: boolean;
  // columns // we don't need this analytics, we will get this from the query directly

  static readonly serialization = new SerializationFactory(
    createModelSchema(REPLBaseDataCubeQuerySource, {
      _type: usingConstantValueSchema(REPL_DATA_CUBE_SOURCE_TYPE),
      isLocal: primitive(),
      isPersistenceSupported: primitive(),
      mapping: optional(primitive()),
      model: optional(raw()),
      query: primitive(),
      runtime: primitive(),
      timestamp: primitive(),
    }),
  );
}

export function deserializeREPLQuerySource(
  value: PlainObject<REPLBaseDataCubeQuerySource>,
) {
  return REPLBaseDataCubeQuerySource.serialization.fromJson(value);
}

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

  async getBaseQuery(): Promise<PlainObject<DataCubeQuery>> {
    return this.networkClient.get(`${this.dataCube}/getBaseQuery`);
  }

  async getQueryRelationReturnType(
    input: GetQueryRelationReturnTypeInput,
  ): Promise<RelationType> {
    return this.networkClient.post(
      `${this.dataCube}/getRelationReturnType`,
      input,
    );
  }

  async getQueryCodeRelationReturnType(
    input: GetQueryCodeRelationReturnTypeInput,
  ): Promise<RelationType> {
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
    query: PlainObject<PersistentDataCubeQuery>,
    queryStoreBaseUrl: string,
  ): Promise<PlainObject<PersistentDataCubeQuery>> {
    return this.networkClient.post(`${queryStoreBaseUrl}`, query);
  }
}
