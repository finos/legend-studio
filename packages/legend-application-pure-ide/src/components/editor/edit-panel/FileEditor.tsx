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

import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { editor as monacoEditorAPI, type Position } from 'monaco-editor';
import type { FileEditorState } from '../../../stores/FileEditorState.js';
import { FileCoordinate } from '../../../server/models/PureFile.js';
import {
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  TAB_SIZE,
  useApplicationStore,
  useCommands,
} from '@finos/legend-application';
import {
  disposeEditor,
  getBaseTextEditorOptions,
  moveCursorToPosition,
  setErrorMarkers,
  useResizeDetector,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';

export const FileEditor = observer(
  (props: { editorState: FileEditorState }) => {
    const { editorState } = props;
    const currentCursorPosition = useRef<Position | undefined>(undefined);
    const editor = editorState._textEditor;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const content = editorState.file.content;
    const textInput = useRef<HTMLDivElement>(null);
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (textInput.current) {
        const element = textInput.current;
        const _editor = monacoEditorAPI.create(element, {
          ...getBaseTextEditorOptions(),
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
        _editor.focus(); // focus on the editor initially
        editorState.setTextEditor(_editor);
      }
    }, [editorStore, applicationStore, editorState]);

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

    useCommands(editorState);

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
