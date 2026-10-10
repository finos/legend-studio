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
  type AggregationUse,
  type ColumnAggregation,
  getAggregationAutoName,
  isAggregationFunctionOf,
  type Schema,
  takesAggregationColumn,
} from '@finos/legend-cube';

// The rows of the editors that aggregate (Group, PLAN §11.5; Partition,
// §11.6): each a column, a function and an output name, judged by where the
// aggregations are (`AggregationUse`)

/**
 * One aggregation row: a column (`undefined` for a function that takes none,
 * `''` until picked), a function (`''` until picked; an unknown one is kept
 * as saved) and an output name
 */
export interface CubeAggregationRow {
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

export const blankAggregationRow = (): CubeAggregationRow => ({
  key: nextRowKey++,
  column: '',
  function: '',
  name: '',
  named: false,
});

/** Whether the use knows the function and it takes no column: Count rows, and in a window the rank functions */
export const takesNoAggregationColumn = (
  fn: string,
  use: AggregationUse,
): boolean => isAggregationFunctionOf(fn, use) && !takesAggregationColumn(fn);

/**
 * Whether a row builds an aggregation: it has a column, or its function takes
 * none, or it holds a function the use doesn't know with no column (a newer
 * client's, or in a Group a window function such as Rank), kept as saved
 * (Q4). A blank row, or a column function whose column isn't picked yet, is
 * left out.
 */
export const isBuiltAggregationRow = (
  row: CubeAggregationRow,
  use: AggregationUse,
): boolean =>
  Boolean(row.column) ||
  takesNoAggregationColumn(row.function, use) ||
  (row.column === undefined && !isAggregationFunctionOf(row.function, use));

/** The row with its name following the column and the function, unless typed */
const withAutoName = (
  row: CubeAggregationRow,
  use: AggregationUse,
): CubeAggregationRow =>
  row.named
    ? row
    : {
        ...row,
        name: getAggregationAutoName(row.function, row.column, use) ?? '',
      };

/** The rows of saved aggregations, or one blank row when there are none */
export const aggregationRowsOf = (
  aggregations: readonly ColumnAggregation[],
  use: AggregationUse,
): CubeAggregationRow[] =>
  aggregations.length
    ? aggregations.map(({ column, function: fn, name }) => ({
        key: nextRowKey++,
        column,
        function: fn,
        name,
        named: name !== (getAggregationAutoName(fn, column, use) ?? ''),
      }))
    : [blankAggregationRow()];

/** The aggregations the rows build, in order (`isBuiltAggregationRow`) */
export const aggregationsOfRows = (
  rows: readonly CubeAggregationRow[],
  use: AggregationUse,
): ColumnAggregation[] =>
  rows
    .filter((row) => isBuiltAggregationRow(row, use))
    .map(({ column, function: fn, name }) => ({
      column,
      function: fn,
      name,
    }));

/** The row with its column picked; with no function yet, Count */
export const withRowColumn = (
  row: CubeAggregationRow,
  column: string,
  use: AggregationUse,
): CubeAggregationRow =>
  withAutoName(
    { ...row, column, function: row.function || AggregationFunction.COUNT },
    use,
  );

/**
 * The row with its function picked: a function that takes no column clears
 * it, and back to a column function leaves one to pick
 */
export const withRowFunction = (
  row: CubeAggregationRow,
  fn: string,
  use: AggregationUse,
): CubeAggregationRow =>
  withAutoName(
    {
      ...row,
      function: fn,
      column: takesNoAggregationColumn(fn, use)
        ? undefined
        : (row.column ?? ''),
    },
    use,
  );

/** The row with its name typed, kept exactly; the auto-name itself follows again */
export const withRowName = (
  row: CubeAggregationRow,
  name: string,
  use: AggregationUse,
): CubeAggregationRow => ({
  ...row,
  name,
  named: name !== (getAggregationAutoName(row.function, row.column, use) ?? ''),
});

export const isSameAggregations = (
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
 * Picked columns in the input's order, then those the input doesn't have, in
 * the order they were picked: a saved column the input lost stays listed
 * until it is unticked (a Group's keys, a Partition's columns, Q2)
 */
export const inInputOrder = (
  names: readonly string[],
  schema: Schema,
): string[] => [
  ...schema.names().filter((name) => names.includes(name)),
  ...names.filter((name) => schema.lookup(name) === undefined),
];

/** The picked columns with one ticked or unticked, in the input's order (`inInputOrder`) */
export const toggledColumns = (
  columns: readonly string[],
  name: string,
  schema: Schema,
): string[] =>
  inInputOrder(
    columns.includes(name)
      ? columns.filter((picked) => picked !== name)
      : [...columns, name],
    schema,
  );

export const isSameList = (
  a: readonly string[],
  b: readonly string[],
): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);
