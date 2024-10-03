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

import { DataCubeIcon } from '@finos/legend-art';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
  moveCursorToPosition,
  PURE_CODE_EDITOR_WORD_SEPARATORS,
  setErrorMarkers,
} from '@finos/legend-code-editor';
import { editor as monacoEditorAPI } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID } from './DataCubePureCodeEditorUtils.js';
import type { DataCubeQueryBuilderError } from '../../stores/core/DataCubeEngine.js';

export function DataCubeCodeCheckErrorAlert(props: {
  editorModel: monacoEditorAPI.ITextModel;
  error: DataCubeQueryBuilderError;
  message: string;
  text?: string | undefined;
}) {
  const { editorModel, error, message, text } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();

  useEffect(() => {
    if (!editor && editorRef.current) {
      const element = editorRef.current;
      const newEditor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        fontSize: 12,
        language: CODE_EDITOR_LANGUAGE.PURE,
        theme: CODE_EDITOR_THEME.GITHUB_LIGHT,
        wordSeparators: PURE_CODE_EDITOR_WORD_SEPARATORS,
        // Make sure the widgets (tooltips, menus) are not clipped by the container bounds
        // and fix the problem where widgets are rendered with position=fixed not working well with parent
        // containers (i.e. the draggable window) which has been transformed
        // See https://dev.to/salilnaik/the-uncanny-relationship-between-position-fixed-and-transform-property-32f6
        // See https://github.com/microsoft/monaco-editor/issues/2793#issuecomment-999337740
        fixedOverflowWidgets: true,
        overflowWidgetsDomNode: document.getElementById(
          MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID,
        )!,
        readOnly: true,
        // By design, error markers would not show in read-only mode, use this to force it
        // See https://github.com/microsoft/monaco-editor/issues/311
        renderValidationDecorations: 'on',
      });

      newEditor.setModel(editorModel);
      setEditor(newEditor);
    }
  }, [editor, editorModel]);

  useEffect(() => {
    if (error.sourceInformation) {
      setErrorMarkers(editorModel, [
        {
          message: error.message,
          startLineNumber: error.sourceInformation.startLine,
          startColumn: error.sourceInformation.startColumn,
          endLineNumber: error.sourceInformation.endLine,
          endColumn: error.sourceInformation.endColumn,
        },
      ]);
      if (editor) {
        moveCursorToPosition(editor, {
          lineNumber: error.sourceInformation.startLine,
          column: error.sourceInformation.startColumn,
        });
      }
    }
  }, [editor, editorModel, error]);

  // clean up
  useEffect(
    () => (): void => {
      if (editor) {
        editor.dispose();
      }
    },
    [editor],
  );

  return (
    <div className="h-full w-full overflow-auto">
      <div className="flex w-full p-6 pb-2.5">
        <div className="mr-3">
          <DataCubeIcon.AlertError className="flex-shrink-0 stroke-[0.5px] text-[40px] text-red-500" />
        </div>
        <div>
          <div className="whitespace-break-spaces text-lg">{message}</div>
          <div className="mt-1 whitespace-break-spaces text-neutral-500">
            {text}
          </div>
        </div>
      </div>
      <div className="h-60 justify-center border px-2">
        <div className="h-full w-full p-2 pt-1">
          <div className="relative h-full w-full border border-red-500">
            <div
              className="absolute left-0 top-0 h-full w-full overflow-hidden"
              ref={editorRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
