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
  AggregationSetting,
  getAggregationDisplayName,
  getAggregationSetting,
  isAggregationFunctionOf,
  type AggregationUse,
  type Schema,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import {
  type CubeAggregationRow,
  takesNoAggregationColumn,
} from '../../stores/editors/CubeAggregationRows.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';

/** Which control of a row a problem is about: its column, its function, its setting, or its name */
const problemControl = (
  problem: string | undefined,
): 'column' | 'function' | 'setting' | 'name' | undefined =>
  problem === undefined
    ? undefined
    : problem.startsWith('Aggregation column')
      ? 'column'
      : /^Aggregation function "[^"]*" needs (?:an offset|a bucket count) that is a whole number of at least 1\.$/u.test(
            problem,
          )
        ? 'setting'
        : problem.startsWith('Aggregation function')
          ? 'function'
          : 'name';

/** How a setting's field is named and explained (PLAN §11.9) */
const SETTING_FIELDS: Readonly<
  Record<AggregationSetting, { label: string; title: string }>
> = Object.freeze({
  [AggregationSetting.OFFSET]: {
    label: 'offset',
    title: 'How many rows back (Lag) or ahead (Lead), in the sort order',
  },
  [AggregationSetting.BUCKETS]: {
    label: 'buckets',
    title: 'How many buckets of near-equal size to split each partition into',
  },
});

/**
 * One aggregation row (Group, PLAN §11.5; Partition, §11.6): its column, or
 * for a function that takes none a short text in its place (with a button to
 * clear a column it holds anyway), then its function, its output name and a
 * remove button, then its first problem. A function that takes a setting
 * (Lag's and Lead's offset, NTile's bucket count) has a field for it before
 * the name. The control the problem is about is marked. The function list is
 * given, so each editor offers its own; a function the use doesn't know is
 * shown as unknown.
 */
export const CubeAggregationRowEditor = observer(
  (props: {
    row: CubeAggregationRow;
    position: number;
    schema: Schema;
    use: AggregationUse;
    /** The functions the row can take, in order */
    functions: readonly string[];
    /** What a function that takes no column shows in the column's place */
    noColumnText: (fn: string) => string;
    problem: string | undefined;
    readOnly: boolean;
    onColumn: (column: string) => void;
    onFunction: (fn: string) => void;
    /** Types the function's setting; only the editors whose functions take one give it */
    onSetting?: (setting: AggregationSetting, text: string) => void;
    onName: (name: string) => void;
    onRemove: () => void;
  }) => {
    const {
      row,
      position,
      schema,
      use,
      functions,
      noColumnText,
      problem,
      readOnly,
      onColumn,
      onFunction,
      onSetting,
      onName,
      onRemove,
    } = props;
    const takesNoColumn = takesNoAggregationColumn(row.function, use);
    const setting = isAggregationFunctionOf(row.function, use)
      ? getAggregationSetting(row.function)
      : undefined;
    const marked = problemControl(problem);
    // in sentence case: `Count rows`, `Dense rank`
    const shownAs = getAggregationDisplayName(row.function);
    const sentence = `${shownAs.charAt(0)}${shownAs.slice(1).toLowerCase()}`;
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="flex min-h-6 items-center gap-1">
          {takesNoColumn ? (
            <span className="flex min-w-0 items-center gap-1 text-[var(--color-text-secondary)]">
              {noColumnText(row.function)}
              {row.column !== undefined && (
                <CubeButton
                  title={`${sentence} takes no column: clear it`}
                  disabled={readOnly}
                  onClick={() => onFunction(row.function)}
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
              onChange={onColumn}
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
            onChange={(event) => onFunction(event.target.value)}
          >
            {!row.function && (
              <option value="" disabled={true}>
                Pick a function
              </option>
            )}
            {functions.map((fn) => (
              <option key={fn} value={fn}>
                {`${getAggregationDisplayName(fn)}${isAggregationFunctionOf(fn, use) ? '' : ' (unknown)'}`}
              </option>
            ))}
          </select>
          {setting !== undefined && onSetting && (
            <input
              aria-label={`Aggregation ${SETTING_FIELDS[setting].label} ${position}`}
              aria-invalid={marked === 'setting'}
              title={
                marked === 'setting' ? problem : SETTING_FIELDS[setting].title
              }
              className={clsx(
                'h-6 w-14 shrink-0 rounded-sm border bg-[var(--color-bg-input)] px-1 text-right text-base',
                marked === 'setting'
                  ? 'border-[var(--color-status-error)]'
                  : 'border-[var(--color-border-default)]',
              )}
              type="text"
              inputMode="numeric"
              spellCheck={false}
              value={row.settings[setting] ?? ''}
              disabled={readOnly}
              onChange={(event) => onSetting(setting, event.target.value)}
            />
          )}
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
            onChange={(event) => onName(event.target.value)}
          />
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove aggregation ${position}`}
            title="Remove this aggregation"
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
