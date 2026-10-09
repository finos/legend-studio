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

import { clsx, TimesIcon } from '@finos/legend-art';
import {
  AggregationFunction,
  getAggregationDisplayName,
  getAvailableAggregations,
  isAggregationFunction,
  isSortableType,
  type Schema,
  validateColumnAggregation,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  COLUMN_NAME_RULES_HINT,
  CUBE_GROUP_COLUMN_DISABLED_REASON,
  getColumnTypeLabel,
  GROUP_EDITOR_NOTES,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeGroupRow,
  CubeGroupDraft,
  isBuiltGroupRow,
} from '../../stores/editors/CubeGroupDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker, CubeColumnTypeIcon } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const KEYS = 'Group columns';

/**
 * The functions a row can take: those its column's type offers, or every
 * column function before a column is picked, then Count rows; a function the
 * row holds that isn't among them (an unknown one kept as saved, or one its
 * column doesn't offer) stays listed, so the problem can be seen and fixed
 */
const functionOptions = (row: CubeGroupRow, schema: Schema): string[] => {
  const type = row.column ? schema.lookup(row.column)?.type : undefined;
  const offered: string[] = [
    ...(type
      ? getAvailableAggregations(type)
      : Object.values(AggregationFunction).filter(
          (fn) => fn !== AggregationFunction.COUNT_ROWS,
        )),
    AggregationFunction.COUNT_ROWS,
  ];
  return row.function && !offered.includes(row.function)
    ? [row.function, ...offered]
    : offered;
};

/** Which control of a row a problem is about: its column, its function, or its name */
const problemControl = (
  problem: string | undefined,
): 'column' | 'function' | 'name' | undefined =>
  problem === undefined
    ? undefined
    : problem.startsWith('Aggregation column')
      ? 'column'
      : problem.startsWith('Aggregation function')
        ? 'function'
        : 'name';

