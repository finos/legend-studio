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
  guaranteeNonNullable,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import type {
  CompletionItem,
  DataCubeGetQueryCodeInput,
  DataCubeGetQueryRelationReturnTypeInput,
  DataCubeParseQueryInput,
  DataCubeQueryTypeaheadInput,
  RelationType,
  DataCubeExecutionInput,
  DataCubeExecutionResult,
  DataCubeGetBaseQueryResult,
  DataCubeInfrastructureInfo,
  DataCubeGetQueryCodeRelationReturnTypeInput,
} from './REPLEngine.js';
import type { V1_ValueSpecification } from '@finos/legend-graph';

export class REPLServerClient {
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

  async getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo> {
    return this.networkClient.get(`${this.dataCube}/infrastructureInfo`);
  }

  async getQueryTypeahead(
    input: DataCubeQueryTypeaheadInput,
  ): Promise<PlainObject<CompletionItem>[]> {
    return this.networkClient.post(`${this.dataCube}/typeahead`, input);
  }

  // TODO: @akphi - we might need to support batch, source information offset, etc.
  async parseQuery(
    input: DataCubeParseQueryInput,
  ): Promise<PlainObject<V1_ValueSpecification>> {
    return this.networkClient.post(`${this.dataCube}/parseQuery`, input);
  }
  async getQueryCode(
    input: DataCubeGetQueryCodeInput,
  ): Promise<PlainObject<string>> {
    return this.networkClient.post(`${this.dataCube}/getQueryCode`, input);
  }

  async getBaseQuery(): Promise<PlainObject<DataCubeGetBaseQueryResult>> {
    return this.networkClient.get(`${this.dataCube}/getBaseQuery`);
  }

  async getRelationReturnType(
    input: DataCubeGetQueryRelationReturnTypeInput,
  ): Promise<RelationType> {
    return this.networkClient.post(
      `${this.dataCube}/getRelationReturnType`,
      input,
    );
  }

  async getQueryCodeRelationReturnType(
    input: DataCubeGetQueryCodeRelationReturnTypeInput,
  ): Promise<RelationType> {
    return this.networkClient.post(
      `${this.dataCube}/getRelationReturnType/code`,
      input,
    );
  }

  async executeQuery(
    input: PlainObject<DataCubeExecutionInput>,
  ): Promise<DataCubeExecutionResult> {
    return this.networkClient.post(`${this.dataCube}/executeQuery`, input);
  }
}
