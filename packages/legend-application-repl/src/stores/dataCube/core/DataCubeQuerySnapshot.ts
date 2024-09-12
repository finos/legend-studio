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
import type { DataCubeConfiguration } from './DataCubeConfiguration.js';
import {
  IllegalStateError,
  guaranteeNonNullable,
  hashObject,
  pruneObject,
  uuid,
  type PlainObject,
  type Writable,
} from '@finos/legend-shared';
import type { DataCubeOperationValue } from './DataCubeQueryEngine.js';

export type DataCubeQuerySnapshotFilterCondition =
  DataCubeQuerySnapshotColumn & {
    value: DataCubeOperationValue | undefined;
    operation: string;
    not?: boolean | undefined;
  };

export type DataCubeQuerySnapshotFilter = {
  groupOperator: string;
  conditions: (
    | DataCubeQuerySnapshotFilterCondition
    | DataCubeQuerySnapshotFilter
  )[];
  not?: boolean | undefined;
};

export type DataCubeQuerySnapshotColumn = {
  name: string;
  type: string;
};

export type DataCubeQuerySnapshotExtendedColumn =
  DataCubeQuerySnapshotColumn & {
    _type: string;
  };

export type DataCubeQuerySnapshotSimpleExtendedColumn =
  DataCubeQuerySnapshotExtendedColumn & {
    lambda: PlainObject<V1_Lambda>;
  };

export type DataCubeQuerySnapshotSortColumn = DataCubeQuerySnapshotColumn & {
  operation: string;
};

export type DataCubeQuerySnapshotGroupBy = {
  columns: DataCubeQuerySnapshotColumn[];
};

export type DataCubeQuerySnapshotPivot = {
  columns: DataCubeQuerySnapshotColumn[];
  castColumns: DataCubeQuerySnapshotColumn[];
};

export type DataCubeQuerySnapshotData = {
  name: string;
  runtime: string;
  mapping: string | undefined;
  sourceQuery: PlainObject<V1_ValueSpecification>;
  configuration: PlainObject<DataCubeConfiguration>;
  sourceColumns: DataCubeQuerySnapshotColumn[];
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

  private _finalized = false;
  private _hashCode?: string | undefined;

  private constructor(
    name: string,
    runtime: string,
    mapping: string | undefined,
    sourceQuery: PlainObject<V1_ValueSpecification>,
    configuration: PlainObject<DataCubeConfiguration>,
  ) {
    this.data = {
      name,
      runtime,
      mapping,
      sourceQuery,
      configuration,
      sourceColumns: [],
      leafExtendedColumns: [],
      selectColumns: [],
      filter: undefined,
      groupBy: undefined,
      pivot: undefined,
      groupExtendedColumns: [],
      sortColumns: [],
      limit: undefined,
    };
  }

  static create(
    name: string,
    runtime: string,
    mapping: string | undefined,
    sourceQuery: PlainObject<V1_ValueSpecification>,
    configuration: PlainObject<DataCubeConfiguration>,
  ) {
    return new DataCubeQuerySnapshot(
      name,
      runtime,
      mapping,
      sourceQuery,
      configuration,
    );
  }

  clone() {
    const clone = new DataCubeQuerySnapshot('', '', '', {}, {});
    (clone.data as Writable<DataCubeQuerySnapshotData>) = JSON.parse(
      JSON.stringify(this.data),
    ) as DataCubeQuerySnapshotData;
    return clone;
  }

  /**
   * Get available columns at a certain stage of the query
   */
  stageCols(stage: DataCubeQuerySnapshotStage) {
    switch (stage) {
      case 'leaf-extend':
        return [...this.data.sourceColumns];
      case 'filter':
      case 'select':
        return [...this.data.sourceColumns, ...this.data.leafExtendedColumns];
      case 'aggregation':
        return [...this.data.selectColumns];
      case 'group-extend':
        // TODO: @akphi - add pivot columns
        return [...this.data.selectColumns];
      case 'sort':
        return [...this.data.selectColumns, ...this.data.groupExtendedColumns];
      default:
        throw new IllegalStateError(`Unknown stage '${stage}'`);
    }
  }

  isFinalized() {
    return this._finalized;
  }

  finalize() {
    if (this._finalized) {
      return this;
    }
    this._hashCode = this.computeHashCode();
    this._finalized = true;
    return this;
  }

  get hashCode() {
    if (!this._finalized || !this._hashCode) {
      throw new IllegalStateError('Snapshot is not finalized');
    }
    return this._hashCode;
  }

  /**
   * NOTE: if this becomes a performance bottleneck, we can consider
   * more granular hashing strategy
   *
   * Here, we are just hashing the raw object, but we must ensure
   * to properly prune the snapshot data object before hashing
   * else there would be mismatch
   */
  private computeHashCode() {
    return hashObject(pruneObject(this.data));
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
