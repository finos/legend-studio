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
import { type Schema, validateRenameMapping } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { COLUMN_NAME_RULES_HINT } from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeRenameRow,
  CubeRenameDraft,
} from '../../stores/editors/CubeRenameDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const CubeRenameRowEditor = observer(
  (props: {
    draft: CubeRenameDraft;
    row: CubeRenameRow;
    position: number;
    schema: Schema;
    problem: string | undefined;
    readOnly: boolean;
  }) => {
    const { draft, row, position, schema, problem, readOnly } = props;
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1">
          <CubeColumnPicker
            label={`Old column ${position}`}
            schema={schema}
            value={row.from}
            disabled={readOnly}
            onChange={(name) => draft.setFrom(row.key, name)}
          />
          <span className="text-[var(--color-text-secondary)]">→</span>
          <input
            aria-label={`New column name ${position}`}
            aria-invalid={problem !== undefined}
            title={problem}
            className={clsx(
              'h-6 min-w-0 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base',
              problem
                ? 'border-[var(--color-status-error)]'
                : 'border-[var(--color-border-default)]',
            )}
            type="text"
            spellCheck={false}
            value={row.to}
            disabled={readOnly}
            onChange={(event) => draft.setTo(row.key, event.target.value)}
          />
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove rename ${position}`}
            title="Remove this rename"
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
 * The Rename editor (spec §17.6): rows of an old column, picked from the
 * input, and its new name, typed. Each row shows its first problem, as the
 * node checks it, and the rule for new names stays shown under the rows. The
 * rows scroll on their own, so the editor fits wherever it is shown.
 */
export const CubeRenameEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeRenameDraft);
  const [schema] = props.inputSchemas as [Schema];
  const { mappings } = draft;
  // a row's problem, as the node will judge it; a blank row has none
  let mappingIndex = 0;
  const problems = draft.rows.map((row) => {
    if (!row.from && !row.to) {
      return undefined;
    }
    const errors: string[] = [];
    validateRenameMapping(mappings, mappingIndex, schema, errors);
    mappingIndex += 1;
    return errors[0];
  });
  const canAddRow = !readOnly && draft.rows.length < schema.columns.length;
  return (
    <div className="flex flex-col gap-2 text-base">
      <ul aria-label="Column renames">
        {draft.rows.map((row, index) => (
          <CubeRenameRowEditor
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
          title={
            canAddRow
              ? 'Add a column to rename'
              : 'Every column of the input already has a row'
          }
          disabled={!canAddRow}
          onClick={() => draft.addRow()}
        >
          Add column to rename
        </CubeButton>
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">
        {COLUMN_NAME_RULES_HINT}
      </div>
    </div>
  );
});
