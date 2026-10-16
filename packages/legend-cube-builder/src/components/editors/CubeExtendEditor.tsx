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
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  COLUMN_NAME_RULES_HINT,
  EXTEND_EDITOR_NOTES,
  getExactColumnTypeLabel,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeExtendRow,
  CubeExtendDraft,
} from '../../stores/editors/CubeExtendDraft.js';
import { columnAccessOf } from '../../stores/CubePureText.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import {
  CubeJsonFieldsToggle,
  CubeJsonFieldsTree,
  isCubeJsonColumn,
} from './CubeJsonFieldsTree.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';
import {
  type CubeCompletionColumn,
  getCubeExpressionCompletionSource,
} from './CubeExpressionCompletions.js';
import { CubeCodeCheckStatus } from '../../stores/editors/CubeExpressionAutoCheck.js';
import { CUBE_CODE_CHECK_LABEL, getCubeCodeBoxClass } from './CubeCodeCheck.js';

/** The code editor's language: legend-code-editor's `CODE_EDITOR_LANGUAGE.PURE` */
const PURE = 'pure';

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

/** What a row says under its code: its problem, its type once ready, or that it is checked */
const CubeExtendRowStatus = observer(
  (props: { draft: CubeExtendDraft; row: CubeExtendRow }) => {
    const { draft, row } = props;
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
    const status = draft.getRowCheckStatus(row);
    if (
      status === CubeCodeCheckStatus.CHECKING ||
      status === CubeCodeCheckStatus.UNEDITED
    ) {
      return (
        <div className="text-sm text-[var(--color-text-muted)]">
          {status === CubeCodeCheckStatus.CHECKING
            ? CUBE_CODE_CHECK_LABEL.CHECKING
            : CUBE_CODE_CHECK_LABEL.UNEDITED}
        </div>
      );
    }
    return row.type ? (
      <div className="flex items-center gap-1 text-sm text-[var(--color-status-success)]">
        <CubeColumnTypeIcon type={row.type} />
        {/* every new column is optional (PLAN §11.7) */}
        {`${row.type.displayName}, optional`}
      </div>
    ) : null;
  },
);

const CubeExtendRowEditor = observer(
  (props: {
    draft: CubeExtendDraft;
    row: CubeExtendRow;
    position: number;
    count: number;
    /** The columns its expression can read: the input's, and the rows' above it */
    columns: readonly CubeCompletionColumn[];
    readOnly: boolean;
    onFocus: () => void;
  }) => {
    const { draft, row, position, count, columns, readOnly, onFocus } = props;
    const [expanded, setExpanded] = useState(false);
    // typing goes on while the rows are checked
    const disabled = readOnly;
    const status = draft.getRowCheckStatus(row);
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
          data-check-status={status}
          className={getCubeCodeBoxClass(status)}
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
            completions={getCubeExpressionCompletionSource(columns)}
            extraEditorOptions={{
              lineNumbers: 'off',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              // the completions show over the panel, not cut by the code box
              fixedOverflowWidgets: true,
            }}
          />
        </div>
        <CubeExtendRowStatus draft={draft} row={row} />
      </li>
    );
  },
);

/**
 * The Extend editor (spec §17.6, PLAN §11.7): a row per new column, its name
 * and its expression in a code editor, checked once typing pauses (F10 at
 * once), each border green when ready (user, 2026-10-16), and the input's
 * columns, which a click writes into the row last used.
 */
export const CubeExtendEditor = observer((props: CubeNodeEditorProps) => {
  const { inputSchemas, readOnly } = props;
  const draft = guaranteeType(props.draft, CubeExtendDraft);
  const [schema] = inputSchemas as [Schema];
  const [focusedKey, setFocusedKey] = useState<number | undefined>();
  const target =
    draft.rows.find((row) => row.key === focusedKey) ?? draft.rows.at(-1);
  const chipsDisabled = readOnly || !target;
  /** Writes text at the end of the expression last used, as the chips do */
  const write = (text: string): void => {
    if (target) {
      const separator = /\s$/u.test(target.code) ? '' : ' ';
      draft.setCode(target.key, `${target.code}${separator}${text}`);
    }
  };
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
            columns={[
              ...schema.columns,
              // every new column is optional (PLAN §11.7)
              ...draft.rows
                .slice(0, index)
                .filter(({ name }) => name)
                .map(({ name, type }) => ({ name, type, nullable: true })),
            ]}
            readOnly={readOnly}
            onFocus={() => setFocusedKey(row.key)}
          />
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <CubeButton
          title={readOnly ? READ_ONLY_CUBE_TITLE : 'Add a new column'}
          disabled={readOnly}
          onClick={() => draft.addRow()}
        >
          Add column
        </CubeButton>
      </div>
      <span>Input columns</span>
      <ul aria-label="Input columns" className="flex flex-wrap gap-1">
        {schema.columns.map((column) => (
          <li key={column.name} className="flex items-stretch gap-0.5">
            <button
              className="flex items-center gap-1 rounded-sm border border-[var(--color-border-subtle)] px-1 text-sm hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
              title={`Write ${columnAccessOf(column.name)} at the end of the expression last used (${getExactColumnTypeLabel(column)})`}
              disabled={chipsDisabled}
              onClick={() => write(columnAccessOf(column.name))}
            >
              <CubeColumnTypeIcon type={column.type} />
              {column.name}
            </button>
            {isCubeJsonColumn(column) && (
              <CubeJsonFieldsToggle
                fields={draft.jsonFields}
                column={column}
                disabled={readOnly}
              />
            )}
          </li>
        ))}
      </ul>
      <CubeJsonFieldsTree
        fields={draft.jsonFields}
        disabled={chipsDisabled}
        onInsert={write}
        onAddColumn={(name, code) => draft.addColumn(name, code)}
      />
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {[...EXTEND_EDITOR_NOTES, COLUMN_NAME_RULES_HINT].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
