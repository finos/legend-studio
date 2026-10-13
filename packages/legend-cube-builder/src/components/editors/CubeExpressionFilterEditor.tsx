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
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  EXPRESSION_FILTER_EDITOR_NOTES,
  getColumnTypeLabel,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeConditionProblem,
  CubeExpressionFilterDraft,
} from '../../stores/editors/CubeExpressionFilterDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import { columnAccessOf } from './CubeExtendEditor.js';
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
 * which the panel's problems show; that it is checked, or that it waits
 */
const CubeConditionStatus = observer(
  (props: { draft: CubeExpressionFilterDraft }) => {
    const { draft } = props;
    const { problem } = draft;
    if (problem?.refused) {
      return null;
    }
    if (problem) {
      return (
        <div className="text-sm text-[var(--color-status-error)]">
          <div>{problem.message}</div>
          {problem.hint && (
            <div className="text-[var(--color-text-secondary)]">
              {problem.hint}
            </div>
          )}
        </div>
      );
    }
    if (!draft.isValidated) {
      return (
        <div className="text-sm text-[var(--color-text-muted)]">
          Not validated yet
        </div>
      );
    }
    return draft.isChecked ? (
      <div className="text-sm text-[var(--color-text-secondary)]">
        One Boolean of a row: the rows for which it is true are kept
      </div>
    ) : null;
  },
);

/**
 * The Filter by Expression editor (PLAN §11.11): the condition's code in a
 * code editor, Validate (F10), which the engine does, and the input's
 * columns, which a click writes at the end of the code.
 */
export const CubeExpressionFilterEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { inputSchemas, readOnly } = props;
    const draft = guaranteeType(props.draft, CubeExpressionFilterDraft);
    const [schema] = inputSchemas as [Schema];
    const [expanded, setExpanded] = useState(false);
    const disabled = readOnly || draft.validating;
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
          className="overflow-hidden rounded-sm border border-[var(--color-border-default)]"
          style={{ height: expanded ? 240 : 96 }}
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
            extraEditorOptions={{
              lineNumbers: 'off',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <CubeConditionStatus draft={draft} />
        <div className="flex items-center gap-2">
          <CubeButton
            primary={!draft.isValidated}
            title={
              readOnly
                ? READ_ONLY_CUBE_TITLE
                : "Check the condition with the engine, and plan it for this cube's database (F10)"
            }
            disabled={disabled}
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
                title={`Write ${columnAccessOf(column.name)} at the end of the condition (${getColumnTypeLabel(column)})`}
                disabled={disabled}
                onClick={() => {
                  const separator = /\s$/u.test(draft.code) ? '' : ' ';
                  draft.setCode(
                    `${draft.code}${separator}${columnAccessOf(column.name)}`,
                  );
                }}
              >
                <CubeColumnTypeIcon type={column.type} />
                {column.name}
              </button>
            </li>
          ))}
        </ul>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
          {EXPRESSION_FILTER_EDITOR_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    );
  },
);
