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
  isSortableType,
  type Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { getColumnTypeLabel } from '../../__lib__/LegendCubeLabels.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';

/**
 * The input's columns, each ticked to pick it (a Group's keys, PLAN §11.5; a
 * Partition's columns, §11.6; a Difference's difference columns, §11.7), with
 * a button that unticks them all. A column that can't be picked, by default
 * one that can't be compared, is shown but can't be ticked, with the reason; a
 * picked column the input lacks stays listed, marked, until it is unticked.
 * The list scrolls on its own.
 */
export const CubeColumnChecklist = observer(
  (props: {
    /** The list's heading and accessible name */
    label: string;
    schema: Schema;
    picked: readonly string[];
    /** Why a column that can't be compared can't be ticked */
    disabledReason?: string;
    /** Why a column can't be ticked, `undefined` when it can; by default, `disabledReason` for one that can't be compared */
    unpickableReason?: (column: SchemaColumn) => string | undefined;
    /** The title of the button that unticks every column */
    clearTitle: string;
    readOnly: boolean;
    onToggle: (name: string) => void;
    onClear: () => void;
  }) => {
    const {
      label,
      schema,
      picked,
      disabledReason,
      unpickableReason = (column: SchemaColumn): string | undefined =>
        isSortableType(column.type) ? undefined : (disabledReason ?? ''),
      clearTitle,
      readOnly,
      onToggle,
      onClear,
    } = props;
    // each once, though a saved node may repeat one (validation reports it)
    const missing = Array.from(
      new Set(picked.filter((name) => !schema.lookup(name))),
    );
    return (
      <>
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <span className="flex-1" />
          <CubeButton title={clearTitle} disabled={readOnly} onClick={onClear}>
            None
          </CubeButton>
        </div>
        <ul
          aria-label={label}
          className="rounded-sm border border-[var(--color-border-subtle)]"
        >
          {schema.columns.map((column) => {
            const reason = unpickableReason(column);
            const pickable = reason === undefined;
            return (
              <li key={column.name}>
                <label
                  className={clsx(
                    'flex items-center gap-2 px-1 py-0.5',
                    !pickable && 'text-[var(--color-text-disabled)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(column.name)}
                    disabled={
                      readOnly || (!pickable && !picked.includes(column.name))
                    }
                    onChange={() => onToggle(column.name)}
                  />
                  <CubeColumnTypeIcon
                    type={column.type}
                    className="text-[var(--color-text-secondary)]"
                  />
                  <span className="min-w-0 truncate">{column.name}</span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {`${getColumnTypeLabel(column)}${pickable ? '' : ` (${reason})`}`}
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
                  onChange={() => onToggle(name)}
                />
                <span className="min-w-0 truncate">{name || '(blank)'}</span>
                <span className="shrink-0 text-sm">(not in the input)</span>
              </label>
            </li>
          ))}
        </ul>
      </>
    );
  },
);
