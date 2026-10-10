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

import { type ColumnDirection, SortDirection } from '@finos/legend-cube';

// The sort rows of the editors that sort (Sort, PLAN §11.4; Partition's
// window, §11.6): a column and a direction each, most significant first

/** One sort row: a column, `''` until picked, and its direction */
export interface CubeSortRow {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly column: string;
  readonly direction: SortDirection;
}

let nextRowKey = 1;

export const blankSortRow = (): CubeSortRow => ({
  key: nextRowKey++,
  column: '',
  direction: SortDirection.ASC,
});

/** The rows of saved sort keys, in order */
export const sortRowsOf = (sorts: readonly ColumnDirection[]): CubeSortRow[] =>
  sorts.map(({ column, direction }) => ({
    key: nextRowKey++,
    column,
    direction,
  }));

/** Every row's key, a blank one included */
export const sortKeysOfRows = (
  rows: readonly CubeSortRow[],
): ColumnDirection[] =>
  rows.map(({ column, direction }) => ({ column, direction }));

/** The keys the rows build, in order: a row without a column is left out */
export const sortsOfRows = (rows: readonly CubeSortRow[]): ColumnDirection[] =>
  sortKeysOfRows(rows).filter(({ column }) => column);

/** The rows with one moved one place up (`-1`) or down (`1`), if it can go there */
export const movedSortRows = (
  rows: readonly CubeSortRow[],
  key: number,
  offset: -1 | 1,
): readonly CubeSortRow[] => {
  const from = rows.findIndex((row) => row.key === key);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= rows.length) {
    return rows;
  }
  const moved = [...rows];
  [moved[from], moved[to]] = [
    moved[to] as CubeSortRow,
    moved[from] as CubeSortRow,
  ];
  return moved;
};

export const isSameSorts = (
  a: readonly ColumnDirection[],
  b: readonly ColumnDirection[],
): boolean =>
  a.length === b.length &&
  a.every(
    (sort, index) =>
      sort.column === b[index]?.column &&
      sort.direction === b[index]?.direction,
  );
