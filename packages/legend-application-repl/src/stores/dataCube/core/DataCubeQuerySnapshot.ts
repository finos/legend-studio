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

import type { V1_Lambda, V1_ValueSpecification } from '@finos/legend-graph';
import type { DataCubeConfiguration } from '../../../server/models/DataCubeQuery.js';
import { uuid, type PlainObject, type Writable } from '@finos/legend-shared';

export enum DataCubeQuerySnapshotAggregateFunction {
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  AVG = 'avg',
  FIRST = 'first',
  LAST = 'last',
}

export enum DataCubeQuerySnapshotFilterOperation {
  EQUAL = 'equal',
  NOT_EQUAL = 'notEqual',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  BLANK = 'isEmpty',
  NOT_BLANK = 'isNotEmpty',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export enum DataCubeQuerySnapshotSortDirection {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export type DataCubeQuerySnapshotFilterCondition =
  DataCubeQuerySnapshotColumn & {
    value: unknown;
    operation: DataCubeQuerySnapshotFilterOperation;
  };

export type DataCubeQueryFilter = {
  groupOperation: string;
  conditions: (DataCubeQuerySnapshotFilterCondition | DataCubeQueryFilter)[];
};

export type DataCubeQuerySnapshotColumn = {
  name: string;
  type: string;
};

export type DataCubeQuerySnapshotExtendedColumn =
  DataCubeQuerySnapshotColumn & {
    lambda: PlainObject<V1_Lambda>;
    code: string;
  };

export type DataCubeQuerySnapshotRenamedColumn = DataCubeQuerySnapshotColumn & {
  oldName: string;
};

export type DataCubeQuerySnapshotSortColumn = DataCubeQuerySnapshotColumn & {
  direction: DataCubeQuerySnapshotSortDirection;
};

export type DataCubeQuerySnapshotAggregateColumn =
  DataCubeQuerySnapshotColumn & {
    function: DataCubeQuerySnapshotAggregateFunction;
  };

export type DataCubeQuerySnapshot = {
  readonly uuid: string;
  timestamp: number;
  name: string;
  runtime: string;
  sourceQuery: PlainObject<V1_ValueSpecification>;
  configuration: DataCubeConfiguration;

  originalColumns: DataCubeQuerySnapshotColumn[];
  leafExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  filter?: DataCubeQueryFilter | undefined;

  groupByColumns: DataCubeQuerySnapshotColumn[];
  groupByExpandedKeys: string[];
  groupByAggColumns: DataCubeQuerySnapshotAggregateColumn[];
  groupByFilter?: DataCubeQueryFilter | undefined;

  pivotColumns: DataCubeQuerySnapshotColumn[];
  pivotAggColumns: DataCubeQuerySnapshotAggregateColumn[];
  castColumns: DataCubeQuerySnapshotColumn[];
  groupExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  selectColumns: DataCubeQuerySnapshotColumn[];
  sortColumns: DataCubeQuerySnapshotSortColumn[];
  limit: number | undefined;
};

// ------------------------------------- UTILITIES -------------------------------------

export function createSnapshot(
  name: string,
  runtime: string,
  sourceQuery: PlainObject<V1_ValueSpecification>,
  configuration: DataCubeConfiguration,
): DataCubeQuerySnapshot {
  return {
    uuid: uuid(),
    timestamp: Date.now(),
    name,
    runtime,
    sourceQuery,
    configuration,

    originalColumns: [],
    leafExtendedColumns: [],
    filter: undefined,
    groupByColumns: [],
    groupByExpandedKeys: [],
    groupByAggColumns: [],
    pivotColumns: [],
    pivotAggColumns: [],
    castColumns: [],
    groupExtendedColumns: [],
    groupByFilter: undefined,
    sortColumns: [],
    selectColumns: [],
    limit: undefined,
  };
}

export function cloneSnapshot(
  snapshot: DataCubeQuerySnapshot,
): DataCubeQuerySnapshot {
  const clone = JSON.parse(JSON.stringify(snapshot)) as DataCubeQuerySnapshot;
  (clone as Writable<DataCubeQuerySnapshot>).uuid = uuid();
  clone.timestamp = Date.now();
  return clone;
}
