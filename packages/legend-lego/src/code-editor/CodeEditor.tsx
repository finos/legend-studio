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
  editor as monacoEditorAPI,
  KeyCode,
  KeyMod,
} from 'monaco-editor';
import {
  getBaseCodeEditorOptions,
  resetLineNumberGutterWidth,
  getCodeEditorValue,
  normalizeLineEnding,
  type CODE_EDITOR_LANGUAGE,
  setErrorMarkers,
  clearMarkers,
  CODE_EDITOR_THEME,
  configureCodeEditor,
} from '@finos/legend-code-editor';
import {
  DEFAULT_TAB_SIZE,
  useApplicationStore,
  APPLICATION_EVENT,
  DEFAULT_MONOSPACED_FONT_FAMILY,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { clsx, WordWrapIcon } from '@finos/legend-art';
import type { CompilationError, ParserError } from '@finos/legend-graph';
import { LogEvent } from '@finos/legend-shared';

export const configureCodeEditorComponent = async (
  applicationStore: GenericLegendApplicationStore,
): Promise<void> => {
  await configureCodeEditor(DEFAULT_MONOSPACED_FONT_FAMILY, (error) =>
    applicationStore.logService.error(
      LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
      error.message,
    ),
  );

  // override native hotkeys supported by monaco-editor
  // here we map these keys to a dummy command that would just dispatch the key combination
  // to the application keyboard shortcut service, effectively bypassing the command associated
  // with the native keybinding
  const OVERRIDE_DEFAULT_KEYBINDING_COMMAND =
    'legend.code-editor.override-default-keybinding';
  monacoEditorAPI.registerCommand(
    OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
    (accessor, ...args) => {
      applicationStore.keyboardShortcutsService.dispatch(args[0]);
    },
  );
  const hotkeyMapping: [number, string][] = [
    [KeyCode.F1, 'F1'], // show command center
    [KeyCode.F8, 'F8'], // show error
    [KeyCode.F9, 'F9'], // toggle debugger breakpoint
    [KeyMod.WinCtrl | KeyCode.KeyG, 'Control+KeyG'], // go-to line command
    [KeyMod.WinCtrl | KeyCode.KeyB, 'Control+KeyB'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyO, 'Control+KeyO'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyD, 'Control+KeyD'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyP, 'Control+KeyP'], // cursor move (core command)
    [KeyMod.Shift | KeyCode.F10, 'Shift+F10'], // show editor context menu
    [KeyMod.WinCtrl | KeyCode.F2, 'Control+F2'], // change all instances
    [KeyMod.WinCtrl | KeyCode.F12, 'Control+F12'], // go-to definition
  ];
  monacoEditorAPI.addKeybindingRules(
    hotkeyMapping.map(([nativeCodeEditorKeyBinding, keyCombination]) => ({
      keybinding: nativeCodeEditorKeyBinding,
      command: OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
      commandArgs: keyCombination,
    })),
  );
};

/**
 * Normally `monaco-editor` worker disposes after 5 minutes staying idle, but we fasten
 * this pace just in case the usage of the editor causes memory-leak somehow
 */
export const disposeCodeEditor = (
  editor: monacoEditorAPI.IStandaloneCodeEditor,
): void => {
  editor.dispose();
  // NOTE: just to be sure, we dispose the model after disposing the editor
  editor.getModel()?.dispose();
};

export const CodeEditor: React.FC<{
  inputValue: string;
  isReadOnly?: boolean | undefined;
  lightTheme?: CODE_EDITOR_THEME;
  language: CODE_EDITOR_LANGUAGE;
  hideMinimap?: boolean | undefined;
  hideGutter?: boolean | undefined;
  hidePadding?: boolean | undefined;
  hideActionBar?: boolean | undefined;
  updateInput?: ((val: string) => void) | undefined;
  lineToScroll?: number | undefined;
  extraEditorOptions?:
    | (monacoEditorAPI.IEditorOptions & monacoEditorAPI.IGlobalEditorOptions)
    | undefined;
  error?: ParserError | CompilationError | undefined;
}> = (props) => {
  const {
    inputValue,
    updateInput,
    lightTheme,
    language,
    isReadOnly,
    hideMinimap,
    hideGutter,
    hidePadding,
    hideActionBar,
    lineToScroll,
    extraEditorOptions,
    error,
  } = props;
  const applicationStore = useApplicationStore();
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const [isWordWrap, setIsWordWrap] = useState(false);
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

  const toggleWordWrap = (): void => {
    const updatedWordWrap = !isWordWrap;
    setIsWordWrap(updatedWordWrap);
    editor?.updateOptions({
      wordWrap: updatedWordWrap ? 'on' : 'off',
    });
  };

  useEffect(() => {
    if (!editor && textInputRef.current) {
      const element = textInputRef.current;
      const _editor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        theme: applicationStore.layoutService
          .TEMPORARY__isLightColorThemeEnabled
          ? (lightTheme ?? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT)
          : CODE_EDITOR_THEME.DEFAULT_DARK,

        // layout
        glyphMargin: !hidePadding,
        padding: !hidePadding ? { top: 20, bottom: 20 } : { top: 0, bottom: 0 },

        formatOnType: true,
        formatOnPaste: true,
      });
      setEditor(_editor);
    }
  }, [applicationStore, lightTheme, hidePadding, editor]);

  useEffect(() => {
    if (editor) {
      resetLineNumberGutterWidth(editor);
      const model = editor.getModel();
      if (model) {
        monacoEditorAPI.setModelLanguage(model, language);
      }
    }
  }, [editor, language]);

  useEffect(() => {
    if (editor && lineToScroll !== undefined) {
      editor.revealLineInCenter(lineToScroll);
    }
  }, [editor, lineToScroll]);

  if (editor) {
    // dispose the old editor content setter in case the `updateInput` handler changes
    // for a more extensive note on this, see `LambdaEditor`
    onDidChangeModelContentEventDisposer.current?.dispose();
    onDidChangeModelContentEventDisposer.current =
      editor.onDidChangeModelContent(() => {
        const currentVal = getCodeEditorValue(editor);
        if (currentVal !== value) {
          updateInput?.(currentVal);
        }
      });

    // Set the text value and editor options
    const currentValue = getCodeEditorValue(editor);
    if (currentValue !== value) {
      editor.setValue(value);
    }
    editor.updateOptions({
      readOnly: Boolean(isReadOnly),
      minimap: { enabled: !hideMinimap },
      // Hide the line number gutter
      // See https://github.com/microsoft/vscode/issues/30795
      ...(hideGutter
        ? {
            glyphMargin: !hidePadding,
            folding: false,
            lineNumbers: 'off',
            lineDecorationsWidth: 0,
          }
        : {}),
      ...(extraEditorOptions ?? {}),
    });
    const model = editor.getModel();
    model?.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
    if (model) {
      if (error?.sourceInformation) {
        setErrorMarkers(model, [
          {
            message: error.message,
            startLineNumber: error.sourceInformation.startLine,
            startColumn: error.sourceInformation.startColumn,
            endLineNumber: error.sourceInformation.endLine,
            endColumn: error.sourceInformation.endColumn,
          },
        ]);
      } else {
        clearMarkers();
      }
    }
  }

  // dispose editor
  useEffect(
    () => (): void => {
      if (editor) {
        disposeCodeEditor(editor);

        onDidChangeModelContentEventDisposer.current?.dispose();
      }
    },
    [editor],
  );

  return (
    <div className="code-editor">
      {!hideActionBar && (
        <div className="code-editor__header">
          <button
            tabIndex={-1}
            className={clsx('code-editor__header__action', {
              'code-editor__header__action--active': isWordWrap,
            })}
            onClick={toggleWordWrap}
            title={`[${isWordWrap ? 'on' : 'off'}] Toggle word wrap`}
          >
            <WordWrapIcon />
          </button>
        </div>
      )}
      <div
        className={clsx('code-editor__content', {
          'code-editor__content--padding': !hidePadding,
          'code-editor__content--with__header': !hideActionBar,
        })}
      >
        <div className="code-editor__body" ref={textInputRef} />
      </div>
    </div>
  );
};
