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

import { clsx } from '@finos/legend-art';
import {
  AggregationFunction,
  getAggregationDisplayName,
  getAvailableAggregations,
  getLiteralText,
  getPivotColumnNames,
  isPivotableType,
  isSortableType,
  type LiteralValue,
  PIVOT_AGGREGATION_FUNCTIONS,
  type Schema,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  getPivotValuesCutNotice,
  PIVOT_COLUMN_DISABLED_REASON,
  PIVOT_EDITOR_NOTES,
  PIVOT_NO_VALUES_NOTICE,
} from '../../__lib__/LegendCubeLabels.js';
import { CubePivotDraft } from '../../stores/editors/CubePivotDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnChecklist } from './CubeColumnChecklist.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const ROWS = 'Row columns';

/**
 * The functions the aggregation can take: those its column's type offers,
 * or every column function before one is picked, then Count rows, only those
 * a Pivot takes (`PIVOT_AGGREGATION_FUNCTIONS`: never Distinct Value, PLAN
 * §11.12, nor Median to Join Text, §11.28); one it holds that isn't among
 * them stays listed, so the problem can be seen and fixed
 */
const functionOptions = (
  fn: string,
  column: string | undefined,
  schema: Schema,
): string[] => {
  const type = column ? schema.lookup(column)?.type : undefined;
  const offered: string[] = [
    ...(type
      ? getAvailableAggregations(type)
      : Object.values(AggregationFunction).filter(
          (each) => each !== AggregationFunction.COUNT_ROWS,
        )
    ).filter((each) => PIVOT_AGGREGATION_FUNCTIONS.includes(each)),
    AggregationFunction.COUNT_ROWS,
  ];
  return fn && !offered.includes(fn) ? [fn, ...offered] : offered;
};

const sameValue = (a: LiteralValue, b: LiteralValue): boolean =>
  a.kind === b.kind && a.value === b.value;

/** The values to tick: those loaded, then those picked that weren't */
const listedValues = (draft: CubePivotDraft): LiteralValue[] => {
  const loaded = draft.loaded?.values ?? [];
  return [
    ...loaded,
    ...draft.values.filter(
      (value) => !loaded.some((each) => sameValue(each, value)),
    ),
  ];
};

/**
 * The Pivot editor (PLAN §11.12): the row columns, ticked; the pivot column;
 * its values, loaded from the engine and ticked, each named as its column
 * will be; then the aggregation, a function and its column. The node's
 * problems show under it, as for any node.
 */
