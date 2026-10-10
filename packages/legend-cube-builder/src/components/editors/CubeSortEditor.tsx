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
  validateSortKey,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { CUBE_SORT_COLUMN_DISABLED_REASON } from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeSortRow,
  CubeSortDraft,
} from '../../stores/editors/CubeSortDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const ROW_BUTTON_CLASS =
  'flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]';

const CubeSortRowEditor = observer(
  (props: {
    draft: CubeSortDraft;
    row: CubeSortRow;
    position: number;
    count: number;
    schema: Schema;
    /** The columns of the other rows, which this row can't take */
    takenColumns: ReadonlySet<string>;
    problem: string | undefined;
    readOnly: boolean;
  }) => {
    const {
      draft,
      row,
      position,
      count,
      schema,
      takenColumns,
      problem,
      readOnly,
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
            onChange={(name) => draft.setColumn(row.key, name)}
          />
          <select
            aria-label={`Sort direction ${position}`}
            className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            value={row.direction}
            disabled={readOnly}
            onChange={(event) => {
              const direction = event.target.value;
              if (isSortDirection(direction)) {
                draft.setDirection(row.key, direction);
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
            onClick={() => draft.moveRow(row.key, -1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            className={ROW_BUTTON_CLASS}
            aria-label={`Move sort column ${position} down`}
            title="Sort by this column after the one below"
            disabled={readOnly || position === count}
            onClick={() => draft.moveRow(row.key, 1)}
          >
            <ArrowDownIcon />
          </button>
          <button
            className={ROW_BUTTON_CLASS}
            aria-label={`Remove sort column ${position}`}
            title="Remove this sort column"
            disabled={readOnly}
            onClick={() => draft.removeRow(row.key)}
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

/**
 * The Sort editor (spec §17.6: an ordered list of column and direction rows,
 * added, removed and reordered). The first row sorts first. A column that
 * can't be sorted, or that another row has, can't be picked; a saved one
 * stays shown with its problem. The rows scroll on their own, so the editor
 * fits wherever it is shown.
 */
export const CubeSortEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeSortDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { rows } = draft;
  // a row's problem, as the node will judge it; a blank row has none
  const problems = rows.map((row, index) => {
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
  const sortable = schema.columns.filter((column) =>
    isSortableType(column.type),
  );
  const canAddRow = !readOnly && rows.length < sortable.length;
  return (
    <div className="flex flex-col gap-2 text-base">
      <ul aria-label="Sort columns">
        {rows.map((row, index) => (
          <CubeSortRowEditor
            key={row.key}
            draft={draft}
            row={row}
            position={index + 1}
            count={rows.length}
            schema={schema}
            takenColumns={
              new Set(
                rows
                  .filter((other) => other.key !== row.key && other.column)
                  .map(({ column }) => column),
              )
            }
            problem={problems[index]}
            readOnly={readOnly}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title={
            canAddRow
              ? 'Add a column to sort by'
              : 'Every column that can be sorted already has a row'
          }
          disabled={!canAddRow}
          onClick={() => draft.addRow()}
        >
          Add sort column
        </CubeButton>
      </div>
    </div>
  );
});
