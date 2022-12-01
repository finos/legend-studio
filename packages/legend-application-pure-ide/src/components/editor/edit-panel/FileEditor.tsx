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
import {
  editor as monacoEditorAPI,
  KeyCode,
  type Position,
} from 'monaco-editor';
import type { FileEditorState } from '../../../stores/EditorState.js';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../../../server/models/PureFile.js';
import {
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  MONOSPACED_FONT_FAMILY,
  TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  disposeEditor,
  moveCursorToPosition,
  setErrorMarkers,
  useResizeDetector,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';

export const FileEditor = observer(
  (props: { editorState: FileEditorState }) => {
    const { editorState } = props;
    const currentCursorPosition = useRef<Position | undefined>(undefined);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const content = editorState.file.content;
    const textInput = useRef<HTMLDivElement>(null);
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (!editor && textInput.current) {
        const element = textInput.current;
        const _editor = monacoEditorAPI.create(element, {
          contextmenu: false,
          copyWithSyntaxHighlighting: false,
          // NOTE: These following font options are needed (and CSS font-size option `.monaco-editor * { font-size: ... }` as well)
          // in order to make the editor appear properly on multiple platform, the ligatures option is needed for Mac to display properly
          // otherwise the cursor position relatively to text would be off
          // Another potential cause for this misaligment is that the fonts are being lazy-loaded and made available after `monaco-editor`
          // calculated the font-width, for this, we can use `remeasureFonts`, but our case here, `fontLigatures: true` seems
          // to do the trick
          // See https://github.com/microsoft/monaco-editor/issues/392
          fontSize: 14,
          // Enforce a fixed font-family to make cross platform display consistent (i.e. Mac defaults to use `Menlo` which is bigger than
          // `Consolas` on Windows, etc.)
          fontFamily: MONOSPACED_FONT_FAMILY,
          fontLigatures: true,
          fixedOverflowWidgets: true, // make sure hover or widget near boundary are not truncated
          language: EDITOR_LANGUAGE.PURE,
          theme: EDITOR_THEME.LEGEND,
        });
        _editor.onDidChangeCursorPosition(() => {
          const currentPosition = _editor.getPosition();
          if (currentPosition) {
            currentCursorPosition.current = currentPosition;
          }
        });
        _editor.onDidChangeModelContent(() => {
          const currentVal = _editor.getValue();
          if (currentVal !== editorState.file.content) {
            // the assertion above is to ensure we don't accidentally clear error on initialization of the editor
            editorState.clearError(); // clear error on content change/typing
          }
          editorState.file.setContent(currentVal);
        });
        // TODO-BEFORE-PR: cleanup to use the general mechanism
        _editor.onKeyDown((event) => {
          if (event.keyCode === KeyCode.F9) {
            event.preventDefault();
            event.stopPropagation();
            flowResult(editorStore.executeGo()).catch(
              applicationStore.alertUnhandledError,
            );
          } else if (
            event.keyCode === KeyCode.KeyB &&
            event.ctrlKey &&
            !event.altKey
          ) {
            // [ctrl + b] Navigate
            event.preventDefault();
            event.stopPropagation();
            const currentPosition = _editor.getPosition();
            if (currentPosition) {
              const coordinate = new FileCoordinate(
                editorState.filePath,
                currentPosition.lineNumber,
                currentPosition.column,
              );
              flowResult(editorStore.executeNavigation(coordinate)).catch(
                applicationStore.alertUnhandledError,
              );
            }
          } else if (
            event.keyCode === KeyCode.KeyB &&
            event.ctrlKey &&
            event.altKey
          ) {
            // [ctrl + alt + b] Navigate back
            event.preventDefault();
            event.stopPropagation();
            flowResult(editorStore.navigateBack()).catch(
              applicationStore.alertUnhandledError,
            );
          } else if (event.keyCode === KeyCode.F7 && event.altKey) {
            // [alt + f7] Find usages
            event.preventDefault();
            event.stopPropagation();
            const currentPosition = _editor.getPosition();
            if (currentPosition) {
              const coordinate = new FileCoordinate(
                editorState.filePath,
                currentPosition.lineNumber,
                currentPosition.column,
              );
              flowResult(editorStore.findUsages(coordinate)).catch(
                applicationStore.alertUnhandledError,
              );
            }
          }
          // NOTE: Legacy IDE's [alt + g] -> go to line ~ equivalent to `monaco-editor`'s [ctrl + g]
        });
        _editor.focus(); // focus on the editor initially
        setEditor(_editor);
      }
    }, [editorStore, applicationStore, editor, editorState]);

    if (editor) {
      // Set the value of the editor
      const currentValue = editor.getValue();
      if (currentValue !== content) {
        editor.setValue(content);
      }
      const editorModel = editor.getModel();
      if (editorModel) {
        editorModel.updateOptions({ tabSize: TAB_SIZE });
        const pos = editorState.coordinate;
        if (pos?.errorMessage) {
          setErrorMarkers(editorModel, [
            {
              message: pos.errorMessage,
              startLineNumber: pos.line,
              startColumn: pos.column,
              endLineNumber: pos.line,
              endColumn: pos.column,
            },
          ]);
        } else {
          monacoEditorAPI.setModelMarkers(editorModel, 'Error', []);
        }
      }
    }

    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    useEffect(() => {
      const pos = editorState.coordinate;
      if (editor && pos) {
        moveCursorToPosition(editor, {
          lineNumber: pos.line,
          column: pos.column,
        });
      }
    }, [editor, editorState.coordinate]);

    // NOTE: dispose the editor to prevent potential memory-leak
    useEffect(
      () => (): void => {
        if (editor) {
          disposeEditor(editor);
        }
      },
      [editor],
    );

    // remember the line the editor is on when we switch to another tab
    useEffect(
      () => (): void => {
        if (currentCursorPosition.current) {
          editorState.setCoordinate(
            new FileCoordinate(
              editorState.filePath,
              currentCursorPosition.current.lineNumber,
              currentCursorPosition.current.column,
            ),
          );
        }
      },
      [editorState],
    );

    return (
      <div className="panel edit-panel">
        <div className="panel__content edit-panel__content edit-panel__content--headless">
          <div ref={ref} className="text-editor__container">
            <div className="text-editor__body" ref={textInput} />
          </div>
        </div>
      </div>
    );
  },
);
