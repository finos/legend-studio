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

import { QuestionCircleIcon, TimesIcon, WarningIcon } from '@finos/legend-art';
import {
  isIncompleteError,
  isSchemasError,
  isTypingError,
  type QueryNode,
  type Schema,
  UnknownNode,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useRef } from 'react';
import {
  CUBE_NODE_HELP_TEXT,
  SELECT_NODE_TOOLTIP,
} from '../../__lib__/LegendCubeHelpText.js';
import {
  READ_ONLY_CUBE_TITLE,
  toEditorTitle,
} from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_NODE_DRAFT_FACTORIES } from '../../stores/editors/CubeNodeDraftRegistry.js';
import { CubeButton } from '../CubeButton.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';
import { returnFocusToCubeCanvasNode } from '../canvas/CubeCanvasNodeFocus.js';
import { CUBE_NODE_EDITORS } from './CubeNodeEditorRegistry.js';

/** The problems of the edited node against its inputs, as Apply would leave it */
const validateEdited = (
  node: QueryNode,
  inputSchemas: readonly Schema[],
): string[] => {
  const errors: string[] = [];
  node.validate(inputSchemas, errors);
  // waiting for the engine to type an Extend is no problem (PLAN §11.7)
  return [...new Set(errors)].filter((error) => !isTypingError(error));
};

/**
 * The node editor's frame (spec §17.5, PLAN §11.8): a title bar with the
 * node's label and id, its help and Select; a body of 80px to a third of
 * the window, which scrolls, with its type's editor; then its problems and
 * Apply and Cancel, which stay in view. Edits stay in the editor until
 * Apply or closing it; Cancel drops them. While an input is missing or
 * invalid, the body shows why instead of the editor, since there would be
 * no columns to pick.
 */
