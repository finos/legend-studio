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
import type { DataCubeConfiguration } from '../../../server/models/DataCubeConfiguration.js';
import {
  IllegalStateError,
  guaranteeNonNullable,
  uuid,
  type PlainObject,
  type Writable,
} from '@finos/legend-shared';

export enum DataCubeQuerySnapshotAggregateFunction {
  AVERAGE = 'average',
  COUNT = 'count',
  DISTINCT = 'distinct',
  FIRST = 'first',
  JOIN_STRINGS = 'joinStrings',
  LAST = 'last',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  STD_DEV_POPULATION = 'stdDevPopulation',
  STD_DEV_SAMPLE = 'stdDevSample',
  UNIQUE_VALUE_ONLY = 'uniqueValueOnly',
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

export enum DataCubeQuerySnapshotSortOperation {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export enum DataCubeQueryFilterGroupOperation {
  AND = 'AND',
  OR = 'OR',
}

export type DataCubeQuerySnapshotFilterCondition =
  DataCubeQuerySnapshotColumn & {
    value: unknown;
    operation: DataCubeQuerySnapshotFilterOperation;
  };

export type DataCubeQuerySnapshotFilter = {
  groupOperation: DataCubeQueryFilterGroupOperation;
  conditions: (
    | DataCubeQuerySnapshotFilterCondition
    | DataCubeQuerySnapshotFilter
  )[];
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

export type DataCubeQuerySnapshotSortColumn = DataCubeQuerySnapshotColumn & {
  operation: DataCubeQuerySnapshotSortOperation;
};

export type DataCubeQuerySnapshotAggregateColumn =
  DataCubeQuerySnapshotColumn & {
    function: DataCubeQuerySnapshotAggregateFunction;
  };

export type DataCubeQuerySnapshotGroupBy = {
  columns: DataCubeQuerySnapshotColumn[];
  aggColumns: DataCubeQuerySnapshotAggregateColumn[];
};

export type DataCubeQuerySnapshotPivot = {
  columns: DataCubeQuerySnapshotColumn[];
  aggColumns: DataCubeQuerySnapshotAggregateColumn[];
  castColumns: DataCubeQuerySnapshotColumn[];
};

export type DataCubeQuerySnapshotData = {
  name: string;
  runtime: string;
  sourceQuery: PlainObject<V1_ValueSpecification>;
  configuration: PlainObject<DataCubeConfiguration>;
  originalColumns: DataCubeQuerySnapshotColumn[];
  leafExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  filter?: DataCubeQuerySnapshotFilter | undefined;
  groupBy?: DataCubeQuerySnapshotGroupBy | undefined;
  pivot?: DataCubeQuerySnapshotPivot | undefined;
  groupExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  selectColumns: DataCubeQuerySnapshotColumn[];
  sortColumns: DataCubeQuerySnapshotSortColumn[];
  limit: number | undefined;
};

type DataCubeQuerySnapshotStage =
  | 'leaf-extend'
  | 'filter'
  | 'aggregation'
  | 'group-extend'
  | 'select'
  | 'sort';

export class DataCubeQuerySnapshot {
  readonly uuid = uuid();
  timestamp = Date.now();
  readonly data: DataCubeQuerySnapshotData;

  private constructor(
    name: string,
    runtime: string,
    sourceQuery: PlainObject<V1_ValueSpecification>,
    configuration: PlainObject<DataCubeConfiguration>,
  ) {
    this.data = {
      name,
      runtime,
      sourceQuery,
      configuration,
      originalColumns: [],
      leafExtendedColumns: [],
      filter: undefined,
      groupBy: undefined,
      pivot: undefined,
      groupExtendedColumns: [],
      selectColumns: [],
      sortColumns: [],
      limit: undefined,
    };
  }

  static create(
    name: string,
    runtime: string,
    sourceQuery: PlainObject<V1_ValueSpecification>,
    configuration: PlainObject<DataCubeConfiguration>,
  ) {
    return new DataCubeQuerySnapshot(name, runtime, sourceQuery, configuration);
  }

  clone(): DataCubeQuerySnapshot {
    const clone = new DataCubeQuerySnapshot('', '', {}, {});
    (clone.data as Writable<DataCubeQuerySnapshotData>) = JSON.parse(
      JSON.stringify(this.data),
    ) as DataCubeQuerySnapshotData;
    return clone;
  }

  /**
   * Get available columns at a certain stage of the query
   */
  stageCols(stage: DataCubeQuerySnapshotStage): DataCubeQuerySnapshotColumn[] {
    switch (stage) {
      case 'leaf-extend':
        return [...this.data.originalColumns];
      case 'filter':
      case 'aggregation':
        return [...this.data.originalColumns, ...this.data.leafExtendedColumns];
      case 'group-extend':
        // TODO: @akphi - add pivot columns
        return [...this.data.originalColumns, ...this.data.leafExtendedColumns];
      case 'select':
        // TODO: @akphi - add pivot columns
        return [
          ...this.data.originalColumns,
          ...this.data.leafExtendedColumns,
          ...this.data.groupExtendedColumns,
        ];
      case 'sort':
        return [...this.data.selectColumns];
      default:
        throw new IllegalStateError(`Unknown stage '${stage}'`);
    }
  }
}

export function _findCol<T extends DataCubeQuerySnapshotColumn>(
  cols: T[] | undefined,
  name: string,
): T | undefined {
  return cols?.find((c) => c.name === name);
}

export function _getCol<T extends DataCubeQuerySnapshotColumn>(
  cols: T[] | undefined,
  name: string,
): T {
  return guaranteeNonNullable(
    cols?.find((c) => c.name === name),
    `Can't find column '${name}'`,
  );
}
