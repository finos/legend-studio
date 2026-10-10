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

import type {
  AggregationUse,
  ColumnAggregation,
  ColumnDirection,
  Partition,
  Schema,
  SortDirection,
} from '@finos/legend-cube';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  aggregationRowsOf,
  aggregationsOfRows,
  blankAggregationRow,
  type CubeAggregationRow,
  isBuiltAggregationRow,
  isSameAggregations,
  isSameList,
  toggledColumns,
  withRowColumn,
  withRowFunction,
  withRowName,
} from './CubeAggregationRows.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';
import {
  blankSortRow,
  type CubeSortRow,
  isSameSorts,
  movedSortRows,
  sortRowsOf,
  sortsOfRows,
} from './CubeSortRows.js';

/**
 * The Partition editor's draft (spec §17.6, PLAN §11.6): rows of window
 * function column, function and output name, as a Group's (one blank row to
 * start), the partition columns, stored in the input's order but kept in a
 * saved order until the picks change (M4's Q2), and sort rows, as a Sort's
 * (none to start). A row's name follows its column and function until typed.
 * Picking a column first sets Count; Count rows and the rank functions clear
 * the column, which they can't hold. Until something changes, `build()`
 * gives the original back, a saved sort key without a column included.
 */
export class CubePartitionDraft extends CubeNodeDraft<Partition> {
  columns: readonly string[];
  sortRows: readonly CubeSortRow[];
  rows: readonly CubeAggregationRow[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Partition) {
    super(original);
    makeObservable<CubePartitionDraft, 'touched'>(this, {
      columns: observable.ref,
      sortRows: observable.ref,
      rows: observable.ref,
      touched: observable,
      sorts: computed,
      aggregationUse: computed,
      aggregations: computed,
      toggleColumn: action,
      clearColumns: action,
      addSortRow: action,
      removeSortRow: action,
      moveSortRow: action,
      setSortColumn: action,
      setSortDirection: action,
      addRow: action,
      removeRow: action,
      setColumn: action,
      setFunction: action,
      setName: action,
    });
    this.columns = original.columns;
    this.sortRows = sortRowsOf(original.sorts);
    this.rows = aggregationRowsOf(
      original.aggregations,
      original.aggregationUse,
    );
  }

  /** The sort keys the rows build, in order: a row without a column is left out */
  get sorts(): ColumnDirection[] {
    return sortsOfRows(this.sortRows);
  }

  /** Where the rows' functions are: a window, sorted when a sort row has a column */
  get aggregationUse(): AggregationUse {
    return { kind: 'window', sorted: this.sorts.length > 0 };
  }

  /** The window functions the rows build, in order (`isBuiltAggregationRow`) */
  get aggregations(): ColumnAggregation[] {
    return aggregationsOfRows(this.rows, this.aggregationUse);
  }

  /** Whether a row builds a window function */
  isBuiltRow(row: CubeAggregationRow): boolean {
    return isBuiltAggregationRow(row, this.aggregationUse);
  }

  /** Ticks or unticks a partition column; the columns then follow the input's order */
  toggleColumn(name: string, schema: Schema): void {
    this.columns = toggledColumns(this.columns, name, schema);
    this.touched = true;
  }

  /** Unticks every partition column: one window over all the rows */
  clearColumns(): void {
    this.columns = [];
    this.touched = true;
  }

  addSortRow(): void {
    this.sortRows = [...this.sortRows, blankSortRow()];
    this.touched = true;
  }

  removeSortRow(key: number): void {
    this.sortRows = this.sortRows.filter((row) => row.key !== key);
    this.touched = true;
  }

  /** Moves a sort row one place up (`-1`) or down (`1`), if it can go there */
  moveSortRow(key: number, offset: -1 | 1): void {
    this.sortRows = movedSortRows(this.sortRows, key, offset);
    this.touched = true;
  }

  setSortColumn(key: number, column: string): void {
    this.sortRows = this.sortRows.map((row) =>
      row.key === key ? { ...row, column } : row,
    );
    this.touched = true;
  }

  setSortDirection(key: number, direction: SortDirection): void {
    this.sortRows = this.sortRows.map((row) =>
      row.key === key ? { ...row, direction } : row,
    );
    this.touched = true;
  }

  addRow(): void {
    this.rows = [...this.rows, blankAggregationRow()];
    this.touched = true;
  }

  removeRow(key: number): void {
    this.rows = this.rows.filter((row) => row.key !== key);
    this.touched = true;
  }

  private update(
    key: number,
    change: (row: CubeAggregationRow) => CubeAggregationRow,
  ): void {
    this.rows = this.rows.map((row) => (row.key === key ? change(row) : row));
    this.touched = true;
  }

  /** Picks the row's column; with no function yet, Count */
  setColumn(key: number, column: string): void {
    this.update(key, (row) => withRowColumn(row, column, this.aggregationUse));
  }

  /** Picks the row's function: Count rows and the rank functions take no column, the others one */
  setFunction(key: number, fn: string): void {
    this.update(key, (row) => withRowFunction(row, fn, this.aggregationUse));
  }

  /** Types the row's name, kept exactly; the auto-name itself follows again */
  setName(key: number, name: string): void {
    this.update(key, (row) => withRowName(row, name, this.aggregationUse));
  }

  build(): Partition {
    const { original, columns, sorts, aggregations } = this;
    return !this.touched ||
      (isSameList(columns, original.columns) &&
        isSameSorts(sorts, original.sorts) &&
        isSameAggregations(aggregations, original.aggregations))
      ? original
      : original
          .withColumns(columns)
          .withSorts(sorts)
          .withAggregations(aggregations);
  }
}