const CubeGroupRowEditor = observer(
  (props: {
    draft: CubeGroupDraft;
    row: CubeGroupRow;
    position: number;
    schema: Schema;
    problem: string | undefined;
    readOnly: boolean;
  }) => {
    const { draft, row, position, schema, problem, readOnly } = props;
    const isCountRows = row.function === AggregationFunction.COUNT_ROWS;
    const marked = problemControl(problem);
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="flex min-h-6 items-center gap-1">
          {isCountRows ? (
            <span className="flex min-w-0 items-center gap-1 text-[var(--color-text-secondary)]">
              Every row
              {row.column !== undefined && (
                <CubeButton
                  title="Count rows takes no column: clear it"
                  disabled={readOnly}
                  onClick={() =>
                    draft.setFunction(row.key, AggregationFunction.COUNT_ROWS)
                  }
                >
                  {`Clear column ${position}`}
                </CubeButton>
              )}
            </span>
          ) : (
            <CubeColumnPicker
              label={`Aggregation column ${position}`}
              schema={schema}
              value={row.column}
              disabled={readOnly}
              invalid={marked === 'column'}
              onChange={(name) => draft.setColumn(row.key, name)}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <select
            aria-label={`Aggregation function ${position}`}
            aria-invalid={marked === 'function'}
            title={marked === 'function' ? problem : undefined}
            className={clsx(
              'h-6 w-36 shrink-0 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base',
              marked === 'function'
                ? 'border-[var(--color-status-error)]'
                : 'border-[var(--color-border-default)]',
            )}
            value={row.function}
            disabled={readOnly}
            onChange={(event) => draft.setFunction(row.key, event.target.value)}
          >
            {!row.function && (
              <option value="" disabled={true}>
                Pick a function
              </option>
            )}
            {functionOptions(row, schema).map((fn) => (
              <option key={fn} value={fn}>
                {`${getAggregationDisplayName(fn)}${isAggregationFunction(fn) ? '' : ' (unknown)'}`}
              </option>
            ))}
          </select>
          <input
            aria-label={`Aggregation output name ${position}`}
            aria-invalid={marked === 'name'}
            title={marked === 'name' ? problem : undefined}
            className={clsx(
              'h-6 min-w-0 flex-1 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base',
              marked === 'name'
                ? 'border-[var(--color-status-error)]'
                : 'border-[var(--color-border-default)]',
            )}
            type="text"
            spellCheck={false}
            value={row.name}
            disabled={readOnly}
            onChange={(event) => draft.setName(row.key, event.target.value)}
          />
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove aggregation ${position}`}
            title="Remove this aggregation"
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
 * The Group editor (spec §17.6, PLAN §11.5): the input's columns, each ticked
 * to group by it (a column that can't be compared is shown but can't be
 * ticked), then rows of aggregation column, function and output name. Each
 * row shows its first problem, as the node checks it. Rows can always be
 * added: a column can be aggregated several ways. The lists scroll on their
 * own, so the editor fits wherever it is shown.
 */
export const CubeGroupEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeGroupDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { aggregations } = draft;
  // each once, though a saved group may repeat one (validation reports it)
  const missing = Array.from(
    new Set(draft.columns.filter((name) => !schema.lookup(name))),
  );
  // a row's problem, as the node will judge it; a row left out has none
  let aggregationIndex = 0;
  const problems = draft.rows.map((row) => {
    if (!isBuiltGroupRow(row)) {
      return undefined;
    }
    const errors: string[] = [];
    validateColumnAggregation(aggregations, aggregationIndex, schema, errors);
    aggregationIndex += 1;
    return errors[0];
  });
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="flex items-center gap-2">
        <span>{KEYS}</span>
        <span className="flex-1" />
        <CubeButton
          title="Untick every group column: one row for all the rows"
          disabled={readOnly}
          onClick={() => draft.clearColumns()}
        >
          None
        </CubeButton>
      </div>
      <ul
        aria-label={KEYS}
        className="max-h-60 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
      >
        {schema.columns.map((column) => {
          const groupable = isSortableType(column.type);
          return (
            <li key={column.name}>
              <label
                className={clsx(
                  'flex items-center gap-2 px-1 py-0.5',
                  !groupable && 'text-[var(--color-text-disabled)]',
                )}
              >
                <input
                  type="checkbox"
                  checked={draft.columns.includes(column.name)}
                  disabled={
                    readOnly ||
                    (!groupable && !draft.columns.includes(column.name))
                  }
                  onChange={() => draft.toggleColumn(column.name, schema)}
                />
                <CubeColumnTypeIcon
                  type={column.type}
                  className="text-[var(--color-text-secondary)]"
                />
                <span className="min-w-0 truncate">{column.name}</span>
                <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                  {`${getColumnTypeLabel(column)}${groupable ? '' : ` (${CUBE_GROUP_COLUMN_DISABLED_REASON})`}`}
                </span>
              </label>
            </li>
          );
        })}
        {missing.map((name) => (
          <li key={`missing:${name}`}>
            <label className="flex items-center gap-2 px-1 py-0.5 text-[var(--color-status-error)]">
              <input
                type="checkbox"
                checked={true}
                disabled={readOnly}
                onChange={() => draft.toggleColumn(name, schema)}
              />
              <span className="min-w-0 truncate">{name || '(blank)'}</span>
              <span className="shrink-0 text-sm">(not in the input)</span>
            </label>
          </li>
        ))}
      </ul>
      <ul aria-label="Aggregations" className="max-h-80 overflow-auto">
        {draft.rows.map((row, index) => (
          <CubeGroupRowEditor
            key={row.key}
            draft={draft}
            row={row}
            position={index + 1}
            schema={schema}
            problem={problems[index]}
            readOnly={readOnly}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title="Add an aggregation"
          disabled={readOnly}
          onClick={() => draft.addRow()}
        >
          Add aggregation
        </CubeButton>
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {[...GROUP_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
