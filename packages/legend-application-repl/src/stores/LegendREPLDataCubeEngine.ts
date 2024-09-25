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

import { action, makeObservable, observable } from 'mobx';
import type { REPLServerClient } from '../server/REPLServerClient.js';
import { DataCubeEngine } from './dataCube/DataCubeEngine.js';
import {
  DataCubeGetBaseQueryResult,
  type CompletionItem,
  type DataCubeInfrastructureInfo,
  type RelationType,
} from '../server/REPLEngine.js';
import {
  TDSExecutionResult,
  V1_buildExecutionResult,
  V1_deserializeValueSpecification,
  V1_serializeExecutionResult,
  V1_serializeValueSpecification,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

export class LegendREPLDataCubeEngine extends DataCubeEngine {
  readonly client: REPLServerClient;

  constructor(client: REPLServerClient) {
    super();

    makeObservable(this, {
      enableDebugMode: observable,
      setEnableDebugMode: action,

      enableEngineDebugMode: observable,
      setEnableEngineDebugMode: action,

      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      gridClientPurgeClosedRowNodes: observable,
      setGridClientPurgeClosedRowNodes: action,

      gridClientSuppressLargeDatasetWarning: observable,
      setGridClientSuppressLargeDatasetWarning: action,
    });
    this.client = client;
  }

  async getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo> {
    return this.client.getInfrastructureInfo();
  }

  async getQueryTypeahead(
    code: string,
    query: V1_ValueSpecification,
  ): Promise<CompletionItem[]> {
    return (await this.client.getQueryTypeahead({
      code,
      baseQuery: V1_serializeValueSpecification(query, []),
    })) as CompletionItem[];
  }

  async parseQuery(
    code: string,
    returnSourceInformation?: boolean,
  ): Promise<V1_ValueSpecification> {
    return V1_deserializeValueSpecification(
      await this.client.parseQuery({ code, returnSourceInformation }),
      [],
    );
  }

  async getBaseQuery(): Promise<DataCubeGetBaseQueryResult> {
    return DataCubeGetBaseQueryResult.serialization.fromJson(
      await this.client.getBaseQuery(),
    );
  }

  async getQueryRelationType(
    query: V1_ValueSpecification,
  ): Promise<RelationType> {
    return this.client.getQueryRelationReturnType({
      query: V1_serializeValueSpecification(query, []),
    });
  }

  async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
  ): Promise<RelationType> {
    return this.client.getQueryCodeRelationReturnType({
      code,
      baseQuery: V1_serializeValueSpecification(baseQuery, []),
    });
  }

  async executeQuery(query: V1_Lambda): Promise<{
    result: TDSExecutionResult;
    executedQuery: string;
    executedSQL: string;
  }> {
    const result = await this.client.executeQuery({
      query: V1_serializeValueSpecification(query, []),
      debug: this.enableEngineDebugMode,
    });
    return {
      result: guaranteeType(
        V1_buildExecutionResult(
          V1_serializeExecutionResult(JSON.parse(result.result)),
        ),
        TDSExecutionResult,
      ),
      executedQuery: result.executedQuery,
      executedSQL: result.executedSQL,
    };
  }
}
