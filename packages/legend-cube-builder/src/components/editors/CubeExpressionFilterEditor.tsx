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

import { CompressIcon, ExpandIcon } from '@finos/legend-art';
import type { Schema } from '@finos/legend-cube';
import { CompilationError, SourceInformation } from '@finos/legend-graph';
import {
  type CodeEditorTextEditor,
  type CodeEditorTextInserter,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import {
  EXPRESSION_FILTER_EDITOR_NOTES,
  EXPRESSION_FILTER_PARENTHESES_HINT,
  getExactColumnTypeLabel,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeCodeEdit,
  type CubeCodeRange,
  applyCubeCodeEdits,
} from '../../graph-manager/CubeExpressionOutline.js';
import {
  type CubeConditionProblem,
  CubeExpressionFilterDraft,
} from '../../stores/editors/CubeExpressionFilterDraft.js';
import { CubeCodeCheckStatus } from '../../stores/editors/CubeExpressionAutoCheck.js';
import { CUBE_CODE_CHECK_LABEL, getCubeCodeBoxClass } from './CubeCodeCheck.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import {
  CubeExpressionOutlineView,
  CubePrecedenceWarning,
  toCodeEditorEdits,
  toCodeEditorRange,
} from './CubeExpressionOutline.js';
import {
  getCubeExpressionCompletionSource,
  getCubeFunctionHoverSource,
  getCubeFunctionSignatureHelpSource,
} from './CubeExpressionCompletions.js';
import {
  CubeJsonFieldsToggle,
  CubeJsonFieldsTree,
  isCubeJsonColumn,
} from './CubeJsonFieldsTree.js';
import { columnAccessOf } from '../../stores/CubePureText.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/** The code editor's language: legend-code-editor's `CODE_EDITOR_LANGUAGE.PURE` */
const PURE = 'pure';

