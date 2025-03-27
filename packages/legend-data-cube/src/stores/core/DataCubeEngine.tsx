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
  type V1_ValueSpecification,
  type V1_Lambda,
  type TDSExecutionResult,
  type V1_AppliedFunction,
  PRIMITIVE_TYPE,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
  type V1_ExecuteInput,
} from '@finos/legend-graph';
import {
  getFilterOperation,
  getAggregateOperation,
} from './DataCubeQueryEngine.js';
import { DataCubeQueryAggregateOperation__Sum } from './aggregation/DataCubeQueryAggregateOperation__Sum.js';
import { DataCubeQueryAggregateOperation__Average } from './aggregation/DataCubeQueryAggregateOperation__Average.js';
import { DataCubeQueryAggregateOperation__Count } from './aggregation/DataCubeQueryAggregateOperation__Count.js';
import { DataCubeQueryAggregateOperation__Min } from './aggregation/DataCubeQueryAggregateOperation__Min.js';
import { DataCubeQueryAggregateOperation__Max } from './aggregation/DataCubeQueryAggregateOperation__Max.js';
import { DataCubeQueryAggregateOperation__UniqueValue } from './aggregation/DataCubeQueryAggregateOperation__UniqueValue.js';
import { DataCubeQueryAggregateOperation__First } from './aggregation/DataCubeQueryAggregateOperation__First.js';
import { DataCubeQueryAggregateOperation__Last } from './aggregation/DataCubeQueryAggregateOperation__Last.js';
import { DataCubeQueryAggregateOperation__VariancePopulation } from './aggregation/DataCubeQueryAggregateOperation__VariancePopulation.js';
import { DataCubeQueryAggregateOperation__VarianceSample } from './aggregation/DataCubeQueryAggregateOperation__VarianceSample.js';
import { DataCubeQueryAggregateOperation__StdDevPopulation } from './aggregation/DataCubeQueryAggregateOperation__StdDevPopulation.js';
import { DataCubeQueryAggregateOperation__StdDevSample } from './aggregation/DataCubeQueryAggregateOperation__StdDevSample.js';
import { DataCubeQueryAggregateOperation__JoinStrings } from './aggregation/DataCubeQueryAggregateOperation__JoinStrings.js';
import { DataCubeQueryFilterOperation__Equal } from './filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from './filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThan } from './filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThan } from './filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__NotEqual } from './filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__EqualColumn } from './filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from './filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from './filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__Contain } from './filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from './filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotContain } from './filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__StartWith } from './filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotStartWith } from './filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__EndWith } from './filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEndWith } from './filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__IsNull } from './filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__IsNotNull } from './filter/DataCubeQueryFilterOperation__IsNotNull.js';
import { DataCubeSnapshot } from './DataCubeSnapshot.js';
import { buildExecutableQuery } from './DataCubeQueryBuilder.js';
import { _toCol, type DataCubeColumn } from './model/DataCubeColumn.js';
import {
  type DataCubeSource,
  INTERNAL__DataCubeSource,
} from './model/DataCubeSource.js';
import {
  _primitiveValue,
  _selectFunction,
} from './DataCubeQueryBuilderUtils.js';
import {
  type DocumentationEntry,
  type LogEvent,
  type PlainObject,
} from '@finos/legend-shared';
import type { CachedDataCubeSource } from './model/CachedDataCubeSource.js';
import { DataCubeSpecification } from './model/DataCubeSpecification.js';
import { newConfiguration } from './DataCubeConfigurationBuilder.js';

export type CompletionItem = {
  completion: string;
  display: string;
};

export type DataCubeRelationType = {
  columns: DataCubeColumn[];
};

export type DataCubeExecutionOptions = {
  debug?: boolean | undefined;
  clientVersion?: string | undefined;
};

export type DataCubeCacheInitializationOptions = {
  debug?: boolean | undefined;
  clientVersion?: string | undefined;
};

export type DataCubeExecutionResult = {
  // TODO: we probably should simplify this shape down to exactly what needed by ag-grid to render and cache engine to produce
  result: TDSExecutionResult;
  executedQuery: string;
  executedSQL?: string | undefined;
  executionTime: number;
};

export class DataCubeExecutionError extends Error {
  executeInput?: PlainObject<V1_ExecuteInput> | undefined;
  queryCode?: string | undefined;
}

/**
 * This is the base engine of DataCube, it provides capabilities that DataCube cannot itself
 * handle, such as query execution, compilation, etc.
 *
 * Note that we want to make sure this class is stateless, since from the perspective of DataCube,
 * the engine simply should not hold any state. This does not mean any implementations of this engine
 * must be stateless as well, that's totally up to their authors.
 */
