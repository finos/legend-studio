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
import type {
  DATA_CUBE_AGGREGATE_FUNCTION,
  DATA_CUBE_COLUMN_SORT_DIRECTION,
  DATA_CUBE_FILTER_OPERATION,
} from '../DataCubeMetaModelConst.js';

// export enum FILTER_OPERATION {
//   EQUALS = 'equal',
//   NOT_EQUAL = 'notEqual',
//   GREATER_THAN = 'greaterThan',
//   GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
//   LESS_THAN = 'lessThan',
//   LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
//   BLANK = 'isEmpty',
//   NOT_BLANK = 'isNotEmpty',
//   CONTAINS = 'contains',
//   NOT_CONTAINS = 'notContains',
//   STARTS_WITH = 'startsWith',
//   ENDS_WITH = 'endsWith',
// }

// export enum FILTER_GROUP {
//   AND = 'and',
//   OR = 'or',
// }

// export enum FILTER_TYPE {
//   TEXT = 'text',
//   NUMBER = 'number',
// }

// export class TDSFilterCondition {
//   operation!: TDS_FILTER_OPERATION;
//   value!: unknown;

//   constructor(operation: TDS_FILTER_OPERATION, value: unknown) {
//     this.operation = operation;
//     this.value = value;
//   }

//   static readonly serialization = new SerializationFactory(
//     createModelSchema(TDSFilterCondition, {
//       operation: primitive(),
//       value: primitive(),
//     }),
//   );
// }

// export class TDSFilter {
//   column!: string;
//   columnType!: PRIMITIVE_TYPE;
//   conditions!: TDSFilterCondition[];
//   groupOperation!: TDS_FILTER_GROUP;

//   constructor(
//     column: string,
//     columnType: PRIMITIVE_TYPE,
//     conditions: TDSFilterCondition[],
//     groupOperation: TDS_FILTER_GROUP,
//   ) {
//     this.column = column;
//     this.columnType = columnType;
//     this.conditions = conditions;
//     this.groupOperation = groupOperation;
//   }

//   static readonly serialization = new SerializationFactory(
//     createModelSchema(TDSFilter, {
//       column: primitive(),
//       columnType: primitive(),
//       conditions: list(
//         usingModelSchema(TDSFilterCondition.serialization.schema),
//       ),
//       groupOperation: primitive(),
//     }),
//   );
// }

export type DataCubeQueryFilterCondition = DataCubeQuerySnapshotColumn & {
  value: unknown;
  operation: DATA_CUBE_FILTER_OPERATION;
};

export type DataCubeQueryFilter = {
  groupOperation: string;
  conditions: (DataCubeQueryFilterCondition | DataCubeQueryFilter)[];
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
  direction: DATA_CUBE_COLUMN_SORT_DIRECTION;
};

export type DataCubeQuerySnapshotAggregateColumn =
  DataCubeQuerySnapshotColumn & {
    function: DATA_CUBE_AGGREGATE_FUNCTION;
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
