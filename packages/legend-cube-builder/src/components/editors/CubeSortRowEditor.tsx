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

import { ArrowDownIcon, ArrowUpIcon, TimesIcon } from '@finos/legend-art';
import {
  isSortableType,
  isSortDirection,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  type Schema,
  type SchemaColumn,
  SORT_DIRECTION_DESCRIPTIONS,
  SORT_DIRECTIONS,
  type SortDirection,
  validateSortKey,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { CUBE_SORT_COLUMN_DISABLED_REASON } from '../../__lib__/LegendCubeLabels.js';
import type { CubeSortRow } from '../../stores/editors/CubeSortRows.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';

const ROW_BUTTON_CLASS =
  'flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]';

/**
 * Each sort row's first problem, as the node will judge it: its key
 * (`validateSortKey`), then a column an earlier row has; a blank row has none
 */
export const getSortRowProblems = (
  rows: readonly CubeSortRow[],
  schema: Schema,
): (string | undefined)[] =>
  rows.map((row, index) => {
    if (!row.column) {
      return undefined;
    }
    const errors: string[] = [];
    validateSortKey(row, schema, errors);
    return (
      errors[0] ??
      (rows.slice(0, index).some(({ column }) => column === row.column)
        ? MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns')
        : undefined)
    );
  });

/** The columns of the other rows, which a row can't take */
export const getTakenSortColumns = (
  rows: readonly CubeSortRow[],
  row: CubeSortRow,
): ReadonlySet<string> =>
  new Set(
    rows
      .filter((other) => other.key !== row.key && other.column)
      .map(({ column }) => column),
  );

/**
 * One sort row (a Sort's, PLAN §11.4; a Partition's window, §11.6): its
 * column, its direction, buttons that move it up or down and remove it, then
 * its first problem. A column that can't be sorted, or that another row has,
 * can't be picked.
 */
export const CubeSortRowEditor = observer(
  (props: {
    row: CubeSortRow;
    position: number;
    count: number;
    schema: Schema;
    /** The columns of the other rows, which this row can't take */
    takenColumns: ReadonlySet<string>;
    problem: string | undefined;
    readOnly: boolean;
    onColumn: (column: string) => void;
    onDirection: (direction: SortDirection) => void;
    onMove: (offset: -1 | 1) => void;
    onRemove: () => void;
  }) => {
    const {
      row,
      position,
      count,
      schema,
      takenColumns,
      problem,
      readOnly,
      onColumn,
      onDirection,
      onMove,
      onRemove,
    } = props;
    const isColumnDisabled = (column: SchemaColumn): string | undefined =>
      !isSortableType(column.type)
        ? CUBE_SORT_COLUMN_DISABLED_REASON.NOT_SORTABLE
        : takenColumns.has(column.name)
          ? CUBE_SORT_COLUMN_DISABLED_REASON.TAKEN
          : undefined;
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-1">
          <CubeColumnPicker
            label={`Sort column ${position}`}
            schema={schema}
            value={row.column}
            disabled={readOnly}
            invalid={problem !== undefined}
            isColumnDisabled={isColumnDisabled}
            onChange={onColumn}
          />
          <select
            aria-label={`Sort direction ${position}`}
            className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            value={row.direction}
            disabled={readOnly}
            onChange={(event) => {
              const direction = event.target.value;
              if (isSortDirection(direction)) {
                onDirection(direction);
              }
            }}
          >
            {SORT_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {SORT_DIRECTION_DESCRIPTIONS[direction]}
              </option>
            ))}
          </select>
          <button
            className={ROW_BUTTON_CLASS}
            aria-label={`Move sort column ${position} up`}
            title="Sort by this column before the one above"
            disabled={readOnly || position === 1}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            className={ROW_BUTTON_CLASS}
            aria-label={`Move sort column ${position} down`}
            title="Sort by this column after the one below"
            disabled={readOnly || position === count}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </button>
          <button
            className={ROW_BUTTON_CLASS}
            aria-label={`Remove sort column ${position}`}
            title="Remove this sort column"
            disabled={readOnly}
            onClick={onRemove}
          >
            <TimesIcon />
          </button>
        </div>
        {problem && (
          <div className="text-sm text-[var(--color-status-error)]">
            {problem}
          </div>
        )}
      </li>
    );
  },
);
