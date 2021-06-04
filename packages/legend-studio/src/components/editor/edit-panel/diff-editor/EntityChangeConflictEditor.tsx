/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { useState, useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import type { IDisposable } from 'monaco-editor';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  Range,
} from 'monaco-editor';
import {
  TAB_SIZE,
  EDITOR_THEME,
  EDITOR_LANGUAGE,
} from '../../../../stores/EditorConfig';
import { useResizeDetector } from 'react-resize-detector';
import {
  disposeEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
  moveToPosition,
  setErrorMarkers,
  revealError,
  resetLineNumberGutterWidth,
} from '../../../../utils/TextEditorUtil';
import type { EntityChangeConflict } from '../../../../models/sdlc/models/entity/EntityChangeConflict';
import type {
  MergeEditorComparisonViewInfo,
  MergeConflict,
} from '../../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import {
  EntityChangeConflictEditorState,
  ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE,
} from '../../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import {
  IllegalStateError,
  shallowStringify,
  debounce,
  isNonNullable,
  hashObject,
} from '@finos/legend-studio-shared';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { clsx, CustomSelectorInput } from '@finos/legend-studio-components';
import { TextDiffView } from '../../../shared/DiffView';
import { MdCompareArrows } from 'react-icons/md';
import { getPrettyLabelForRevision } from '../../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { useApplicationStore } from '../../../../stores/ApplicationStore';

const getConflictSummaryText = (
  conflictEditorState: EntityChangeConflictEditorState,
): string => {
  // We will annotate each possible conflict using convension: [current change - incoming change]
  // for more deatils, refer to the extensive note in `ChangeDetectionState`
  if (
    !conflictEditorState.baseEntity &&
    conflictEditorState.currentChangeEntity &&
    conflictEditorState.incomingChangeEntity
  ) {
    // [CREATE - CREATE]
    return `Entity is created in both your changes and their changes`;
  } else if (conflictEditorState.baseEntity) {
    if (
      !conflictEditorState.currentChangeEntity &&
      conflictEditorState.incomingChangeEntity
    ) {
      // [DELETE - MODIFY]
      return `Entity is deleted in your changes but modified in their changes`;
    } else if (
      conflictEditorState.currentChangeEntity &&
      !conflictEditorState.incomingChangeEntity
    ) {
      // [MODIFY - DELETE]
      return `Entity is modified in your changes but deleted in their changes`;
    } else if (
      conflictEditorState.currentChangeEntity &&
      conflictEditorState.incomingChangeEntity
    ) {
      // [MODIFY - MODIFY]
      if (
        hashObject(conflictEditorState.currentChangeEntity) ===
        hashObject(conflictEditorState.incomingChangeEntity)
      ) {
        return 'Entity contents are identical';
      }
      return `Entity is modified in both your changes and their changes`;
    }
  }
  throw new IllegalStateError(
    `Detected unfeasible state while computing entity change conflict for entity '${conflictEditorState.entityPath}', ` +
      `with base entity: ${shallowStringify(
        conflictEditorState.baseEntity,
      )}, ` +
      `current change entity: ${shallowStringify(
        conflictEditorState.currentChangeEntity,
      )}, ` +
      `and incoming change entity: ${shallowStringify(
        conflictEditorState.incomingChangeEntity,
      )}`,
  );
};

export const EntityChangeConflictSideBarItem = observer(
  (props: {
    conflict: EntityChangeConflict;
    isSelected: boolean;
    openConflict: () => void;
  }) => {
    const { conflict, isSelected, openConflict } = props;
    return (
      <button
        key={`conflict-${conflict.entityPath}`}
        className={clsx('side-bar__panel__item', {
          'side-bar__panel__item--selected': isSelected,
        })}
        tabIndex={-1}
        title={`${conflict.entityPath} \u2022 Has merge conflict(s)\n${conflict.conflictReason}`}
        onClick={openConflict}
      >
        <div className="diff-panel__item__info">
          <span className="diff-panel__item__info-name diff-panel__item__info-name--conflict">
            {conflict.entityName}
          </span>
          <span className="diff-panel__item__info-path">
            {conflict.entityPath}
          </span>
        </div>
        <div className="diff-panel__item__type diff-panel__item__type--conflict">
          C
        </div>
      </button>
    );
  },
);

