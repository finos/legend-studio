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
  type ColumnAggregation,
  GROUP_AGGREGATION_USE,
  type Group,
  type Schema,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
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

/** One aggregation row of the Group editor (`CubeAggregationRow`) */
export type CubeGroupRow = CubeAggregationRow;

/**
 * Whether a row builds an aggregation of a Group: it has a column, or it is
 * Count rows, or it holds a function this version doesn't know with no column
 * (a newer client's, or a window function such as Rank), kept as saved (Q4).
 * A blank row, or a column function whose column isn't picked yet, is left
 * out.
 */
export const isBuiltGroupRow = (row: CubeGroupRow): boolean =>
  isBuiltAggregationRow(row, GROUP_AGGREGATION_USE);

/**
 * The Group editor's draft (spec §17.6: a multi-select of keys, then rows of
 * column, function and output name; PLAN §11.5). Picks of keys are stored in
 * the input's order, but a saved order is kept until the picks change (Q2).
 * A row's name follows its column and function until typed (Q3). Picking a
 * column first sets Count; switching to Count rows clears the column, which
 * it can't hold, and back to a column function leaves one to pick. Which
 * rows build is `isBuiltGroupRow`.
 */
export class CubeGroupDraft extends CubeNodeDraft<Group> {
  columns: readonly string[];
  rows: readonly CubeGroupRow[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Group) {
    super(original);
    makeObservable<CubeGroupDraft, 'touched'>(this, {
      columns: observable.ref,
      rows: observable.ref,
      touched: observable,
      toggleColumn: action,
      clearColumns: action,
      addRow: action,
      removeRow: action,
      setColumn: action,
      setFunction: action,
      setName: action,
    });
    this.columns = original.columns;
    this.rows = aggregationRowsOf(original.aggregations, GROUP_AGGREGATION_USE);
  }

  /** The aggregations the rows build, in order (`isBuiltGroupRow`) */
  get aggregations(): ColumnAggregation[] {
    return aggregationsOfRows(this.rows, GROUP_AGGREGATION_USE);
  }

  /** Ticks or unticks a key; the keys then follow the input's order (Q2) */
  toggleColumn(name: string, schema: Schema): void {
    this.columns = toggledColumns(this.columns, name, schema);
    this.touched = true;
  }

  /** Unticks every key: one group of all the rows */
  clearColumns(): void {
    this.columns = [];
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
    change: (row: CubeGroupRow) => CubeGroupRow,
  ): void {
    this.rows = this.rows.map((row) => (row.key === key ? change(row) : row));
    this.touched = true;
  }

  /** Picks the row's column; with no function yet, Count */
  setColumn(key: number, column: string): void {
    this.update(key, (row) =>
      withRowColumn(row, column, GROUP_AGGREGATION_USE),
    );
  }

  /** Picks the row's function: Count rows takes no column, the others one */
  setFunction(key: number, fn: string): void {
    this.update(key, (row) => withRowFunction(row, fn, GROUP_AGGREGATION_USE));
  }

  /** Types the row's name, kept exactly; the auto-name itself follows again */
  setName(key: number, name: string): void {
    this.update(key, (row) => withRowName(row, name, GROUP_AGGREGATION_USE));
  }

  build(): Group {
    const { original, columns, aggregations } = this;
    return !this.touched ||
      (isSameList(columns, original.columns) &&
        isSameAggregations(aggregations, original.aggregations))
      ? original
      : original.withColumns(columns).withAggregations(aggregations);
  }
}
