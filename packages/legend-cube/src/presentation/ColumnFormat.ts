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

import { foldColumnName } from '../schema/ColumnName.js';
import type { JsonObject } from '../utils/Json.js';

// How the grid shows a number column (spec §13.1, PLAN §11.10), saved with
// the cube as `meta.presentation.columnHints`: a format for one column, or
// one for every number column. The spec's currency symbols are ISO 4217
// codes here (§21), and red if negative has its own flag (§21).

export enum ColumnFormatStyle {
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENT = 'percent',
}

export const COLUMN_FORMAT_STYLES: readonly ColumnFormatStyle[] = Object.freeze(
  Object.values(ColumnFormatStyle),
);

export const isColumnFormatStyle = (
  value: string,
): value is ColumnFormatStyle =>
  (COLUMN_FORMAT_STYLES as readonly string[]).includes(value);

/**
 * A number column's format. The style is kept as saved, so one a newer Cube
 * adds is kept, and shown as if no format were set.
 */
export interface ColumnFormat {
  readonly style: string;
  /** The digits after the point, every one shown; all of the value's when left out */
  readonly decimalPlaces?: number | undefined;
  /** An ISO 4217 code, e.g. `USD`, for the currency style */
  readonly currency?: string | undefined;
  /** Thousands separators */
  readonly grouping: boolean;
  readonly redIfNegative: boolean;
  /** `(1,234)` for `-1234` */
  readonly parenthesesIfNegative: boolean;
  readonly rest?: JsonObject;
}

/** A format for a column, by its name, or for every number column when the column is left out */
export interface ColumnHint {
  readonly column?: string | undefined;
  readonly format: ColumnFormat;
  readonly rest?: JsonObject;
}

/** The format the grid gives a column: its own, in any case, else the one for every number column */
export const getColumnFormat = (
  hints: readonly ColumnHint[],
  column: string,
): ColumnFormat | undefined =>
  (
    hints.find(
      (hint) =>
        hint.column !== undefined &&
        foldColumnName(hint.column) === foldColumnName(column),
    ) ?? hints.find((hint) => hint.column === undefined)
  )?.format;

/**
 * The hints with a column's format set, or removed with `undefined`. With
 * no column, the format for every number column: set, it replaces each
 * column's own (spec §13.1's "apply to all"); removed, the columns' own stay.
 */
export const setColumnFormat = (
  hints: readonly ColumnHint[],
  column: string | undefined,
  format: ColumnFormat | undefined,
): ColumnHint[] => {
  if (column === undefined) {
    return format === undefined
      ? hints.filter((hint) => hint.column !== undefined)
      : [{ format }];
  }
  const others = hints.filter(
    (hint) =>
      hint.column === undefined ||
      foldColumnName(hint.column) !== foldColumnName(column),
  );
  return format === undefined ? others : [...others, { column, format }];
};
