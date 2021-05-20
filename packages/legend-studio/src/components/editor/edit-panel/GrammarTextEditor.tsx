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

import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editor as monacoEditorAPI, KeyCode } from 'monaco-editor';
import { useEditorStore } from '../../../stores/EditorStore';
import { ContextMenu } from '@finos/legend-studio-components';
import {
  revealError,
  setErrorMarkers,
  disposeEditor,
  baseTextEditorSettings,
  disableEditorHotKeys,
  resetLineNumberGutterWidth,
} from '../../../utils/TextEditorUtil';
import {
  TAB_SIZE,
  EDITOR_THEME,
  EDITOR_LANGUAGE,
} from '../../../stores/EditorConfig';
import { useResizeDetector } from 'react-resize-detector';
import { FaUserSecret } from 'react-icons/fa';
import { MdMoreHoriz } from 'react-icons/md';
import { useApplicationStore } from '../../../stores/ApplicationStore';

export const GrammarTextEditorHeaderTabContextMenu = observer(
  (props: {}, ref: React.Ref<HTMLDivElement>) => {
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const leaveTextMode = applicationStore.guaranteeSafeAction(() =>
      editorStore.toggleTextMode(),
    );

    return (
      <div ref={ref} className="edit-panel__header__tab__context-menu">
        <button
          className="edit-panel__header__tab__context-menu__item"
          onClick={leaveTextMode}
        >
          Leave Text Mode
        </button>
      </div>
    );
  },
  { forwardRef: true },
);

export const GrammarTextEditor = observer(() => {
  const [editor, setEditor] =
    useState<monacoEditorAPI.IStandaloneCodeEditor | undefined>();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const grammarTextEditorState = editorStore.grammarTextEditorState;
  const currentElementLabelRegexString =
    grammarTextEditorState.currentElementLabelRegexString;
  const error = editorStore.graphState.compilationError;
  const graphGrammarText = grammarTextEditorState.graphGrammarText;
  const textInput = useRef<HTMLDivElement>(null);

  const leaveTextMode = applicationStore.guaranteeSafeAction(() =>
    editorStore.toggleTextMode(),
  );

  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    if (width !== undefined && height !== undefined) {
      editor?.layout({ width, height });
    }
  }, [editor, width, height]);

  useEffect(() => {
    if (!editor && textInput.current) {
      const element = textInput.current;
      const _editor = monacoEditorAPI.create(element, {
        ...baseTextEditorSettings,
        language: EDITOR_LANGUAGE.PURE,
        theme: EDITOR_THEME.STUDIO,
      });
      _editor.onDidChangeModelContent(() => {
        grammarTextEditorState.setGraphGrammarText(_editor.getValue());
        editorStore.graphState.clearCompilationError();
        // we can technically can reset the current element label regex string here
        // but if we do that on first load, the cursor will not jump to the current element
        // also, it's better to place that logic in an effect that watches for the regex string
      });
      _editor.onKeyDown((event) => {
        if (event.keyCode === KeyCode.F9) {
          event.preventDefault();
          event.stopPropagation();
          editorStore.graphState
            .globalCompileInTextMode()
            .catch(applicationStore.alertIllegalUnhandledError);
        } else if (event.keyCode === KeyCode.F8) {
          event.preventDefault();
          event.stopPropagation();
          editorStore
            .toggleTextMode()
            .catch(applicationStore.alertIllegalUnhandledError);
        }
      });
      disableEditorHotKeys(_editor);
      _editor.focus(); // focus on the editor initially
      setEditor(_editor);
    }
  }, [editorStore, applicationStore, editor, grammarTextEditorState]);

  if (editor) {
    // Set the value of the editor
    const currentValue = editor.getValue();
    if (currentValue !== graphGrammarText) {
      editor.setValue(graphGrammarText);
    }
    resetLineNumberGutterWidth(editor);
    const editorModel = editor.getModel();
    if (editorModel) {
      editorModel.updateOptions({ tabSize: TAB_SIZE });
      if (error?.sourceInformation) {
        setErrorMarkers(editorModel, error.sourceInformation, error.message);
      } else {
        monacoEditorAPI.setModelMarkers(editorModel, 'Error', []);
      }
    }
  }

  /**
   * Reveal error has to be in an effect like this because, we want to reveal the error.
   * For this to happen, the editor needs to gain focus. However, if the user clicks on the
   * exit hackermode button, the editor loses focus, and the blocking modal pops up. This modal
   * in turn traps the focus and preventing the editor from gaining the focus to reveal the error.
   * As such we want to dismiss the modal before revealing the error, however, as of the current flow
   * dismissing the modal is called when we set the parser/compiler error. So if this logic belongs to
   * the normal rendering logic, and not an effect, it might happen just when the modal is still present
   * to make sure the modal is dismissed, we should place this logic in an effect to make sure it happens
   * slightly later, also it's better to have this as part of an effect in response to change in the errors
   */
  useEffect(() => {
    if (editor) {
      if (error?.sourceInformation) {
        revealError(editor, error.sourceInformation);
      }
    }
  }, [editor, error, error?.sourceInformation]);

  /**
   * This effect helps to navigate to the currently selected element in the explorer tree
   * NOTE: this effect is placed after the effect to highlight and move cursor to error,
   * as even when there are errors, the user should be able to click on the explorer tree
   * to navigate to the element
   */
  useEffect(() => {
    if (editor && currentElementLabelRegexString) {
      const editorModel = editor.getModel();
      if (editorModel) {
        const match = editorModel.findMatches(
          currentElementLabelRegexString,
          true,
          true,
          true,
          null,
          true,
        );
        if (Array.isArray(match) && match.length) {
          const range = match[0].range;
          editor.focus();
          editor.revealPositionInCenter({
            lineNumber: range.startLineNumber,
            column: range.startColumn,
          });
          editor.setPosition({
            column: range.startColumn,
            lineNumber: range.startLineNumber,
          });
        }
      }
    }
  }, [editor, currentElementLabelRegexString]);

  // NOTE: dispose the editor to prevent potential memory-leak
  useEffect(
    () => (): void => {
      if (editor) {
        disposeEditor(editor);
      }
    },
    [editor],
  );

  return (
    <div className="panel edit-panel">
      <ContextMenu className="panel__header edit-panel__header" disabled={true}>
        <div className="edit-panel__header__tabs">
          <div className="edit-panel__header__tab edit-panel__header__tab__exit-text-mode">
            <button
              className="edit-panel__header__tab__label edit-panel__header__tab__exit-text-mode__label"
              disabled={editorStore.graphState.isApplicationLeavingTextMode}
              onClick={leaveTextMode}
              tabIndex={-1}
              title="Click to exit text mode and go back to form mode"
            >
              <MdMoreHoriz />
            </button>
          </div>
          <ContextMenu
            className="edit-panel__header__tab edit-panel__header__tab__text-mode edit-panel__header__tab--active"
            content={<GrammarTextEditorHeaderTabContextMenu />}
          >
            <div className="edit-panel__header__tab__icon">
              <FaUserSecret />
            </div>
            <div className="edit-panel__header__tab__label">Text Mode</div>
          </ContextMenu>
        </div>
      </ContextMenu>
      <div className="panel__content edit-panel__content">
        <div ref={ref} className="text-editor__container">
          <div className="text-editor__body" ref={textInput} />
        </div>
      </div>
    </div>
  );
});
