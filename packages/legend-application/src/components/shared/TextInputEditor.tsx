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
import {
  type IDisposable,
  type IKeyboardEvent,
  editor as monacoEditorAPI,
} from 'monaco-editor';
import { useResizeDetector } from 'react-resize-detector';
import {
  disposeEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
  resetLineNumberGutterWidth,
  getEditorValue,
  normalizeLineEnding,
} from '@finos/legend-art';
import { type EDITOR_LANGUAGE, EDITOR_THEME, TAB_SIZE } from '../../const.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';

export type TextInputEditorOnKeyDownEventHandler = {
  matcher: (event: IKeyboardEvent) => boolean;
  action: (event: IKeyboardEvent) => void;
};

export const TextInputEditor: React.FC<{
  inputValue: string;
  isReadOnly?: boolean | undefined;
  language: EDITOR_LANGUAGE;
  showMiniMap?: boolean | undefined;
  hideGutter?: boolean | undefined;
  extraEditorOptions?:
    | (monacoEditorAPI.IEditorOptions & monacoEditorAPI.IGlobalEditorOptions)
    | undefined;
  updateInput?: ((val: string) => void) | undefined;
  onKeyDownEventHandlers?: TextInputEditorOnKeyDownEventHandler[] | undefined;
}> = (props) => {
  const {
    inputValue,
    updateInput,
    language,
    isReadOnly,
    showMiniMap,
    hideGutter,
    extraEditorOptions,
    onKeyDownEventHandlers,
  } = props;
  const applicationStore = useApplicationStore();
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const onKeyDownEventDisposer = useRef<IDisposable | undefined>(undefined);
  const onDidChangeModelContentEventDisposer = useRef<IDisposable | undefined>(
    undefined,
  );

  /**
   * NOTE: we want to normalize line ending here since if the original
   * input value includes CR '\r' character, it will get normalized, calling
   * the updateInput method and cause a rerender. With the way we setup
   * `onChange` method, React will warn about `setState` being called in
   * `render` method.
   * See https://github.com/finos/legend-studio/issues/608
   */
  const value = normalizeLineEnding(inputValue);
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
        theme: applicationStore.TEMPORARY__isLightThemeEnabled
          ? EDITOR_THEME.TEMPORARY__VSCODE_LIGHT
          : EDITOR_THEME.LEGEND,
        formatOnType: true,
        formatOnPaste: true,
      });
      disableEditorHotKeys(_editor);
      setEditor(_editor);
    }
  }, [applicationStore, editor]);

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
        const currentVal = getEditorValue(editor);
        if (currentVal !== value) {
          updateInput?.(currentVal);
        }
      });

    // dispose to avoid trigger hotkeys multiple times
    // for a more extensive note on this, see `LambdaEditor`
    onKeyDownEventDisposer.current?.dispose();
    onKeyDownEventDisposer.current = editor.onKeyDown((event) => {
      onKeyDownEventHandlers?.forEach((handler) => {
        if (handler.matcher(event)) {
          event.preventDefault();
          event.stopPropagation();
          handler.action(event);
        }
      });
    });

    // Set the text value and editor options
    const currentValue = getEditorValue(editor);
    if (currentValue !== value) {
      editor.setValue(value);
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
