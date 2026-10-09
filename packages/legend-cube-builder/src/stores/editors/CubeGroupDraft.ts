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
  AggregationFunction,
  type ColumnAggregation,
  getAggregationAutoName,
  type Group,
  isAggregationFunction,
  type Schema,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/**
 * One aggregation row of the Group editor: a column (`undefined` for Count
 * rows, `''` until picked), a function (`''` until picked; an unknown one is
 * kept as saved) and an output name
 */
export interface CubeGroupRow {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly column: string | undefined;
  readonly function: string;
  readonly name: string;
  /**
   * The name was typed: it no longer follows the column and the function.
   * A name equal to the auto-name follows them again.
   */
  readonly named: boolean;
}

let nextRowKey = 1;

const blankRow = (): CubeGroupRow => ({
  key: nextRowKey++,
  column: '',
  function: '',
  name: '',
  named: false,
});

/**
 * Whether a row builds an aggregation: it has a column, or it is Count rows,
 * or it holds a function this version doesn't know with no column (a newer
 * client's, or a window function such as Rank), kept as saved (Q4). A blank
 * row, or a column function whose column isn't picked yet, is left out.
 */
export const isBuiltGroupRow = (row: CubeGroupRow): boolean =>
  Boolean(row.column) ||
  row.function === AggregationFunction.COUNT_ROWS ||
  (row.column === undefined && !isAggregationFunction(row.function));

/** The row with its name following the column and the function, unless typed */
const withAutoName = (row: CubeGroupRow): CubeGroupRow =>
  row.named
    ? row
    : { ...row, name: getAggregationAutoName(row.function, row.column) ?? '' };

/**
 * The keys in the input's order, then those the input doesn't have, in the
 * order they were picked: a saved key the input lost stays listed until it is
 * unticked
 */
const inInputOrder = (names: readonly string[], schema: Schema): string[] => [
  ...schema.names().filter((name) => names.includes(name)),
  ...names.filter((name) => schema.lookup(name) === undefined),
];

const isSameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);

const isSameAggregations = (
  a: readonly ColumnAggregation[],
  b: readonly ColumnAggregation[],
): boolean =>
  a.length === b.length &&
  a.every(
    (aggregation, index) =>
      aggregation.column === b[index]?.column &&
      aggregation.function === b[index]?.function &&
      aggregation.name === b[index]?.name,
  );

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
    this.rows = original.aggregations.length
      ? original.aggregations.map(({ column, function: fn, name }) => ({
          key: nextRowKey++,
          column,
          function: fn,
          name,
          named: name !== (getAggregationAutoName(fn, column) ?? ''),
        }))
      : [blankRow()];
  }

  /** The aggregations the rows build, in order (`isBuiltGroupRow`) */
  get aggregations(): ColumnAggregation[] {
    return this.rows
      .filter(isBuiltGroupRow)
      .map(({ column, function: fn, name }) => ({
        column,
        function: fn,
        name,
      }));
  }

  /** Ticks or unticks a key; the keys then follow the input's order (Q2) */
  toggleColumn(name: string, schema: Schema): void {
    this.columns = inInputOrder(
      this.columns.includes(name)
        ? this.columns.filter((picked) => picked !== name)
        : [...this.columns, name],
      schema,
    );
    this.touched = true;
  }

  /** Unticks every key: one group of all the rows */
  clearColumns(): void {
    this.columns = [];
    this.touched = true;
  }

  addRow(): void {
    this.rows = [...this.rows, blankRow()];
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
      withAutoName({
        ...row,
        column,
        function: row.function || AggregationFunction.COUNT,
      }),
    );
  }

  /** Picks the row's function: Count rows takes no column, the others one */
  setFunction(key: number, fn: string): void {
    this.update(key, (row) =>
      withAutoName({
        ...row,
        function: fn,
        column:
          fn === AggregationFunction.COUNT_ROWS
            ? undefined
            : (row.column ?? ''),
      }),
    );
  }

  /** Types the row's name, kept exactly; the auto-name itself follows again */
  setName(key: number, name: string): void {
    this.update(key, (row) => ({
      ...row,
      name,
      named: name !== (getAggregationAutoName(row.function, row.column) ?? ''),
    }));
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
