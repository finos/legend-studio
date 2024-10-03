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

import type { LegendREPLServerClient } from './LegendREPLServerClient.js';
import {
  DataCubeEngine,
  DataCubeGetBaseQueryResult,
  DEFAULT_ENABLE_DEBUG_MODE,
  DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
  DEFAULT_GRID_CLIENT_ROW_BUFFER,
  DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
  type CompletionItem,
  type DataCubeInfrastructureInfo,
  type RelationType,
} from '@finos/legend-data-cube';
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
import type { LegendREPLDataCubeApplicationEngine } from './LegendREPLDataCubeApplicationEngine.js';
import { LEGEND_REPL_SETTING_KEY } from '../__lib__/LegendREPLSetting.js';

export class LegendREPLDataCubeEngine extends DataCubeEngine {
  readonly application: LegendREPLDataCubeApplicationEngine;
  readonly client: LegendREPLServerClient;

  constructor(
    application: LegendREPLDataCubeApplicationEngine,
    client: LegendREPLServerClient,
  ) {
    super();

    this.application = application;
    this.client = client;

    this.enableDebugMode =
      this.application.getPersistedBooleanValue(
        LEGEND_REPL_SETTING_KEY.ENABLE_DEBUG_MODE,
      ) ?? DEFAULT_ENABLE_DEBUG_MODE;
    this.gridClientRowBuffer =
      this.application.getPersistedNumericValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_ROW_BUFFER,
      ) ?? DEFAULT_GRID_CLIENT_ROW_BUFFER;
    this.gridClientPurgeClosedRowNodes =
      this.application.getPersistedBooleanValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
      ) ?? DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES;
    this.gridClientSuppressLargeDatasetWarning =
      this.application.getPersistedBooleanValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
      ) ?? DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING;
  }

  override setEnableDebugMode(value: boolean) {
    super.setEnableDebugMode(value);
    this.application.persistValue(
      LEGEND_REPL_SETTING_KEY.ENABLE_DEBUG_MODE,
      value,
    );
  }

  override setGridClientRowBuffer(value: number) {
    super.setGridClientRowBuffer(value);
    this.application.persistValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_ROW_BUFFER,
      value,
    );
  }

  override setGridClientPurgeClosedRowNodes(value: boolean) {
    super.setGridClientPurgeClosedRowNodes(value);
    this.application.persistValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
      value,
    );
  }

  override setGridClientSuppressLargeDatasetWarning(value: boolean) {
    super.setGridClientSuppressLargeDatasetWarning(value);
    this.application.persistValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
      value,
    );
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

  override getQueryCode(
    query: V1_ValueSpecification,
    pretty?: boolean,
  ): Promise<string> {
    return this.client.getQueryCode({
      query: V1_serializeValueSpecification(query, []),
      pretty,
    });
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
      debug: this.enableDebugMode,
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
