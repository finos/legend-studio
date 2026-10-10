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

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExpandIcon,
  CompressIcon,
  TimesIcon,
} from '@finos/legend-art';
import type { Schema } from '@finos/legend-cube';
import { CompilationError, SourceInformation } from '@finos/legend-graph';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  COLUMN_NAME_RULES_HINT,
  EXTEND_EDITOR_NOTES,
  getColumnTypeLabel,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeExtendRow,
  CubeExtendDraft,
} from '../../stores/editors/CubeExtendDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/** The code editor's language: legend-code-editor's `CODE_EDITOR_LANGUAGE.PURE` */
const PURE = 'pure';

/** How an expression reads a column: `$x.NAME`, or `$x.'a name'` for one that isn't an identifier */
const columnAccessOf = (name: string): string =>
  /^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)
    ? `$x.${name}`
    : `$x.'${name.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;

/** The error the code editor marks, from a row's problem located in its code */
const markerOf = (row: CubeExtendRow): CompilationError | undefined => {
  const { problem } = row;
  const location = problem?.location;
  if (!problem || !location) {
    return undefined;
  }
  const error = new CompilationError(problem.message);
  error.sourceInformation = new SourceInformation(
    location.sourceId,
    location.startLine,
    location.startColumn,
    location.endLine,
    location.endColumn,
  );
  return error;
};

/** What a row says under its code: its problem, its type once validated, or that it waits */
const CubeExtendRowStatus = observer((props: { row: CubeExtendRow }) => {
  const { row } = props;
  if (row.problem) {
    return (
      <div className="text-sm text-[var(--color-status-error)]">
        <div>{row.problem.message}</div>
        {row.problem.hint && (
          <div className="text-[var(--color-text-secondary)]">
            {row.problem.hint}
          </div>
        )}
      </div>
    );
  }
  if (row.checked?.code !== row.code) {
    return (
      <div className="text-sm text-[var(--color-text-muted)]">
        Not validated yet
      </div>
    );
  }
  return row.type ? (
    <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
      <CubeColumnTypeIcon type={row.type} />
      {/* every new column can be empty (PLAN §11.7) */}
      {`${row.type.displayName}, can be empty`}
    </div>
  ) : null;
});

const CubeExtendRowEditor = observer(
  (props: {
    draft: CubeExtendDraft;
    row: CubeExtendRow;
    position: number;
    count: number;
    readOnly: boolean;
    onFocus: () => void;
  }) => {
    const { draft, row, position, count, readOnly, onFocus } = props;
    const [expanded, setExpanded] = useState(false);
    const disabled = readOnly || draft.validating;
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="flex items-center gap-1">
          <input
            className="h-6 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            aria-label={`Column name ${position}`}
            value={row.name}
            disabled={disabled}
            spellCheck={false}
            onFocus={onFocus}
            onChange={(event) => draft.setName(row.key, event.target.value)}
          />
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Move column ${position} up`}
            title="Move up: a column can use the ones above it"
            disabled={disabled || position === 1}
            onClick={() => draft.moveRow(row.key, -1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Move column ${position} down`}
            title="Move down"
            disabled={disabled || position === count}
            onClick={() => draft.moveRow(row.key, 1)}
          >
            <ArrowDownIcon />
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Expand expression ${position}`}
            title={expanded ? 'Show fewer lines' : 'Show more lines'}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <CompressIcon /> : <ExpandIcon />}
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove column ${position}`}
            title="Remove this column"
            disabled={disabled}
            onClick={() => draft.removeRow(row.key)}
          >
            <TimesIcon />
          </button>
        </div>
        <div
          aria-label={`Expression ${position}`}
          className="overflow-hidden rounded-sm border border-[var(--color-border-default)]"
          style={{ height: expanded ? 240 : 72 }}
          onFocus={onFocus}
        >
          <CodeEditor
            inputValue={row.code}
            updateInput={(code) => draft.setCode(row.key, code)}
            language={PURE}
            isReadOnly={disabled}
            hideMinimap={true}
            hideGutter={true}
            hideActionBar={true}
            error={markerOf(row)}
            extraEditorOptions={{
              lineNumbers: 'off',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <CubeExtendRowStatus row={row} />
      </li>
    );
  },
);

/**
 * The Extend editor (spec §17.6, PLAN §11.7): a row per new column, its name
 * and its expression in a code editor, Validate (F10), which the engine does,
 * and the input's columns, which a click writes into the row last used.
 */
export const CubeExtendEditor = observer((props: CubeNodeEditorProps) => {
  const { inputSchemas, readOnly } = props;
  const draft = guaranteeType(props.draft, CubeExtendDraft);
  const [schema] = inputSchemas as [Schema];
  const [focusedKey, setFocusedKey] = useState<number | undefined>();
  const target =
    draft.rows.find((row) => row.key === focusedKey) ?? draft.rows.at(-1);
  return (
    <div className="flex flex-col gap-2 text-base">
      <span>New columns</span>
      <ul aria-label="New columns">
        {draft.rows.map((row, index) => (
          <CubeExtendRowEditor
            key={row.key}
            draft={draft}
            row={row}
            position={index + 1}
            count={draft.rows.length}
            readOnly={readOnly}
            onFocus={() => setFocusedKey(row.key)}
          />
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <CubeButton
          title={readOnly ? READ_ONLY_CUBE_TITLE : 'Add a new column'}
          disabled={readOnly || draft.validating}
          onClick={() => draft.addRow()}
        >
          Add column
        </CubeButton>
        <CubeButton
          primary={!draft.isValidated}
          title="Check the expressions with the engine, type them, and plan them for this cube's database (F10)"
          disabled={readOnly || draft.validating}
          onClick={() => {
            flowResult(draft.validate()).catch(
              props.editorState.host.applicationStore.alertUnhandledError,
            );
          }}
        >
          {draft.validating ? 'Validating…' : 'Validate'}
        </CubeButton>
      </div>
      <span>Input columns</span>
      <ul aria-label="Input columns" className="flex flex-wrap gap-1">
        {schema.columns.map((column) => (
          <li key={column.name}>
            <button
              className="flex items-center gap-1 rounded-sm border border-[var(--color-border-subtle)] px-1 text-sm hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
              title={`Write ${columnAccessOf(column.name)} at the end of the expression last used (${getColumnTypeLabel(column)})`}
              disabled={readOnly || draft.validating || !target}
              onClick={() => {
                if (target) {
                  const separator = /\s$/u.test(target.code) ? '' : ' ';
                  draft.setCode(
                    target.key,
                    `${target.code}${separator}${columnAccessOf(column.name)}`,
                  );
                }
              }}
            >
              <CubeColumnTypeIcon type={column.type} />
              {column.name}
            </button>
          </li>
        ))}
      </ul>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {[...EXTEND_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
