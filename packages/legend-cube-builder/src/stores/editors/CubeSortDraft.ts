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
  SortDirection,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** One row of the Sort editor: a column, `''` until picked, and its direction */
export interface CubeSortRow {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly column: string;
  readonly direction: SortDirection;
}

let nextRowKey = 1;

const blankRow = (): CubeSortRow => ({
  key: nextRowKey++,
  column: '',
  direction: SortDirection.ASC,
});

const isSameSorts = (
  a: readonly ColumnDirection[],
  b: readonly ColumnDirection[],
): boolean =>
  a.length === b.length &&
  a.every(
    (sort, index) =>
      sort.column === b[index]?.column &&
      sort.direction === b[index]?.direction,
  );

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
      ? original.sorts.map(({ column, direction }) => ({
          key: nextRowKey++,
          column,
          direction,
        }))
      : [blankRow()];
    this.initialKeys = this.keys;
  }

  /** Every row's key, a blank one included */
  private get keys(): ColumnDirection[] {
    return this.rows.map(({ column, direction }) => ({ column, direction }));
  }

  /** The keys the rows build, in order: a row without a column is left out */
  get sorts(): ColumnDirection[] {
    return this.keys.filter(({ column }) => column);
  }

  addRow(): void {
    this.rows = [...this.rows, blankRow()];
  }

  removeRow(key: number): void {
    this.rows = this.rows.filter((row) => row.key !== key);
  }

  /** Moves a row one place up (`-1`) or down (`1`), if it can go there */
  moveRow(key: number, offset: -1 | 1): void {
    const from = this.rows.findIndex((row) => row.key === key);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= this.rows.length) {
      return;
    }
    const rows = [...this.rows];
    [rows[from], rows[to]] = [
      rows[to] as CubeSortRow,
      rows[from] as CubeSortRow,
    ];
    this.rows = rows;
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
    return isSameSorts(this.keys, this.initialKeys)
      ? original
      : original.withSorts(this.sorts);
  }
}
