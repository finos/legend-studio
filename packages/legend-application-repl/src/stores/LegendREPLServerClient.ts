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
  assertErrorThrown,
  ContentType,
  guaranteeNonNullable,
  HttpHeader,
  HttpStatus,
  NetworkClientError,
  SerializationFactory,
  usingModelSchema,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import {
  DataCubeQuery,
  type CompletionItem,
  type RelationType,
} from '@finos/legend-data-cube';
import {
  V1_buildEngineError,
  V1_EngineError,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { createModelSchema, optional, primitive } from 'serializr';

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
  gridClientLicense?: string | undefined;
};

class QuerySource {
  runtime!: string;
  mapping?: string | undefined;
  query!: string;
  timestamp!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(QuerySource, {
      mapping: optional(primitive()),
      query: primitive(),
      runtime: primitive(),
      timestamp: primitive(),
    }),
  );
}

export class GetBaseQueryResult {
  query!: DataCubeQuery;
  source!: QuerySource;

  static readonly serialization = new SerializationFactory(
    createModelSchema(GetBaseQueryResult, {
      query: usingModelSchema(DataCubeQuery.serialization.schema),
      source: usingModelSchema(QuerySource.serialization.schema),
    }),
  );
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

  async getBaseQuery(): Promise<PlainObject<GetBaseQueryResult>> {
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
    try {
      return this.networkClient.post(
        `${this.dataCube}/getRelationReturnType/code`,
        input,
      );
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        throw V1_buildEngineError(
          V1_EngineError.serialization.fromJson(
            error.payload as PlainObject<V1_EngineError>,
          ),
        );
      }
      throw error;
    }
  }

  async executeQuery(
    input: PlainObject<ExecutionInput>,
  ): Promise<ExecutionResult> {
    return this.networkClient.post(`${this.dataCube}/executeQuery`, input);
  }
}
