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
  type V1_Lambda,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
  type V1_ValueSpecification,
  TDSExecutionResult,
  V1_serializeExecutionResult,
  V1_buildExecutionResult,
} from '@finos/legend-graph';
import type { REPLServerClient } from '../../server/REPLServerClient.js';
import {
  DataCubeGetBaseQueryResult,
  type DataCubeInfrastructureInfo,
  type CompletionItem,
} from '../../server/REPLEngine.js';
import { guaranteeType } from '@finos/legend-shared';
import type { LegendREPLApplicationStore } from '../LegendREPLBaseStore.js';
import type { REPLStore } from '../REPLStore.js';
import { action, makeObservable, observable } from 'mobx';
import { DataCubeQueryFilterOperation__Equal } from './core/filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from './core/filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThan } from './core/filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from './core/filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThan } from './core/filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__NotEqual } from './core/filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__EqualColumn } from './core/filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from './core/filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from './core/filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from './core/filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from './core/filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from './core/filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from './core/filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from './core/filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from './core/filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from './core/filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__Contain } from './core/filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from './core/filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotContain } from './core/filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__StartWith } from './core/filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from './core/filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotStartWith } from './core/filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__EndWith } from './core/filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from './core/filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEndWith } from './core/filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__IsNull } from './core/filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__IsNotNull } from './core/filter/DataCubeQueryFilterOperation__IsNotNull.js';

export const DEFAULT_ENABLE_DEBUG_MODE = false;
export const DEFAULT_GRID_CLIENT_ROW_BUFFER = 50;
export const DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES = false;
export const DEFAULT_DISABLE_LARGE_DATASET_WARNING = false;

export class DataCubeEngine {
  readonly repl: REPLStore;
  readonly application: LegendREPLApplicationStore;
  private readonly client: REPLServerClient;

  readonly filterOperations = [
    new DataCubeQueryFilterOperation__LessThan(),
    new DataCubeQueryFilterOperation__LessThanOrEqual(),
    new DataCubeQueryFilterOperation__Equal(),
    new DataCubeQueryFilterOperation__NotEqual(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqual(),
    new DataCubeQueryFilterOperation__GreaterThan(),

    new DataCubeQueryFilterOperation__IsNull(),
    new DataCubeQueryFilterOperation__IsNotNull(),

    new DataCubeQueryFilterOperation__EqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitive(),
    new DataCubeQueryFilterOperation__Contain(),
    new DataCubeQueryFilterOperation__ContainCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotContain(),
    new DataCubeQueryFilterOperation__StartWith(),
    new DataCubeQueryFilterOperation__StartWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotStartWith(),
    new DataCubeQueryFilterOperation__EndWith(),
    new DataCubeQueryFilterOperation__EndWithCaseInsensitive(),
    new DataCubeQueryFilterOperation__NotEndWith(),

    new DataCubeQueryFilterOperation__LessThanColumn(),
    new DataCubeQueryFilterOperation__LessThanOrEqualColumn(),
    new DataCubeQueryFilterOperation__EqualColumn(),
    new DataCubeQueryFilterOperation__NotEqualColumn(),
    new DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn(),
    new DataCubeQueryFilterOperation__GreaterThanColumn(),
    new DataCubeQueryFilterOperation__GreaterThanOrEqualColumn(),
  ];

  enableDebugMode = DEFAULT_ENABLE_DEBUG_MODE;
  gridClientRowBuffer = DEFAULT_GRID_CLIENT_ROW_BUFFER;
  gridClientPurgeClosedRowNodes = DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES;
  disableLargeDatasetWarning = DEFAULT_DISABLE_LARGE_DATASET_WARNING;

  constructor(repl: REPLStore) {
    makeObservable(this, {
      enableDebugMode: observable,
      setEnableDebugMode: action,

      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      gridClientPurgeClosedRowNodes: observable,
      setGridClientPurgeClosedRowNodes: action,

      disableLargeDatasetWarning: observable,
      setDisableLargeDatasetWarning: action,
    });

    this.repl = repl;
    this.application = repl.application;
    this.client = repl.client;
  }

  setEnableDebugMode(enableDebugMode: boolean) {
    this.enableDebugMode = enableDebugMode;
  }

  setGridClientRowBuffer(rowBuffer: number) {
    this.gridClientRowBuffer = rowBuffer;
    this.propagateGridOptionUpdates();
  }

  setGridClientPurgeClosedRowNodes(purgeClosedRowNodes: boolean) {
    this.gridClientPurgeClosedRowNodes = purgeClosedRowNodes;
    this.propagateGridOptionUpdates();
  }

  setDisableLargeDatasetWarning(disableLargeDatasetWarning: boolean) {
    this.disableLargeDatasetWarning = disableLargeDatasetWarning;
  }

  refreshFailedDataFetches() {
    // TODO: When we support multi-view (i.e. multiple instances of DataCubes) we would need
    // to traverse through and update the configurations of all of their grid clients
    this.repl.dataCube.grid.client.retryServerSideLoads();
  }

  private propagateGridOptionUpdates() {
    // TODO: When we support multi-view (i.e. multiple instances of DataCubes) we would need
    // to traverse through and update the configurations of all of their grid clients
    this.repl.dataCube.grid.client.updateGridOptions({
      rowBuffer: this.gridClientRowBuffer,
      purgeClosedRowNodes: this.gridClientPurgeClosedRowNodes,
    });
  }

  async getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo> {
    return this.client.getInfrastructureInfo();
  }

  async getQueryTypeahead(
    code: string,
    isPartial?: boolean,
  ): Promise<CompletionItem[]> {
    return (await this.client.getQueryTypeahead({
      code,
      isPartial,
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
