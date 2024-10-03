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
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
  V1_CString,
} from '@finos/legend-graph';
import { getFilterOperation } from '../core/filter/DataCubeQueryFilterOperation.js';
import { getAggregateOperation } from '../core/aggregation/DataCubeQueryAggregateOperation.js';
import { DataCubeQueryAggregateOperation__Sum } from '../core/aggregation/DataCubeQueryAggregateOperation__Sum.js';
import { DataCubeQueryAggregateOperation__Average } from '../core/aggregation/DataCubeQueryAggregateOperation__Average.js';
import { DataCubeQueryAggregateOperation__Count } from '../core/aggregation/DataCubeQueryAggregateOperation__Count.js';
import { DataCubeQueryAggregateOperation__Min } from '../core/aggregation/DataCubeQueryAggregateOperation__Min.js';
import { DataCubeQueryAggregateOperation__Max } from '../core/aggregation/DataCubeQueryAggregateOperation__Max.js';
import { DataCubeQueryAggregateOperation__UniqueValue } from '../core/aggregation/DataCubeQueryAggregateOperation__UniqueValue.js';
import { DataCubeQueryAggregateOperation__First } from '../core/aggregation/DataCubeQueryAggregateOperation__First.js';
import { DataCubeQueryAggregateOperation__Last } from '../core/aggregation/DataCubeQueryAggregateOperation__Last.js';
import { DataCubeQueryAggregateOperation__VariancePopulation } from '../core/aggregation/DataCubeQueryAggregateOperation__VariancePopulation.js';
import { DataCubeQueryAggregateOperation__VarianceSample } from '../core/aggregation/DataCubeQueryAggregateOperation__VarianceSample.js';
import { DataCubeQueryAggregateOperation__StdDevPopulation } from '../core/aggregation/DataCubeQueryAggregateOperation__StdDevPopulation.js';
import { DataCubeQueryAggregateOperation__StdDevSample } from '../core/aggregation/DataCubeQueryAggregateOperation__StdDevSample.js';
import { DataCubeQueryAggregateOperation__JoinStrings } from '../core/aggregation/DataCubeQueryAggregateOperation__JoinStrings.js';
import { DataCubeQueryFilterOperation__Equal } from '../core/filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from '../core/filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThan } from '../core/filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from '../core/filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__GreaterThan } from '../core/filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__NotEqual } from '../core/filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__EqualColumn } from '../core/filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from '../core/filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from '../core/filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from '../core/filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from '../core/filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from '../core/filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from '../core/filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from '../core/filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from '../core/filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from '../core/filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__Contain } from '../core/filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from '../core/filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotContain } from '../core/filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__StartWith } from '../core/filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from '../core/filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotStartWith } from '../core/filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__EndWith } from '../core/filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from '../core/filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEndWith } from '../core/filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__IsNull } from '../core/filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__IsNotNull } from '../core/filter/DataCubeQueryFilterOperation__IsNotNull.js';
import { LicenseManager } from '@ag-grid-enterprise/core';
import {
  configureCodeEditor,
  setupPureLanguageService,
} from '@finos/legend-code-editor';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, custom, primitive } from 'serializr';
import { type DataCubeQueryColumn, DataCubeQuery } from './DataCubeQuery.js';
import { DataCubeFont } from '../core/DataCubeQueryEngine.js';
import { action, makeObservable, observable } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import { buildExecutableQuery } from './DataCubeQueryBuilder.js';

export type CompletionItem = {
  completion: string;
  display: string;
};

export type DataCubeQueryBuilderError = {
  type: string;
  message: string;
  sourceInformation?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
};

export type DataCubeInfrastructureInfo = {
  gridClientLicense?: string | undefined;
  simpleSampleDataTableName: string;
  complexSampleDataTableName: string;
};

export type RelationType = {
  columns: DataCubeQueryColumn[];
};

export class DataCubeGetBaseQueryResult {
  query!: DataCubeQuery;
  timestamp!: number;
  partialQuery!: V1_ValueSpecification;
  sourceQuery!: V1_ValueSpecification;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeGetBaseQueryResult, {
      partialQuery: custom(
        (val) => V1_serializeValueSpecification(val, []),
        (val) => V1_deserializeValueSpecification(val, []),
      ),
      query: usingModelSchema(DataCubeQuery.serialization.schema),
      sourceQuery: custom(
        (val) => V1_serializeValueSpecification(val, []),
        (val) => V1_deserializeValueSpecification(val, []),
      ),
      timestamp: primitive(),
    }),
  );
}