const MergeConflictEditor = observer(
  (props: { conflictEditorState: EntityChangeConflictEditorState }) => {
    const { conflictEditorState } = props;
    const isReadOnly = conflictEditorState.isReadOnly;
    const [editor, setEditor] =
      useState<monacoEditorAPI.IStandaloneCodeEditor | undefined>();
    const [hasInitializedTextValue, setInitializedTextValue] = useState(false);
    const value = conflictEditorState.mergedText;
    const currentValue = editor?.getValue() ?? '';
    const error = conflictEditorState.mergeEditorParserError;
    const decorations = useRef<string[]>([]);
    const mergeConflictResolutionCodeLensDisposer =
      useRef<IDisposable | undefined>(undefined);
    const onDidChangeModelContentEventDisposer =
      useRef<IDisposable | undefined>(undefined);
    const textInputRef = useRef<HTMLDivElement>(null);

    // cursor
    const onDidChangeCursorPositionEventDisposer =
      useRef<IDisposable | undefined>(undefined);
    const onDidBlurEditorTextEventDisposer =
      useRef<IDisposable | undefined>(undefined);
    const onDidFocusEditorTextEventDisposer =
      useRef<IDisposable | undefined>(undefined);

    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    useEffect(() => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const _editor = monacoEditorAPI.create(element, {
          ...baseTextEditorSettings,
          theme: EDITOR_THEME.STUDIO,
          language: EDITOR_LANGUAGE.PURE,
          minimap: { enabled: false },
          formatOnType: true,
          formatOnPaste: true,
        });
        disableEditorHotKeys(_editor);
        _editor.focus(); // focus on the editor initially so we can correctly compute next/prev conflict chunks
        setEditor(_editor);
      }
    }, [editor]);

    if (editor) {
      // dispose the old editor content setter in case the `updateInput` handler changes
      // for a more extensive note on this, see `LambdaEditor`
      onDidChangeModelContentEventDisposer.current?.dispose();
      onDidChangeModelContentEventDisposer.current =
        editor.onDidChangeModelContent(() => {
          conflictEditorState.setMergedText(editor.getValue());
          conflictEditorState.clearMergeEditorError();
        });

      // sync cursor position with merge editor state to properly monitor conflict chunk navigation
      onDidChangeCursorPositionEventDisposer.current?.dispose();
      onDidChangeCursorPositionEventDisposer.current =
        editor.onDidChangeCursorPosition((event) => {
          // this is done to avoid modifying the parent merge editor component from the child.
          // if this action is triggered on purpose or async or in an effect then we can ignore it
          // but when we first render this editor and update the merge editor line number
          // which in turn affect the parent component, we will get warnings:
          // "Cannot update a component from inside the function body of a different component."
          // See https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#warnings-for-some-updates-during-render
          if (editor.hasTextFocus()) {
            conflictEditorState.setCurrentMergeEditorLine(
              event.position.lineNumber,
            );
          }
          conflictEditorState.setCurrentMergeEditorConflict(undefined); // reset as we just moved the cursor
        });
      // when the editor lose or gain focus, we will need to sync cursor position properly as well
      onDidBlurEditorTextEventDisposer.current?.dispose();
      onDidBlurEditorTextEventDisposer.current = editor.onDidBlurEditorText(
        () => {
          conflictEditorState.setCurrentMergeEditorLine(undefined);
          conflictEditorState.setCurrentMergeEditorConflict(undefined); // reset as we just moved the cursor
        },
      );
      onDidFocusEditorTextEventDisposer.current?.dispose();
      onDidFocusEditorTextEventDisposer.current = editor.onDidFocusEditorText(
        () => {
          conflictEditorState.setCurrentMergeEditorLine(
            editor.getPosition()?.lineNumber,
          );
          conflictEditorState.setCurrentMergeEditorConflict(undefined); // reset as we just moved the cursor
        },
      );

      // NOTE: since `monaco-editor` does not expose a method to explicitly register commands, we have to use the key-binding command adder method
      // but we send in an invalid keycode to ensure no accidents.
      const selectCurrentChangeCommandId = editor.addCommand(
        -1,
        (baseArg, conflict: MergeConflict) =>
          conflictEditorState.acceptCurrentChange(conflict),
      );
      const selectIncomingChangeCommandId = editor.addCommand(
        -1,
        (baseArg, conflict: MergeConflict) =>
          conflictEditorState.acceptIncomingChange(conflict),
      );
      const selectBothChangesCommandId = editor.addCommand(
        -1,
        (baseArg, conflict: MergeConflict) =>
          conflictEditorState.acceptBothChanges(conflict),
      );
      const rejectBothChangesCommandId = editor.addCommand(
        -1,
        (baseArg, conflict: MergeConflict) =>
          conflictEditorState.rejectBothChanges(conflict),
      );
      const compareChangesCommandId = editor.addCommand(-1, () =>
        conflictEditorState.setCurrentMode(
          ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.CURRENT_INCOMING,
        ),
      );

      // CodeLens registration
      mergeConflictResolutionCodeLensDisposer.current?.dispose();
      mergeConflictResolutionCodeLensDisposer.current =
        monacoLanguagesAPI.registerCodeLensProvider(EDITOR_LANGUAGE.PURE, {
          provideCodeLenses: (model, token) => ({
            lenses: conflictEditorState.mergeConflicts.flatMap((conflict) =>
              [
                !isReadOnly && selectCurrentChangeCommandId
                  ? {
                      range: {
                        startLineNumber: conflict.startHeader,
                        endLineNumber: conflict.startHeader,
                        startColumn: 1,
                        endColumn: 1,
                      },
                      command: {
                        id: selectCurrentChangeCommandId,
                        title: 'Accept Your Change',
                        arguments: [conflict],
                      },
                    }
                  : undefined,
                !isReadOnly && selectIncomingChangeCommandId
                  ? {
                      range: {
                        startLineNumber: conflict.startHeader,
                        endLineNumber: conflict.startHeader,
                        startColumn: 1,
                        endColumn: 1,
                      },
                      command: {
                        id: selectIncomingChangeCommandId,
                        title: 'Accept Their Change',
                        arguments: [conflict],
                      },
                    }
                  : undefined,
                !isReadOnly && selectBothChangesCommandId
                  ? {
                      range: {
                        startLineNumber: conflict.startHeader,
                        endLineNumber: conflict.startHeader,
                        startColumn: 1,
                        endColumn: 1,
                      },
                      command: {
                        id: selectBothChangesCommandId,
                        title: 'Accept Both Changes',
                        arguments: [conflict],
                      },
                    }
                  : undefined,
                !isReadOnly && rejectBothChangesCommandId
                  ? {
                      range: {
                        startLineNumber: conflict.startHeader,
                        endLineNumber: conflict.startHeader,
                        startColumn: 1,
                        endColumn: 1,
                      },
                      command: {
                        id: rejectBothChangesCommandId,
                        title: 'Reject Both Changes',
                        arguments: [conflict],
                      },
                    }
                  : undefined,
                compareChangesCommandId
                  ? {
                      range: {
                        startLineNumber: conflict.startHeader,
                        endLineNumber: conflict.startHeader,
                        startColumn: 1,
                        endColumn: 1,
                      },
                      command: {
                        id: compareChangesCommandId,
                        title: 'Compare Changes',
                      },
                    }
                  : undefined,
              ].filter(isNonNullable),
            ),
            dispose: (): void => {
              /** no need to do anything on disposal */
            },
          }),
          resolveCodeLens: (model, codeLens, token) => codeLens,
        });

      resetLineNumberGutterWidth(editor);
      editor.updateOptions({ readOnly: Boolean(isReadOnly) });

      const editorModel = editor.getModel();
      if (editorModel) {
        editorModel.updateOptions({ tabSize: TAB_SIZE });
        if (error?.sourceInformation) {
          setErrorMarkers(editorModel, error.sourceInformation, error.message);
        } else {
          monacoEditorAPI.setModelMarkers(editorModel, 'Error', []);
        }
      }

      // decoration/highlighting for merge conflicts
      decorations.current = editor.deltaDecorations(
        decorations.current,
        conflictEditorState.mergeConflicts.flatMap((conflict) => {
          const currentChangeContentStartLine = conflict.startHeader + 1;
          const currentChangeContentEndLine =
            (conflict.commonBase ?? conflict.splitter) - 1;
          const baseContentStartLine =
            (conflict.commonBase ?? Number.MAX_SAFE_INTEGER) + 1;
          const baseContentEndLine = conflict.splitter - 1;
          const incomingChangeContentStartLine = conflict.splitter + 1;
          const incomingChangeContentEndLine = conflict.endFooter - 1;
          const currentChangeOverviewRulerColor = '#40c8ae80'; // opacity 50%
          const baseOverviewRulerColor = '#60606080'; // opacity 50%
          const incomingChangeOverviewRulerColor = '#40a6ff80'; // opacity 50%
          return [
            {
              // current change
              range: new Range(
                conflict.startHeader,
                1,
                conflict.startHeader,
                1,
              ),
              options: {
                isWholeLine: true,
                overviewRuler: {
                  color: currentChangeOverviewRulerColor,
                  position: 7, // full
                },
                className: 'merge-editor__current__header',
              },
            },
            currentChangeContentEndLine >= currentChangeContentStartLine
              ? {
                  range: new Range(
                    currentChangeContentStartLine,
                    1,
                    currentChangeContentEndLine,
                    1,
                  ),
                  options: {
                    isWholeLine: true,
                    overviewRuler: {
                      color: currentChangeOverviewRulerColor,
                      position: 7, // full
                    },
                    className: 'merge-editor__current__content',
                  },
                }
              : undefined,
            // base
            conflict.commonBase
              ? {
                  range: new Range(
                    conflict.commonBase,
                    1,
                    conflict.commonBase,
                    1,
                  ),
                  options: {
                    isWholeLine: true,
                    overviewRuler: {
                      color: baseOverviewRulerColor,
                      position: 7, // full
                    },
                    className: 'merge-editor__base__header',
                  },
                }
              : undefined,
            baseContentEndLine >= baseContentStartLine
              ? {
                  range: new Range(
                    baseContentStartLine,
                    1,
                    baseContentEndLine,
                    1,
                  ),
                  options: {
                    isWholeLine: true,
                    overviewRuler: {
                      color: baseOverviewRulerColor,
                      position: 7, // full
                    },
                    className: 'merge-editor__base__content',
                  },
                }
              : undefined,
            // incoming change
            incomingChangeContentEndLine >= incomingChangeContentStartLine
              ? {
                  range: new Range(
                    incomingChangeContentStartLine,
                    1,
                    incomingChangeContentEndLine,
                    1,
                  ),
                  options: {
                    isWholeLine: true,
                    overviewRuler: {
                      color: incomingChangeOverviewRulerColor,
                      position: 7, // full
                    },
                    className: 'merge-editor__incoming__content',
                  },
                }
              : undefined,
            {
              range: new Range(conflict.endFooter, 1, conflict.endFooter, 1),
              options: {
                isWholeLine: true,
                overviewRuler: {
                  color: incomingChangeOverviewRulerColor,
                  position: 7, // full
                },
                className: 'merge-editor__incoming__header',
              },
            },
          ].filter(isNonNullable);
        }),
      );
    }

    /**
     * Set the text value when the text value is set not by editing the text inside the editor, but as a reaction to a change in
     * value from the parent state.
     * NOTE: using `editor.setValue` is convenient, but it will make us lose the undo-redo stack, so we have to use `pushEditOperations`
     * Also, because we don't want to let the user undo to the initial blank text, we use a boolean flag to check if this is the very first
     * meaningful value set so we can block undo
     * Since `mergeText` can be undefined, We also use the fact that `value === undefined` to make decision on when to actually update the
     * value of the editor
     */
    useEffect(() => {
      if (editor) {
        const editorModel = editor.getModel();
        if (editorModel && value !== undefined && currentValue !== value) {
          if (!hasInitializedTextValue) {
            editor.setValue(value);
            setInitializedTextValue(true);
          } else {
            const lineCount = editorModel.getLineCount();
            const lastLineLength = editorModel.getLineMaxColumn(lineCount);
            const range = new Range(1, 1, lineCount, lastLineLength);
            // ensure we push the previous text to the undo-redo stack,
            // otherwise, if after we set the text value using `pushEditOperations`, we try to undo, we will
            // undo to the previous state before the state we make this edit, i.e. missing 1 undo state.
            editorModel.pushStackElement();
            editorModel.pushEditOperations(
              [],
              [{ range: range, text: value, forceMoveMarkers: true }],
              () => null,
            );
          }
        }
      }
    }, [editor, currentValue, value, hasInitializedTextValue]);

    useEffect(() => {
      if (editor) {
        if (error?.sourceInformation) {
          revealError(editor, error.sourceInformation);
        }
      }
    }, [editor, error, error?.sourceInformation]);

    useEffect(() => {
      if (
        editor &&
        conflictEditorState.currentMergeEditorConflict !== undefined
      ) {
        moveToPosition(
          editor,
          conflictEditorState.currentMergeEditorConflict.startHeader,
          1,
        );
      }
    }, [
      editor,
      conflictEditorState,
      conflictEditorState.currentMergeEditorConflict,
    ]);

    useEffect(
      () => (): void => {
        if (editor) {
          mergeConflictResolutionCodeLensDisposer.current?.dispose(); // dispose codeLens provider so we don't see duplicated commands
          disposeEditor(editor);
        }
      },
      [editor],
    ); // dispose editor

    return (
      <div ref={ref} className="text-editor__container">
        <div className="text-editor__body" ref={textInputRef} />
      </div>
    );
  },
);

