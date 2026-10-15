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
import { type Schema, TypeFamily } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  COLUMN_NAME_RULES_HINT,
  EXPLODE_COLUMN_DISABLED_REASON,
  EXPLODE_EDITOR_NOTES,
  EXPLODE_NO_ARRAYS_NOTICE,
} from '../../__lib__/LegendCubeLabels.js';
import { CubeExplodeDraft } from '../../stores/editors/CubeExplodeDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const FIELD =
  'h-6 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base';

/**
 * The Explode Array editor (PLAN §11.20): the Variant column; the keys to its
 * array, typed or picked from the arrays a sample of the column holds; and
 * the new column's name, which follows the keys until typed. The node's
 * problems show under it, as for any node.
 */
export const CubeExplodeEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeExplodeDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { arrays } = draft;
  const findArrays = (): void => {
    flowResult(draft.readSample()).catch(
      draft.editorState.host.applicationStore.alertUnhandledError,
    );
  };
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0">Column</span>
        <CubeColumnPicker
          label="Explode column"
          schema={schema}
          value={draft.column}
          disabled={readOnly}
          onChange={(name) => draft.setColumn(name)}
          isColumnDisabled={(column) =>
            column.type.family === TypeFamily.VARIANT
              ? undefined
              : EXPLODE_COLUMN_DISABLED_REASON.NOT_JSON
          }
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0">Array</span>
          <span className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--color-text-secondary)]">
            {[draft.column || '…', ...draft.path].join(' › ')}
          </span>
          <CubeButton
            title={
              draft.sampleProblem ??
              "Read the column's first values, and list the arrays they hold"
            }
            disabled={
              readOnly ||
              !draft.column ||
              draft.isSampling ||
              draft.sampleProblem !== undefined
            }
            onClick={findArrays}
          >
            {draft.isSampling ? 'Reading…' : 'Find arrays'}
          </CubeButton>
        </div>
        {draft.sampleError && (
          <div className="break-words text-sm text-[var(--color-status-error)]">
            {draft.sampleError}
          </div>
        )}
        {arrays && arrays.length === 0 && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {EXPLODE_NO_ARRAYS_NOTICE}
          </div>
        )}
        {arrays && arrays.length > 0 && (
          <ul
            aria-label="Arrays found"
            className="rounded-sm border border-[var(--color-border-subtle)]"
          >
            {arrays.map((array) => {
              const picked =
                array.path.length === draft.path.length &&
                array.path.every((key, index) => key === draft.path[index]);
              const label = [draft.column, ...array.path].join(' › ');
              const share = Math.round(array.presence * 100);
              return (
                <li key={JSON.stringify(array.path)}>
                  <button
                    type="button"
                    aria-label={`Array ${label}`}
                    aria-pressed={picked}
                    disabled={readOnly}
                    className={clsx(
                      'flex w-full items-baseline gap-2 px-2 py-0.5 text-left enabled:hover:bg-[var(--color-bg-hover)]',
                      picked && 'bg-[var(--color-bg-selected)]',
                    )}
                    onClick={() => draft.pickArray(array.path)}
                  >
                    <span className="min-w-0 break-all font-mono text-sm">
                      {label}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                      {array.description}
                      {share < 100 ? ` · ${share}%` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <ul aria-label="Path keys" className="flex flex-col gap-1">
          {draft.path.map((key, index) => {
            const position = index + 1;
            return (
              // keys are edited in place: their position is their identity
              // eslint-disable-next-line react/no-array-index-key
              <li key={index} className="flex items-center gap-1">
                <span className="w-16 shrink-0 text-sm text-[var(--color-text-secondary)]">
                  {`Key ${position}`}
                </span>
                <input
                  aria-label={`Path key ${position}`}
                  aria-invalid={key === ''}
                  className={clsx(
                    FIELD,
                    key === '' && 'border-[var(--color-status-error)]',
                  )}
                  type="text"
                  spellCheck={false}
                  value={key}
                  disabled={readOnly}
                  onChange={(event) => draft.setKey(index, event.target.value)}
                />
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]"
                  aria-label={`Remove path key ${position}`}
                  title="Remove this key"
                  disabled={readOnly}
                  onClick={() => draft.removeKey(index)}
                >
                  <TimesIcon />
                </button>
              </li>
            );
          })}
        </ul>
        <div>
          <CubeButton
            title="Add a key: the field of the object the keys before it reach"
            disabled={readOnly || !draft.column}
            onClick={() => draft.addKey()}
          >
            Add key
          </CubeButton>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0">Into</span>
        <input
          aria-label="New column name"
          className={FIELD}
          type="text"
          spellCheck={false}
          value={draft.name}
          disabled={readOnly}
          onChange={(event) => draft.setName(event.target.value)}
        />
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">
        {COLUMN_NAME_RULES_HINT}
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {EXPLODE_EDITOR_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