export const CubePivotEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubePivotDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { aggregation } = draft;
  const takesNoColumn = aggregation.function === AggregationFunction.COUNT_ROWS;
  const values = listedValues(draft);
  const names = getPivotColumnNames(draft.rows, draft.values);
  return (
    <div className="flex flex-col gap-2 text-base">
      <CubeColumnChecklist
        label={ROWS}
        schema={schema}
        picked={draft.rows}
        unpickableReason={(column) =>
          column.name === draft.column
            ? PIVOT_COLUMN_DISABLED_REASON.PIVOT_COLUMN
            : column.name === aggregation.column
              ? PIVOT_COLUMN_DISABLED_REASON.AGGREGATED
              : isSortableType(column.type)
                ? undefined
                : PIVOT_COLUMN_DISABLED_REASON.NOT_GROUPABLE
        }
        clearTitle="Untick every row column: one row for all the rows"
        readOnly={readOnly}
        onToggle={(name) => draft.toggleRow(name, schema)}
        onClear={() => draft.clearRows()}
      />
      <div className="flex items-center gap-2">
        <span className="shrink-0">Pivot column</span>
        <CubeColumnPicker
          label="Pivot column"
          schema={schema}
          value={draft.column}
          disabled={readOnly}
          onChange={(name) => draft.setColumn(name)}
          isColumnDisabled={(column) =>
            !isPivotableType(column.type)
              ? PIVOT_COLUMN_DISABLED_REASON.NOT_PIVOTABLE
              : draft.rows.includes(column.name)
                ? PIVOT_COLUMN_DISABLED_REASON.ROW_COLUMN
                : column.name === aggregation.column
                  ? PIVOT_COLUMN_DISABLED_REASON.AGGREGATED
                  : undefined
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <span>Values</span>
        <span className="flex-1" />
        <CubeButton
          title="Ask the engine for the pivot column's values"
          disabled={readOnly || !draft.column || draft.loading}
          onClick={() => {
            flowResult(draft.loadValues()).catch(
              draft.editorState.host.applicationStore.alertUnhandledError,
            );
          }}
        >
          {draft.loading ? 'Loading…' : 'Load values'}
        </CubeButton>
        <CubeButton
          title="Tick every value listed that can be"
          disabled={readOnly || !draft.loaded?.values.length}
          onClick={() => draft.pickAllValues()}
        >
          All
        </CubeButton>
        <CubeButton
          title="Untick every value"
          aria-label="None of the values"
          disabled={readOnly || !draft.values.length}
          onClick={() => draft.clearValues()}
        >
          None
        </CubeButton>
      </div>
      {draft.loadError && (
        <div className="text-sm text-[var(--color-status-error)]">
          {draft.loadError}
        </div>
      )}
      {values.length > 0 && (
        <ul
          aria-label="Values"
          className="max-h-40 overflow-y-auto rounded-sm border border-[var(--color-border-subtle)]"
        >
          {values.map((value) => {
            const text = getLiteralText(value);
            const picked = draft.values.some((each) => sameValue(each, value));
            const reason = draft.untickableReason(value);
            const name =
              names[draft.values.findIndex((each) => sameValue(each, value))];
            return (
              <li key={`${value.kind}:${text}`}>
                <label
                  className={clsx(
                    'flex items-center gap-2 px-2',
                    reason !== undefined && 'text-[var(--color-text-disabled)]',
                  )}
                  title={reason}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={readOnly || (reason !== undefined && !picked)}
                    onChange={() => draft.toggleValue(value)}
                  />
                  <span className="min-w-0 truncate">
                    {text === '' ? '(empty text)' : text}
                  </span>
                  {reason !== undefined && !picked && (
                    <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">
                      {`(${reason})`}
                    </span>
                  )}
                  {picked && name !== undefined && name !== text && (
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {`as ${name}`}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {draft.loaded?.values.length === 0 && (
        <div className="text-sm text-[var(--color-text-secondary)]">
          {PIVOT_NO_VALUES_NOTICE}
        </div>
      )}
      {draft.loaded?.more && (
        <div className="text-sm text-[var(--color-text-secondary)]">
          {getPivotValuesCutNotice(draft.loaded.values.length)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="shrink-0">Aggregation</span>
        <select
          aria-label="Aggregation function"
          className="h-6 w-36 shrink-0 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
          value={aggregation.function}
          disabled={readOnly}
          onChange={(event) => draft.setFunction(event.target.value)}
        >
          {!aggregation.function && (
            <option value="" disabled={true}>
              Pick a function
            </option>
          )}
          {functionOptions(
            aggregation.function,
            aggregation.column,
            schema,
          ).map((fn) => (
            <option key={fn} value={fn}>
              {getAggregationDisplayName(fn)}
            </option>
          ))}
        </select>
        {takesNoColumn ? (
          <span className="text-[var(--color-text-secondary)]">Every row</span>
        ) : (
          <CubeColumnPicker
            label="Aggregation column"
            schema={schema}
            value={aggregation.column}
            disabled={readOnly}
            onChange={(name) => draft.setAggregationColumn(name)}
            isColumnDisabled={(column) =>
              column.name === draft.column
                ? PIVOT_COLUMN_DISABLED_REASON.PIVOT_COLUMN
                : draft.rows.includes(column.name)
                  ? PIVOT_COLUMN_DISABLED_REASON.ROW_COLUMN
                  : undefined
            }
          />
        )}
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {PIVOT_EDITOR_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