export const CubeNodeEditorPanel = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { nodeEditor, readOnly } = editorState;
    const rootRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    // finishing first moves the focus out of a field in the editor, so text
    // typed but not yet stored (a filter value is stored on blur) is applied
    useEffect(
      () =>
        nodeEditor.addFlusher(
          () => {
            const focused = document.activeElement;
            if (
              focused instanceof HTMLElement &&
              rootRef.current?.contains(focused)
            ) {
              focused.blur();
            }
          },
          { first: true },
        ),
      [nodeEditor],
    );
    const { node, draft, edited } = nodeEditor;
    if (!node || !draft || !edited) {
      return null;
    }
    const { query } = editorState.document;
    const definition = editorState.registry.get(node.type);
    /** Closes the editor; the keyboard focus goes back to its node */
    const closing = (close: () => unknown): void => {
      const focused = document.activeElement;
      const editor = rootRef.current;
      close();
      if (nodeEditor.nodeId === undefined) {
        returnFocusToCubeCanvasNode(node.id, editor, focused);
      }
    };
    const isCapture = query.selected === node.id;
    const inputProblems = editorState
      .getNodeErrors(node.id)
      .filter((error) => isSchemasError(error) || isIncompleteError(error));
    const inputSchemas = query
      .getInputIds(node.id)
      .map((inputId) =>
        inputId === undefined
          ? undefined
          : editorState.analysis.schemas.get(inputId),
      )
      .filter((schema): schema is Schema => schema !== undefined);
    const Editor = CUBE_NODE_EDITORS.get(node.type);
    const isEditable = CUBE_NODE_DRAFT_FACTORIES.has(node.type);
    // a draft that waits, e.g. on a Validate, says why in place of its problems
    const waiting = draft.applyDisabledReason;
    const problems =
      isEditable && !inputProblems.length && waiting === undefined
        ? validateEdited(edited, inputSchemas)
        : [];
    const warnings = editorState.getNodeWarnings(node);
    return (
      <div
        ref={rootRef}
        className="flex flex-col rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] shadow-lg"
        role="dialog"
        aria-modal={false}
        // focusable, so opening a node from the keyboard moves into it
        tabIndex={-1}
        aria-labelledby={titleId}
        data-testid={LEGEND_CUBE_TEST_ID.NODE_EDITOR}
      >
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2">
          <CubeNodeIcon
            icon={definition?.icon}
            className="shrink-0 text-[var(--color-text-secondary)]"
          />
          <span id={titleId} className="min-w-0 truncate text-lg font-medium">
            {toEditorTitle(definition?.label ?? 'Unknown')}
          </span>
          <span className="shrink-0 text-base text-[var(--color-text-muted)]">
            {node.id}
          </span>
          {definition?.beta && (
            <span className="shrink-0 rounded-sm bg-[var(--color-accent)] px-1 text-xs font-medium text-[var(--color-text-on-accent)]">
              BETA
            </span>
          )}
          <span
            className="shrink-0 text-[var(--color-text-secondary)]"
            title={
              CUBE_NODE_HELP_TEXT[node.type] ??
              CUBE_NODE_HELP_TEXT[UnknownNode.TYPE]
            }
            role="img"
            aria-label="Help"
          >
            <QuestionCircleIcon />
          </span>
          <span className="flex-1" />
          {isCapture ? (
            <span
              className="shrink-0 text-base text-[var(--color-text-secondary)]"
              title={SELECT_NODE_TOOLTIP}
            >
              (Selected)
            </span>
          ) : (
            <button
              className="shrink-0 text-base text-[var(--color-accent)] underline"
              title={SELECT_NODE_TOOLTIP}
              onClick={() => editorState.select(node.id)}
            >
              Select
            </button>
          )}
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            title={
              nodeEditor.hasChanges && !readOnly
                ? 'Close, applying the changes'
                : 'Close'
            }
            aria-label="Close the editor"
            onClick={() => closing(() => nodeEditor.finish())}
          >
            <TimesIcon />
          </button>
        </div>
        <div className="max-h-[33vh] min-h-[80px] overflow-y-auto p-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="mb-2 flex gap-1 text-sm text-[var(--color-status-warn)]"
              role="status"
            >
              <WarningIcon className="mt-0.5 shrink-0" aria-hidden={true} />
              <span>{warning}</span>
            </div>
          ))}
          {inputProblems.length ? (
            <div
              className="text-base text-[var(--color-status-warn)]"
              role="alert"
            >
              {inputProblems.map((problem) => (
                <div key={problem}>{problem}</div>
              ))}
            </div>
          ) : Editor ? (
            <Editor
              editorState={editorState}
              draft={draft}
              inputSchemas={inputSchemas}
              readOnly={readOnly}
            />
          ) : (
            <div className="text-base text-[var(--color-text-secondary)]">
              {`${node.describe()}: this node can't be edited.`}
            </div>
          )}
        </div>
        {isEditable && !inputProblems.length && waiting !== undefined && (
          // in place of the problems, under the body too
          <div
            className="shrink-0 break-words border-t border-[var(--color-border-default)] px-2 py-1 text-base text-[var(--color-text-secondary)]"
            role="status"
          >
            {waiting}
          </div>
        )}
        {problems.length > 0 && (
          // under the body, so they stay in view while it scrolls
          <div
            className="max-h-[56px] shrink-0 overflow-y-auto break-words border-t border-[var(--color-border-default)] px-2 py-1 text-base text-[var(--color-status-error)]"
            role="alert"
            aria-label="Problems"
          >
            {problems.map((problem) => (
              <div key={problem}>{problem}</div>
            ))}
          </div>
        )}
        {isEditable && (
          <div className="flex h-10 shrink-0 items-center justify-end gap-2 border-t border-[var(--color-border-default)] px-2">
            <CubeButton
              title="Drop the changes and close"
              onClick={() => closing(() => nodeEditor.cancel())}
            >
              Cancel
            </CubeButton>
            <CubeButton
              primary={true}
              title={
                readOnly
                  ? READ_ONLY_CUBE_TITLE
                  : (draft.applyDisabledReason ??
                    'Store the changes, as one step to undo')
              }
              disabled={
                readOnly ||
                !nodeEditor.hasChanges ||
                draft.applyDisabledReason !== undefined
              }
              onClick={() => nodeEditor.apply()}
            >
              Apply
            </CubeButton>
          </div>
        )}
      </div>
    );
  },
);
