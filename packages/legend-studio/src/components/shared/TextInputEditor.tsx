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

import { useState, useRef, useEffect } from 'react';
import type { IDisposable } from 'monaco-editor';
import { editor as monacoEditorAPI, KeyCode } from 'monaco-editor';
import type { EDITOR_LANGUAGE } from '../../stores/EditorConfig';
import { TAB_SIZE, EDITOR_THEME } from '../../stores/EditorConfig';
import { useResizeDetector } from 'react-resize-detector';

import {
  disposeEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
  resetLineNumberGutterWidth,
} from '../../utils/TextEditorUtil';
import { useEditorStore } from '../../stores/EditorStore';
import { useApplicationStore } from '../../stores/ApplicationStore';

export const TextInputEditor: React.FC<{
  inputValue: string;
  isReadOnly?: boolean;
  language: EDITOR_LANGUAGE;
  showMiniMap?: boolean;
  hideGutter?: boolean;
  extraEditorOptions?: monacoEditorAPI.IEditorOptions &
    monacoEditorAPI.IGlobalEditorOptions;
  updateInput?: (val: string) => void;
}> = (props) => {
  const {
    inputValue,
    updateInput,
    language,
    isReadOnly,
    showMiniMap,
    hideGutter,
    extraEditorOptions,
  } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const [editor, setEditor] =
    useState<monacoEditorAPI.IStandaloneCodeEditor | undefined>();
  const onDidChangeModelContentEventDisposer =
    useRef<IDisposable | undefined>(undefined);
  const textInputRef = useRef<HTMLDivElement>(null);

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
        formatOnType: true,
        formatOnPaste: true,
      });
      _editor.onKeyDown((event) => {
        // NOTE: ideally, we should make this component fully independent of `editorStore` but we can't for now
        // since `monaco-editor` does not give a way to disable hot key by default
        if (event.keyCode === KeyCode.F8) {
          event.preventDefault();
          event.stopPropagation();
          editorStore
            .toggleTextMode()
            .catch(applicationStore.alertIllegalUnhandledError);
        }
      });
      disableEditorHotKeys(_editor);
      setEditor(_editor);
    }
  }, [applicationStore, editorStore, editor]);

  useEffect(() => {
    if (editor) {
      resetLineNumberGutterWidth(editor);
      const model = editor.getModel();
      if (model) {
        monacoEditorAPI.setModelLanguage(model, language);
      }
    }
  }, [editor, language]);

  if (editor) {
    // dispose the old editor content setter in case the `updateInput` handler changes
    // for a more extensive note on this, see `LambdaEditor`
    onDidChangeModelContentEventDisposer.current?.dispose();
    onDidChangeModelContentEventDisposer.current =
      editor.onDidChangeModelContent(() => {
        const currentVal = editor.getValue();
        if (currentVal !== inputValue) {
          updateInput?.(currentVal);
        }
      });

    // Set the text value and editor options
    const currentValue = editor.getValue();
    if (currentValue !== inputValue) {
      editor.setValue(inputValue);
    }
    editor.updateOptions({
      readOnly: Boolean(isReadOnly),
      minimap: { enabled: Boolean(showMiniMap) },
      // Hide the line number gutter
      // See https://github.com/microsoft/vscode/issues/30795
      ...(hideGutter
        ? {
            glyphMargin: false,
            folding: false,
            lineNumbers: 'off',
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 0,
          }
        : {}),
      ...(extraEditorOptions ?? {}),
    });
    const model = editor.getModel();
    model?.updateOptions({ tabSize: TAB_SIZE });
  }

  useEffect(
    () => (): void => {
      if (editor) {
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
};