export const DEFAULT_ENABLE_DEBUG_MODE = false;
export const DEFAULT_GRID_CLIENT_ROW_BUFFER = 50;
export const DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES = false;
export const DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING = false;

export abstract class DataCubeEngine {
  gridClientLicense?: string | undefined;
  gridClientTaskRunner?:
    | ((task: (gridClient: GridApi) => void) => void)
    | undefined;

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

  enableDebugMode = DEFAULT_ENABLE_DEBUG_MODE;

  gridClientRowBuffer = DEFAULT_GRID_CLIENT_ROW_BUFFER;
  gridClientPurgeClosedRowNodes = DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES;
  gridClientSuppressLargeDatasetWarning =
    DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING;

  constructor() {
    makeObservable(this, {
      enableDebugMode: observable,
      setEnableDebugMode: action,

      gridClientRowBuffer: observable,
      setGridClientRowBuffer: action,

      gridClientPurgeClosedRowNodes: observable,
      setGridClientPurgeClosedRowNodes: action,

      gridClientSuppressLargeDatasetWarning: observable,
      setGridClientSuppressLargeDatasetWarning: action,
    });
  }

  getFilterOperation(value: string) {
    return getFilterOperation(value, this.filterOperations);
  }

  getAggregateOperation(value: string) {
    return getAggregateOperation(value, this.aggregateOperations);
  }

  setEnableDebugMode(value: boolean) {
    this.enableDebugMode = value;
  }

  setGridClientRowBuffer(value: number) {
    this.gridClientRowBuffer = value;
    this.propagateGridOptionUpdates();
  }

  setGridClientPurgeClosedRowNodes(value: boolean) {
    this.gridClientPurgeClosedRowNodes = value;
    this.propagateGridOptionUpdates();
  }

  setGridClientSuppressLargeDatasetWarning(value: boolean) {
    this.gridClientSuppressLargeDatasetWarning = value;
  }

  async initialize(): Promise<void> {
    const info = await this.getInfrastructureInfo();
    if (info.gridClientLicense) {
      this.gridClientLicense = info.gridClientLicense;
      LicenseManager.setLicenseKey(info.gridClientLicense);
    }

    await configureCodeEditor(DataCubeFont.ROBOTO_MONO, (error) => {
      throw error;
    });
    setupPureLanguageService({});
  }

  private propagateGridOptionUpdates() {
    this.gridClientTaskRunner?.((client) => {
      client.updateGridOptions({
        rowBuffer: this.gridClientRowBuffer,
        purgeClosedRowNodes: this.gridClientPurgeClosedRowNodes,
      });
    });
  }

  refreshFailedDataFetches() {
    this.gridClientTaskRunner?.((client) => {
      client.retryServerSideLoads();
    });
  }

  abstract getInfrastructureInfo(): Promise<DataCubeInfrastructureInfo>;

  abstract getQueryTypeahead(
    code: string,
    query: V1_ValueSpecification,
  ): Promise<CompletionItem[]>;

  abstract parseQuery(
    code: string,
    returnSourceInformation?: boolean | undefined,
  ): Promise<V1_ValueSpecification>;

  abstract getQueryCode(
    query: V1_ValueSpecification,
    pretty?: boolean | undefined,
  ): Promise<string>;

  abstract getBaseQuery(): Promise<DataCubeGetBaseQueryResult>;

  abstract getQueryRelationType(
    query: V1_ValueSpecification,
  ): Promise<RelationType>;

  abstract getQueryCodeRelationReturnType(
    code: string,
    baseQuery: V1_ValueSpecification,
  ): Promise<RelationType>;

  abstract executeQuery(query: V1_Lambda): Promise<{
    result: TDSExecutionResult;
    executedQuery: string;
    executedSQL: string;
  }>;

  /**
   * By default, for a function chain, Pure grammar composer will extract the first parameter of the first function
   * and render it as the caller of that function rather than a parameter
   * e.g. fx(fy(p1, p2), p3) will be rendered as p1->fy(p2)->fx(p3) instead of fy(p1, p2)-> fx(p3)
   *
   * We do a hack to get around this by setting a dummy value as the first parameter of the first function in the chain.
   * Then remove this dummy value from the final code.
   */
  async getPartialQueryCode(
    snapshot: DataCubeQuerySnapshot,
    pretty?: boolean | undefined,
  ) {
    const dummySourceQuery = new V1_CString();
    dummySourceQuery.value = '';
    return (
      await this.getQueryCode(
        buildExecutableQuery(
          snapshot,
          this.filterOperations,
          this.aggregateOperations,
          {
            sourceQuery: dummySourceQuery,
          },
        ),
        true,
      )
    ).substring(`''->`.length);
  }
}