/** The error the code editor marks, from the condition's problem located in its code */
const markerOf = (
  problem: CubeConditionProblem | undefined,
): CompilationError | undefined => {
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

/**
 * What the editor says under the code: its problem, but one Cube refused,
 * which the panel's problems show; that it is ready, being checked, or not
 * edited yet
 */
const CubeConditionStatus = observer(
  (props: { draft: CubeExpressionFilterDraft }) => {
    const { draft } = props;
    const { problem } = draft;
    if (problem?.refused) {
      return null;
    }
    if (problem) {
      // the precedence warning says it, with its fix
      const hint =
        problem.hint === EXPRESSION_FILTER_PARENTHESES_HINT &&
        draft.precedenceTraps.length
          ? undefined
          : problem.hint;
      return (
        <div className="text-sm text-[var(--color-status-error)]">
          <div>{problem.message}</div>
          {hint && (
            <div className="text-[var(--color-text-secondary)]">{hint}</div>
          )}
        </div>
      );
    }
    switch (draft.checkStatus) {
      case CubeCodeCheckStatus.READY:
        return (
          <div className="text-sm text-[var(--color-status-success)]">
            One Boolean of a row: the rows for which it is true are kept
          </div>
        );
      case CubeCodeCheckStatus.CHECKING:
        return (
          <div className="text-sm text-[var(--color-text-muted)]">
            {CUBE_CODE_CHECK_LABEL.CHECKING}
          </div>
        );
      case CubeCodeCheckStatus.UNEDITED:
        return (
          <div className="text-sm text-[var(--color-text-muted)]">
            {CUBE_CODE_CHECK_LABEL.UNEDITED}
          </div>
        );
      default:
        return null;
    }
  },
);

/**
 * The Filter by Expression editor (PLAN §11.11): the condition's code in a
 * code editor, checked once typing pauses (F10 at once), its border green
 * when ready (user, 2026-10-16), with the engine's functions' completions
 * and help (EXPRESSION-EDITOR.md, round 1), its outline with a warning
 * where Pure's precedence reads it other than likely meant, and fixes
 * (round 2), and the input's columns, which a click writes at the cursor,
 * or at the end before the code is clicked into.
 */
export const CubeExpressionFilterEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState, inputSchemas, readOnly } = props;
    const draft = guaranteeType(props.draft, CubeExpressionFilterDraft);
    const [schema] = inputSchemas as [Schema];
    const [expanded, setExpanded] = useState(false);
    const inserter = useRef<CodeEditorTextInserter | undefined>(undefined);
    const textEditor = useRef<CodeEditorTextEditor | undefined>(undefined);
    const [hasCursor, setHasCursor] = useState(false);
    // the part of the outline pointed at
    const [pointed, setPointed] = useState<CubeCodeRange | undefined>();
    const { outline } = draft;
    const catalogue = editorState.functionCatalogue;
    useEffect(() => editorState.loadFunctionCatalogue(), [editorState]);
    // typing goes on while the code is checked
    const disabled = readOnly;
    /** Writes text at the condition's cursor, or at its end before it is clicked into, as the chips do */
    const write = (text: string): void => {
      if (hasCursor && inserter.current?.(text)) {
        return;
      }
      const separator = /\s$/u.test(draft.code) ? '' : ' ';
      draft.setCode(`${draft.code}${separator}${text}`);
    };
    /** Writes a fix into the condition, as one step Undo takes back */
    const edit = (edits: readonly CubeCodeEdit[]): void => {
      setPointed(undefined);
      if (!textEditor.current?.(toCodeEditorEdits(edits))) {
        draft.setCode(applyCubeCodeEdits(draft.code, edits));
      }
    };
    return (
      <div className="flex flex-col gap-2 text-base">
        <div className="flex items-center gap-1">
          <span className="flex-1">Condition</span>
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)]"
            aria-label="Expand the condition"
            title={expanded ? 'Show fewer lines' : 'Show more lines'}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <CompressIcon /> : <ExpandIcon />}
          </button>
        </div>
        <div
          aria-label="Condition"
          data-check-status={draft.checkStatus}
          className={getCubeCodeBoxClass(draft.checkStatus)}
          style={{ height: expanded ? 240 : 96 }}
          onFocus={() => setHasCursor(true)}
        >
          <CodeEditor
            inputValue={draft.code}
            updateInput={(code) => draft.setCode(code)}
            language={PURE}
            isReadOnly={disabled}
            hideMinimap={true}
            hideGutter={true}
            hideActionBar={true}
            error={markerOf(draft.problem)}
            completions={getCubeExpressionCompletionSource(
              schema.columns,
              (text) => draft.getEngineCompletions(text),
              catalogue,
            )}
            hover={getCubeFunctionHoverSource(catalogue)}
            signatureHelp={getCubeFunctionSignatureHelpSource(catalogue)}
            textInserterRef={inserter}
            textEditorRef={textEditor}
            highlightedRange={pointed ? toCodeEditorRange(pointed) : undefined}
            extraEditorOptions={{
              lineNumbers: 'off',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
            // the completions show over the editor's popper, not cut by it
            floatingWidgetsInBody={true}
          />
        </div>
        <CubeConditionStatus draft={draft} />
        <CubePrecedenceWarning
          traps={draft.precedenceTraps}
          disabled={disabled}
          onEdit={edit}
        />
        {outline && (
          <CubeExpressionOutlineView
            outline={outline}
            columns={schema.columns}
            catalogue={catalogue}
            name="the condition"
            disabled={disabled}
            onEdit={edit}
            onPoint={setPointed}
          />
        )}
        <span>Input columns</span>
        <ul aria-label="Input columns" className="flex flex-wrap gap-1">
          {schema.columns.map((column) => (
            <li key={column.name} className="flex items-stretch gap-0.5">
              <button
                className="flex items-center gap-1 rounded-sm border border-[var(--color-border-subtle)] px-1 text-sm hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
                title={`Write ${columnAccessOf(column.name)} at the condition's cursor (${getExactColumnTypeLabel(column)})`}
                disabled={disabled}
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
          disabled={disabled}
          onInsert={write}
        />
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
          {EXPRESSION_FILTER_EDITOR_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    );
  },
);
