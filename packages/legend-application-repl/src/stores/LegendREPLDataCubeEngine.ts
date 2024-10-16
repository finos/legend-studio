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
  GetBaseQueryResult,
  type LegendREPLServerClient,
} from './LegendREPLServerClient.js';
import {
  _elementPtr,
  _function,
  _lambda,
  DataCubeEngine,
  DataCubeFunction,
  type DataCubeSource,
  DEFAULT_ENABLE_DEBUG_MODE,
  DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
  DEFAULT_GRID_CLIENT_ROW_BUFFER,
  DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
} from '@finos/legend-data-cube';
import {
  TDSExecutionResult,
  type V1_AppliedFunction,
  V1_buildExecutionResult,
  V1_deserializeValueSpecification,
  V1_serializeExecutionResult,
  V1_serializeValueSpecification,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeType, isNonNullable } from '@finos/legend-shared';
import type { LegendREPLDataCubeApplicationEngine } from './LegendREPLDataCubeApplicationEngine.js';
import { LEGEND_REPL_SETTING_KEY } from '../__lib__/LegendREPLSetting.js';
import { LegendREPLDataCubeSource } from './LegendREPLDataCubeSource.js';

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
      this.application.getPersistedBooleanSettingValue(
        LEGEND_REPL_SETTING_KEY.ENABLE_DEBUG_MODE,
      ) ?? DEFAULT_ENABLE_DEBUG_MODE;
    this.gridClientRowBuffer =
      this.application.getPersistedNumericSettingValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_ROW_BUFFER,
      ) ?? DEFAULT_GRID_CLIENT_ROW_BUFFER;
    this.gridClientPurgeClosedRowNodes =
      this.application.getPersistedBooleanSettingValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
      ) ?? DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES;
    this.gridClientSuppressLargeDatasetWarning =
      this.application.getPersistedBooleanSettingValue(
        LEGEND_REPL_SETTING_KEY.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
      ) ?? DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING;
  }

  override setEnableDebugMode(value: boolean) {
    super.setEnableDebugMode(value);
    this.application.persistSettingValue(
      LEGEND_REPL_SETTING_KEY.ENABLE_DEBUG_MODE,
      value,
    );
  }

  override setGridClientRowBuffer(value: number) {
    super.setGridClientRowBuffer(value);
    this.application.persistSettingValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_ROW_BUFFER,
      value,
    );
  }

  override setGridClientPurgeClosedRowNodes(value: boolean) {
    super.setGridClientPurgeClosedRowNodes(value);
    this.application.persistSettingValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
      value,
    );
  }

  override setGridClientSuppressLargeDatasetWarning(value: boolean) {
    super.setGridClientSuppressLargeDatasetWarning(value);
    this.application.persistSettingValue(
      LEGEND_REPL_SETTING_KEY.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
      value,
    );
  }

  override async getInitialInput() {
    const baseQuery = GetBaseQueryResult.serialization.fromJson(
      await this.client.getBaseQuery(),
    );
    const source = new LegendREPLDataCubeSource();
    source.mapping = baseQuery.source.mapping;
    source.query = await this.parseValueSpecification(
      baseQuery.source.query,
      false,
    );
    source.runtime = baseQuery.source.runtime;
    source.timestamp = baseQuery.source.timestamp;
    source.sourceColumns = (
      await this.getQueryRelationType(_lambda([], [source.query]), source)
    ).columns;

    return {
      query: baseQuery.query,
      source,
    };
  }

  async fetchConfiguration() {
    const info = await this.client.getInfrastructureInfo();
    return {
      gridClientLicense: info.gridClientLicense,
    };
  }

  async parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean,
  ): Promise<V1_ValueSpecification> {
    return V1_deserializeValueSpecification(
      await this.client.parseValueSpecification({
        code,
        returnSourceInformation,
      }),
      [],
    );
  }

  override getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean,
  ) {
    return this.client.getValueSpecificationCode({
      value: V1_serializeValueSpecification(value, []),
      pretty,
    });
  }

  async getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    source: DataCubeSource,
  ) {
    return this.client.getQueryTypeahead({
      code,
      baseQuery: V1_serializeValueSpecification(baseQuery, []),
    });
  }

  async getQueryRelationType(query: V1_Lambda, source: DataCubeSource) {
    return this.client.getQueryRelationReturnType({
      query: V1_serializeValueSpecification(query, []),
    });
  }

  async getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ) {
    return this.client.getQueryCodeRelationReturnType({
      code,
      baseQuery: V1_serializeValueSpecification(baseQuery, []),
    });
  }

  async executeQuery(query: V1_Lambda, source: DataCubeSource) {
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

  override buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined {
    if (source instanceof LegendREPLDataCubeSource) {
      return _function(
        DataCubeFunction.FROM,
        [
          source.mapping ? _elementPtr(source.mapping) : undefined,
          _elementPtr(source.runtime),
        ].filter(isNonNullable),
      );
    }
    return undefined;
  }
}
