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
  hashObject,
  pruneObject,
  uuid,
  type PlainObject,
  type Writable,
} from '@finos/legend-shared';
import type {
  DataCubeOperationValue,
  DataCubeQuerySortDirection,
} from './DataCubeQueryEngine.js';

export type DataCubeQuerySnapshotFilterCondition =
  DataCubeQuerySnapshotColumn & {
    value: DataCubeOperationValue | undefined;
    operator: string;
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
  direction: DataCubeQuerySortDirection;
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
  selectColumns: DataCubeQuerySnapshotColumn[];
  groupBy?: DataCubeQuerySnapshotGroupBy | undefined;
  pivot?: DataCubeQuerySnapshotPivot | undefined;
  groupExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  sortColumns: DataCubeQuerySnapshotSortColumn[];
  limit: number | undefined;
};

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

  isFinalized() {
    return this._finalized;
  }

  finalize() {
    if (this._finalized) {
      return this;
    }
    /**
     * NOTE: if this becomes a performance bottleneck, we can consider
     * more granular hashing strategy
     *
     * Here, we are just hashing the raw object, but we must ensure
     * to properly prune the snapshot data object before hashing
     * else there would be mismatch
     */
    this._hashCode = hashObject(pruneObject(this.data));
    this._finalized = true;
    return this;
  }

  get hashCode() {
    if (!this._finalized || !this._hashCode) {
      throw new IllegalStateError('Snapshot is not finalized');
    }
    return this._hashCode;
  }
}

export function _findCol<T extends DataCubeQuerySnapshotColumn>(
  cols: T[] | undefined,
  name: string,
): T | undefined {
  return cols?.find((c) => c.name === name);
}

export function _toCol(col: {
  name: string;
  type: string;
}): DataCubeQuerySnapshotColumn {
  return { name: col.name, type: col.type };
}

export const _sortByColName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);
