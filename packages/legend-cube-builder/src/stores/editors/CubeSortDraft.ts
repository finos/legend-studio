/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type ColumnDirection,
  type Sort,
  type SortDirection,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';
import {
  blankSortRow,
  type CubeSortRow,
  isSameSorts,
  movedSortRows,
  sortKeysOfRows,
  sortRowsOf,
  sortsOfRows,
} from './CubeSortRows.js';

/**
 * The Sort editor's draft (spec §17.6: a list of column and direction rows,
 * most significant first). A row without a column is left out when built, as
 * a Rename's blank rows are. While the rows are the ones it opened with, the
 * original is given back, so a saved key without a column (from an imported
 * spec) is kept until the rows change; removing its row removes it.
 */
export class CubeSortDraft extends CubeNodeDraft<Sort> {
  rows: readonly CubeSortRow[];
  /** The rows' keys when the editor opened, blank ones included */
  private readonly initialKeys: readonly ColumnDirection[];

  constructor(original: Sort) {
    super(original);
    makeObservable(this, {
      rows: observable.ref,
      addRow: action,
      removeRow: action,
      moveRow: action,
      setColumn: action,
      setDirection: action,
    });
    this.rows = original.sorts.length
      ? sortRowsOf(original.sorts)
      : [blankSortRow()];
    this.initialKeys = sortKeysOfRows(this.rows);
  }

  /** The keys the rows build, in order: a row without a column is left out */
  get sorts(): ColumnDirection[] {
    return sortsOfRows(this.rows);
  }

  addRow(): void {
    this.rows = [...this.rows, blankSortRow()];
  }

  removeRow(key: number): void {
    this.rows = this.rows.filter((row) => row.key !== key);
  }

  /** Moves a row one place up (`-1`) or down (`1`), if it can go there */
  moveRow(key: number, offset: -1 | 1): void {
    this.rows = movedSortRows(this.rows, key, offset);
  }

  setColumn(key: number, column: string): void {
    this.rows = this.rows.map((row) =>
      row.key === key ? { ...row, column } : row,
    );
  }

  setDirection(key: number, direction: SortDirection): void {
    this.rows = this.rows.map((row) =>
      row.key === key ? { ...row, direction } : row,
    );
  }

  build(): Sort {
    const { original } = this;
    return isSameSorts(sortKeysOfRows(this.rows), this.initialKeys)
      ? original
      : original.withSorts(this.sorts);
  }
}
