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

import { action, computed, makeObservable, observable } from 'mobx';
import type { QueryBuilderTDSState } from './QueryBuilderTDSState.js';
import { addUniqueEntry, type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../QueryBuilderStateHashUtils.js';
import type { QueryBuilderTDSColumnState } from './QueryBuilderTDSColumnState.js';
import { COLUMN_SORT_TYPE } from '../../../graph/QueryBuilderMetaModelConst.js';

export class SortColumnState implements Hashable {
  columnState: QueryBuilderTDSColumnState;
  sortType = COLUMN_SORT_TYPE.ASC;

  constructor(columnState: QueryBuilderTDSColumnState) {
    makeObservable(this, {
      columnState: observable,
      sortType: observable,
      setColumnState: action,
      setSortType: action,
      hashCode: computed,
    });

    this.columnState = columnState;
  }

  setColumnState(val: QueryBuilderTDSColumnState): void {
    this.columnState = val;
  }

  setSortType(val: COLUMN_SORT_TYPE): void {
    this.sortType = val;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.SORT_COLUMN_STATE,
      this.sortType.toString(),
      this.columnState,
    ]);
  }
}

export class QueryResultSetModifierState implements Hashable {
  readonly tdsState: QueryBuilderTDSState;
  showModal = false;
  limit?: number | undefined;
  distinct = false;
  sortColumns: SortColumnState[] = [];
  slice: [number, number] | undefined;

  constructor(tdsState: QueryBuilderTDSState) {
    makeObservable(this, {
      showModal: observable,
      limit: observable,
      distinct: observable,
      sortColumns: observable,
      slice: observable.ref,
      setShowModal: action,
      setLimit: action,
      setDistinct: action,
      setSortColumns: action,
      addSortColumn: action,
      updateSortColumns: action,
      setSlice: action,
      reset: action,
      hashCode: computed,
    });

    this.tdsState = tdsState;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setLimit(val: number | undefined): void {
    this.limit = val === undefined || val <= 0 ? undefined : val;
  }

  setDistinct(val: boolean): void {
    this.distinct = val;
  }

  setSortColumns(val: SortColumnState[]): void {
    this.sortColumns = val;
  }

  addSortColumn(val: SortColumnState): void {
    addUniqueEntry(this.sortColumns, val);
  }

  updateSortColumns(): void {
    this.sortColumns = this.sortColumns.filter((colState) =>
      this.tdsState.tdsColumns.includes(colState.columnState),
    );
  }

  setSlice(slice: [number, number] | undefined): void {
    this.slice = slice;
  }

  reset(): void {
    this.sortColumns = [];
    this.distinct = false;
    this.limit = undefined;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.RESULT_SET_MODIFIER_STATE,
      hashArray(this.sortColumns),
      this.limit?.toString() ?? '',
      this.distinct.toString(),
    ]);
  }
}
