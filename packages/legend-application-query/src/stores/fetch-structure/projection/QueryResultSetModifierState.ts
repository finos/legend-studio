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

import { action, makeAutoObservable } from 'mobx';
import type {
  QueryBuilderProjectionColumnState,
  QueryBuilderProjectionState,
} from './QueryBuilderProjectionState.js';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';

export enum COLUMN_SORT_TYPE {
  ASC,
  DESC,
}

export class SortColumnState {
  columnState: QueryBuilderProjectionColumnState;
  sortType = COLUMN_SORT_TYPE.ASC;

  constructor(columnState: QueryBuilderProjectionColumnState) {
    makeAutoObservable(this, {
      setColumnState: action,
      setSortType: action,
    });

    this.columnState = columnState;
  }

  setColumnState(val: QueryBuilderProjectionColumnState): void {
    this.columnState = val;
  }

  setSortType(val: COLUMN_SORT_TYPE): void {
    this.sortType = val;
  }
}

export class QueryResultSetModifierState {
  projectionState: QueryBuilderProjectionState;
  showModal = false;
  limit?: number | undefined;
  distinct = false;
  sortColumns: SortColumnState[] = [];

  constructor(projectionState: QueryBuilderProjectionState) {
    makeAutoObservable(this, {
      projectionState: false,
      setShowModal: action,
      setLimit: action,
      toggleDistinct: action,
      deleteSortColumn: action,
      addSortColumn: action,
      updateSortColumns: action,
    });

    this.projectionState = projectionState;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setLimit(val: number | undefined): void {
    this.limit = val === undefined || val <= 0 ? undefined : val;
  }

  toggleDistinct(): void {
    this.distinct = !this.distinct;
  }

  deleteSortColumn(val: SortColumnState): void {
    deleteEntry(this.sortColumns, val);
  }

  addSortColumn(val: SortColumnState): void {
    addUniqueEntry(this.sortColumns, val);
  }

  updateSortColumns(): void {
    this.sortColumns = this.sortColumns.filter((e) =>
      this.projectionState.columns.includes(e.columnState),
    );
  }
}
