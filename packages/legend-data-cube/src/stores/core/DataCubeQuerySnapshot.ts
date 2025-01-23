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

import type { V1_AppliedFunction, V1_Lambda } from '@finos/legend-graph';
import type { DataCubeConfiguration } from './model/DataCubeConfiguration.js';
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
import type { DataCubeColumn } from './model/DataCubeColumn.js';

export type DataCubeQuerySnapshotFilterCondition = DataCubeColumn & {
  value: DataCubeOperationValue;
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

export type DataCubeQuerySnapshotExtendedColumn = DataCubeColumn & {
  windowFn?: PlainObject<V1_AppliedFunction> | undefined;
  mapFn: PlainObject<V1_Lambda>;
  reduceFn?: PlainObject<V1_Lambda> | undefined;
};

export type DataCubeQuerySnapshotAggregateColumn = DataCubeColumn & {
  parameterValues: DataCubeOperationValue[];
  operator: string;
};

export type DataCubeQuerySnapshotSortColumn = DataCubeColumn & {
  direction: DataCubeQuerySortDirection;
};

export type DataCubeQuerySnapshotGroupBy = {
  columns: DataCubeColumn[];
};

export type DataCubeQuerySnapshotPivot = {
  columns: DataCubeColumn[];
  castColumns: DataCubeColumn[];
};

export type DataCubeQuerySnapshotProcessingContext = {
  snapshot: DataCubeQuerySnapshot;
  pivotAggColumns: DataCubeQuerySnapshotAggregateColumn[];
  pivotSortColumns: DataCubeQuerySnapshotSortColumn[];
  groupByAggColumns: DataCubeQuerySnapshotAggregateColumn[];
  groupBySortColumns: DataCubeQuerySnapshotSortColumn[];
};

export type DataCubeQuerySnapshotData = {
  configuration: PlainObject<DataCubeConfiguration>;
  sourceColumns: DataCubeColumn[];
  leafExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  filter?: DataCubeQuerySnapshotFilter | undefined;
  selectColumns: DataCubeColumn[];
  groupBy?: DataCubeQuerySnapshotGroupBy | undefined;
  pivot?: DataCubeQuerySnapshotPivot | undefined;
  groupExtendedColumns: DataCubeQuerySnapshotExtendedColumn[];
  sortColumns: DataCubeQuerySnapshotSortColumn[];
  limit: number | undefined;
};

export class DataCubeQuerySnapshot {
  readonly uuid = uuid();
  readonly data: DataCubeQuerySnapshotData;

  private _isPatchChange = false;
  private _finalized = false;
  private _hashCode?: string | undefined;

  private constructor(configuration: PlainObject<DataCubeConfiguration>) {
    this.data = {
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

  static create(configuration: PlainObject<DataCubeConfiguration>) {
    return new DataCubeQuerySnapshot(configuration);
  }

  /**
   * When we support undo/redo, patch changes should be grouped
   * together with the most recent non-patch change snapshot and treated
   * as a single step.
   *
   * e.g. if we have a stack of snapshots [A, B, C, D] where D is the current
   * snapshot and C is a patch change. When undo, we should go back to C.
   * When undo again, we should go back to A instead of B.
   */
  markAsPatchChange() {
    this._isPatchChange = true;
  }

  isPatchChange() {
    return this._isPatchChange;
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

  clone() {
    const clone = new DataCubeQuerySnapshot({});
    (clone.data as Writable<DataCubeQuerySnapshotData>) = JSON.parse(
      JSON.stringify(this.data),
    ) as DataCubeQuerySnapshotData;
    return clone;
  }

  /**
   * Only use this if an absolute identical clone is needed.
   * This should rarely be used, and ideally by core engine only.
   */
  INTERNAL__fullClone() {
    const clone = new DataCubeQuerySnapshot({});
    (clone as Writable<DataCubeQuerySnapshot>).uuid = this.uuid;
    (clone as Writable<DataCubeQuerySnapshot>).data = JSON.parse(
      JSON.stringify(this.data),
    ) as DataCubeQuerySnapshotData;
    clone._isPatchChange = this._isPatchChange;
    clone._finalized = this._finalized;
    clone._hashCode = this._hashCode;
    return clone;
  }
}