export abstract class DataCubeEngine {
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
  readonly aggregateOperations = [
    new DataCubeQueryAggregateOperation__Sum(),
    new DataCubeQueryAggregateOperation__Average(),
    new DataCubeQueryAggregateOperation__Count(),
    new DataCubeQueryAggregateOperation__Min(),
    new DataCubeQueryAggregateOperation__Max(),
    new DataCubeQueryAggregateOperation__UniqueValue(),
    new DataCubeQueryAggregateOperation__First(),
    new DataCubeQueryAggregateOperation__Last(),
    new DataCubeQueryAggregateOperation__VariancePopulation(),
    new DataCubeQueryAggregateOperation__VarianceSample(),
    new DataCubeQueryAggregateOperation__StdDevPopulation(),
    new DataCubeQueryAggregateOperation__StdDevSample(),
    new DataCubeQueryAggregateOperation__JoinStrings(),
  ];

  // ------------------------------- UTILITIES -------------------------------

  getFilterOperation(value: string) {
    return getFilterOperation(value, this.filterOperations);
  }

  getAggregateOperation(value: string) {
    return getAggregateOperation(value, this.aggregateOperations);
  }

  deserializeValueSpecification(json: PlainObject<V1_ValueSpecification>) {
    return V1_deserializeValueSpecification(json, []);
  }

  serializeValueSpecification(protocol: V1_ValueSpecification) {
    return V1_serializeValueSpecification(protocol, []);
  }

  /**
   * By default, for a function chain, Pure grammar composer will extract the first parameter of the first function
   * and render it as the caller of that function rather than a parameter
   * e.g. fx(fy(p1, p2), p3) will be rendered as p1->fy(p2)->fx(p3) instead of fy(p1, p2)-> fx(p3)
   *
   * We do a hack to get around this by setting a dummy value as the first parameter of the first function in the chain.
   * Then remove this dummy value from the final code.
   */
  async getPartialQueryCode(
    snapshot: DataCubeSnapshot,
    pretty?: boolean | undefined,
  ) {
    const source = new INTERNAL__DataCubeSource();
    source.query = _primitiveValue(PRIMITIVE_TYPE.STRING, '');
    return (
      await this.getValueSpecificationCode(
        buildExecutableQuery(snapshot, source, this, {
          skipExecutionContext: true,
        }),
        pretty,
      )
    ).substring(`''->`.length);
  }

  async generateBaseSpecification(
    sourceData: PlainObject,
    source: DataCubeSource,
  ) {
    const query = new DataCubeSpecification();
    query.source = sourceData;
    query.query = await this.getValueSpecificationCode(
      _selectFunction(source.columns),
    );
    const snapshot = DataCubeSnapshot.create({});
    snapshot.data.sourceColumns = source.columns.map(_toCol);
    snapshot.data.selectColumns = source.columns.map(_toCol);
    const configuration = newConfiguration({
      snapshot,
    });
    query.configuration = configuration;
    return query;
  }

  // ---------------------------------- PROCESSOR ----------------------------------

  abstract processSource(sourceData: PlainObject): Promise<DataCubeSource>;

  abstract parseValueSpecification(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification>;

  abstract getValueSpecificationCode(
    value: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string>;

  abstract getQueryTypeahead(
    code: string,
    baseQuery: V1_Lambda,
    context: DataCubeSource | PlainObject,
  ): Promise<CompletionItem[]>;

  abstract getQueryRelationReturnType(
    query: V1_Lambda,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType>;

  abstract getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
    source: DataCubeSource,
  ): Promise<DataCubeRelationType>;

  abstract executeQuery(
    query: V1_Lambda,
    source: DataCubeSource,
    options?: DataCubeExecutionOptions | undefined,
  ): Promise<DataCubeExecutionResult>;

  abstract buildExecutionContext(
    source: DataCubeSource,
  ): V1_AppliedFunction | undefined;

  // ---------------------------------- CACHING ----------------------------------

  async initializeCache(
    source: DataCubeSource,
    options?: DataCubeCacheInitializationOptions | undefined,
  ): Promise<CachedDataCubeSource | undefined> {
    return undefined;
  }

  async disposeCache(source: CachedDataCubeSource) {
    // do nothing
  }

  // ---------------------------------- APPLICATION ----------------------------------

  logDebug(message: string, ...data: unknown[]) {
    // do nothing
  }

  debugProcess(processName: string, ...data: [string, unknown][]) {
    // do nothing
  }

  logInfo(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logWarning(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logError(event: LogEvent, ...data: unknown[]) {
    // do nothing
  }

  logUnhandledError(error: Error) {
    // do nothing
  }

  logIllegalStateError(message: string, error?: Error) {
    // do nothing
  }

  getDocumentationEntry(key: string): DocumentationEntry | undefined {
    return undefined;
  }

  openLink(url: string) {
    // do nothing
  }

  sendTelemetry(event: string, data: PlainObject) {
    // do nothing
  }
}