const getMergeEditorViewModeOption = (
  mode: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE,
  modeComparisonViewInfo: MergeEditorComparisonViewInfo,
): {
  label: React.ReactNode;
  value: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE;
} => ({
  value: mode,
  label: (
    <div className="entity-change-conflict-editor__header__action__view-dropdown__option">
      <div
        className={`entity-change-conflict-editor__header__action__view-dropdown__option__label entity-change-conflict-editor__header__action__view-dropdown__option__label--${mode.toLowerCase()}`}
      >
        {modeComparisonViewInfo.label}
      </div>
      {mode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW && (
        <div className="entity-change-conflict-editor__header__action__view-dropdown__option__summary">
          <div className="entity-change-conflict-editor__header__action__view-dropdown__option__summary__revision">
            {getPrettyLabelForRevision(modeComparisonViewInfo.fromRevision)}
          </div>
          <div className="entity-change-conflict-editor__header__action__view-dropdown__option__summary__icon">
            <MdCompareArrows />
          </div>
          <div className="entity-change-conflict-editor__header__action__view-dropdown__option__summary__revision">
            {getPrettyLabelForRevision(modeComparisonViewInfo.toRevision)}
          </div>
        </div>
      )}
    </div>
  ),
});

export const EntityChangeConflictEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const conflictEditorState = editorStore.getCurrentEditorState(
    EntityChangeConflictEditorState,
  );
  const isReadOnly = conflictEditorState.isReadOnly;
  // this call might be expensive so we debounce it
  const debouncedUpdateMergeConflicts = useMemo(
    () => debounce(() => conflictEditorState.refreshMergeConflict(), 20),
    [conflictEditorState],
  );
  // header actions
  const goToPreviousConflict = (): void => {
    if (conflictEditorState.previousConflict) {
      conflictEditorState.setCurrentMergeEditorConflict(
        conflictEditorState.previousConflict,
      );
    }
  };
  const goToNextConflict = (): void => {
    if (conflictEditorState.nextConflict) {
      conflictEditorState.setCurrentMergeEditorConflict(
        conflictEditorState.nextConflict,
      );
    }
  };
  // resolutions
  const markAsResolved = applicationStore.guaranteeSafeAction(() =>
    conflictEditorState.markAsResolved(),
  );
  const useTheirs = applicationStore.guaranteeSafeAction(() =>
    conflictEditorState.useIncomingChanges(),
  );
  const useYours = applicationStore.guaranteeSafeAction(() =>
    conflictEditorState.useCurrentChanges(),
  );
  // mode
  const currentMode = conflictEditorState.currentMode;
  const currentModeComparisonViewInfo =
    conflictEditorState.getModeComparisonViewInfo(currentMode);
  const onModeChange = (val: {
    value: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE;
  }): void => conflictEditorState.setCurrentMode(val.value);

  useEffect(() => {
    conflictEditorState
      .refresh()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, conflictEditorState]);

  useEffect(() => {
    debouncedUpdateMergeConflicts.cancel();
    debouncedUpdateMergeConflicts();
  }, [
    conflictEditorState,
    conflictEditorState.mergedText,
    debouncedUpdateMergeConflicts,
  ]);

  // reset transient merge editor states (e.g. cursor position, current merge conflict, etc.) as we exit the tab
  useEffect(
    () => (): void => conflictEditorState.resetMergeEditorStateOnLeave(),
    [conflictEditorState],
  );

  return (
    <div className="entity-change-conflict-editor">
      <div className="entity-change-conflict-editor__header">
        <div className="entity-change-conflict-editor__header__info">
          <div className="entity-change-conflict-editor__header__info__tag">
            <div className="entity-change-conflict-editor__header__info__tag__text">
              {isReadOnly
                ? 'Merge preview'
                : conflictEditorState.mergeSucceeded
                ? 'Merged successfully'
                : 'Merged with conflict(s)'}
            </div>
          </div>
          <div className="entity-change-conflict-editor__header__info__comparison-summary">
            {getConflictSummaryText(conflictEditorState)}
          </div>
        </div>
        <div className="entity-change-conflict-editor__header__info__tag">
          <div className="entity-change-conflict-editor__header__info__tag__text">
            {conflictEditorState.mergeConflicts.length} conflict(s)
          </div>
        </div>
      </div>
      <div className="entity-change-conflict-editor__header__actions">
        <div className="entity-change-conflict-editor__header__actions__main">
          <button
            className="btn--dark btn--sm entity-change-conflict-editor__header__action"
            disabled={!conflictEditorState.previousConflict}
            onClick={goToPreviousConflict}
            title={'Previous conflict'}
          >
            <FaArrowUp />
          </button>
          <button
            className="btn--dark btn--sm entity-change-conflict-editor__header__action"
            disabled={!conflictEditorState.nextConflict}
            onClick={goToNextConflict}
            title={'Next conflict'}
          >
            <FaArrowDown />
          </button>
          <CustomSelectorInput
            className="entity-change-conflict-editor__header__action__view-dropdown"
            options={Object.values(ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE).map(
              (mode) =>
                getMergeEditorViewModeOption(
                  mode,
                  conflictEditorState.getModeComparisonViewInfo(mode),
                ),
            )}
            isSearchable={false}
            onChange={onModeChange}
            value={getMergeEditorViewModeOption(
              currentMode,
              conflictEditorState.getModeComparisonViewInfo(currentMode),
            )}
            darkMode={true}
          />
        </div>
      </div>
      <div
        className={clsx('entity-change-conflict-editor__content', {
          'entity-change-conflict-editor__content--read-only': isReadOnly,
        })}
      >
        {currentMode === ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW && (
          <MergeConflictEditor conflictEditorState={conflictEditorState} />
        )}
        {currentMode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW && (
          <TextDiffView
            language={EDITOR_LANGUAGE.PURE}
            from={currentModeComparisonViewInfo.fromGrammarText ?? ''}
            to={currentModeComparisonViewInfo.toGrammarText ?? ''}
          />
        )}
      </div>
      {!isReadOnly && (
        <div className="entity-change-conflict-editor__actions">
          <button
            className="btn--dark btn--important  entity-change-conflict-editor__action entity-change-conflict-editor__action__use-yours-btn"
            disabled={!conflictEditorState.canUseYours}
            onClick={useYours}
          >
            Use yours
          </button>
          <button
            className="btn--dark btn--important entity-change-conflict-editor__action entity-change-conflict-editor__action__use-theirs-btn"
            disabled={!conflictEditorState.canUseTheirs}
            onClick={useTheirs}
          >
            Use Theirs
          </button>
          <button
            className="btn--dark btn--important entity-change-conflict-editor__action"
            disabled={!conflictEditorState.canMarkAsResolved}
            onClick={markAsResolved}
          >
            Mark as resolved
          </button>
        </div>
      )}
    </div>
  );
});
