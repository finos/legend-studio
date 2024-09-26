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

import { editor as monacoEditorAPI, MarkerSeverity } from 'monaco-editor';
import {
  CODE_EDITOR_THEME,
  DEFAULT_DARK_THEME,
  GITHUB_DARK_DIMMED_THEME,
  GITHUB_DARK_THEME,
  GITHUB_LIGHT_THEME,
  MATERIAL_DARKER_THEME,
  MATERIAL_DEFAULT_THEME,
  ONE_DARK_PRO_DARKER_THEME,
  ONE_DARK_PRO_THEME,
  SOLARIZED_DARK_THEME,
} from './CodeEditorTheme.js';

export type CodeEditorPosition = {
  lineNumber: number;
  column: number;
};

/**
 * Get the text value with LF line ending.
 * This is needed since if there are CR `\r` characters in the text input
 * (e.g. users of Windows doing copy/paste)
 * the default mode of `monaco-editor` is `TextDefined` which means if the text
 * contains CR character(s), it will automatically be treated as CRLF. As such, we want
 * an utility method to extract the text value with line ending option LF
 * to force omission of CR characters
 * See https://github.com/finos/legend-studio/issues/608
 */
export const getCodeEditorValue = (
  editor: monacoEditorAPI.IStandaloneCodeEditor,
): string =>
  editor.getModel()?.getValue(monacoEditorAPI.EndOfLinePreference.LF) ?? '';

export const getBaseCodeEditorOptions =
  (): monacoEditorAPI.IStandaloneEditorConstructionOptions =>
    ({
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
      fontFamily: 'Roboto Mono',
      // Enable font ligature: glyphs which combine the shapes of certain sequences of characters into a new form that makes for
      //  a more harmonious reading experience.
      fontLigatures: true,
      // Make sure hover or widget shown near boundary are not truncated by setting their position to `fixed`
      fixedOverflowWidgets: true,
      detectIndentation: false, // i.e. so we can force tab-size
      tabSize: 2,
      // The typing is currently not correct for `bracketPairColorization`, until this is fixed, we will remove the cast
      // See https://github.com/microsoft/monaco-editor/issues/3013
      'bracketPairColorization.enabled': false,
      automaticLayout: true,
    }) as monacoEditorAPI.IStandaloneEditorConstructionOptions;

export const moveCursorToPosition = (
  editor: monacoEditorAPI.ICodeEditor,
  position: CodeEditorPosition,
): void => {
  if (!editor.hasTextFocus()) {
    editor.focus();
  } // focus the editor first so that it can shows the cursor
  editor.revealPositionInCenter(position, 0);
  editor.setPosition(position);
};

const INTERNAL__DUMMY_PROBLEM_MARKER_OWNER = 'dummy_problem_marker_owner';

export const setErrorMarkers = (
  editorModel: monacoEditorAPI.ITextModel,
  errors: {
    message: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }[],
  ownerId?: string,
): void => {
  monacoEditorAPI.setModelMarkers(
    editorModel,
    ownerId ?? INTERNAL__DUMMY_PROBLEM_MARKER_OWNER,
    errors.map((error) => ({
      startLineNumber: error.startLineNumber,
      startColumn: error.startColumn,
      endLineNumber: error.endLineNumber,
      endColumn: error.endColumn + 1, // add a 1 to endColumn as monaco editor range is not inclusive
      // NOTE: when the message is empty, no error tooltip is shown, we want to avoid this
      message: error.message === '' ? '(no error message)' : error.message,
      severity: MarkerSeverity.Error,
    })),
  );
};

export const setWarningMarkers = (
  editorModel: monacoEditorAPI.ITextModel,
  warnings: {
    message: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }[],
  ownerId?: string,
): void => {
  monacoEditorAPI.setModelMarkers(
    editorModel,
    ownerId ?? INTERNAL__DUMMY_PROBLEM_MARKER_OWNER,
    warnings.map((warning) => ({
      startLineNumber: warning.startLineNumber,
      startColumn: warning.startColumn,
      endColumn: warning.endColumn,
      endLineNumber: warning.endLineNumber,
      message:
        warning.message === '' ? '(no warning message)' : warning.message,
      severity: MarkerSeverity.Warning,
    })),
  );
};

export const clearMarkers = (ownerId?: string): void => {
  monacoEditorAPI.removeAllMarkers(
    ownerId ?? INTERNAL__DUMMY_PROBLEM_MARKER_OWNER,
  );
};

/**
 * This method eliminates CR '\r' character(s) in the provided text value.
 */
export const normalizeLineEnding = (val: string): string =>
  val.replace(/\r/g, '');

// We need to dynamically adjust the width of the line number gutter, otherwise as the document gets
// larger, the left margin will start to shrink
// See https://github.com/microsoft/monaco-editor/issues/2206
export const resetLineNumberGutterWidth = (
  editor: monacoEditorAPI.ICodeEditor,
): void => {
  const currentValue = editor.getValue();
  editor.updateOptions({
    lineNumbersMinChars: Math.max(
      Math.floor(Math.log10(currentValue.split(/\r\n|\r|\n/g).length)) + 3,
      5,
    ),
  });
};

export const configureCodeEditor = async (
  fontFamily: string,
  onError: (error: Error) => void,
): Promise<void> => {
  // themes
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.DEFAULT_DARK,
    DEFAULT_DARK_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.SOLARIZED_DARK,
    SOLARIZED_DARK_THEME,
  );
  monacoEditorAPI.defineTheme(CODE_EDITOR_THEME.GITHUB_DARK, GITHUB_DARK_THEME);
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.GITHUB_DARK_DIMMED,
    GITHUB_DARK_DIMMED_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.GITHUB_LIGHT,
    GITHUB_LIGHT_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.MATERIAL_DEFAULT,
    MATERIAL_DEFAULT_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.MATERIAL_DARKER,
    MATERIAL_DARKER_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.ONE_DARK_PRO,
    ONE_DARK_PRO_THEME,
  );
  monacoEditorAPI.defineTheme(
    CODE_EDITOR_THEME.ONE_DARK_PRO_DARKER,
    ONE_DARK_PRO_DARKER_THEME,
  );

  /**
   * Since we use a custom fonts for text-editor, we want to make sure the font is loaded before any text-editor is opened
   * this is to ensure
   */
  const fontLoadFailureErrorMessage = `Monospaced font '${fontFamily}' has not been loaded properly, code editor might not display properly`;
  await Promise.all(
    [400, 700].map((weight) =>
      document.fonts.load(`${weight} 1em ${fontFamily}`),
    ),
  )
    .then(() => {
      if (document.fonts.check(`1em ${fontFamily}`)) {
        monacoEditorAPI.remeasureFonts();
      } else {
        onError(new Error(fontLoadFailureErrorMessage));
      }
    })
    .catch(() => onError(new Error(fontLoadFailureErrorMessage)));
};

export enum CODE_EDITOR_LANGUAGE {
  TEXT = 'plaintext',
  PURE = 'pure',
  JSON = 'json',
  JAVA = 'java',
  MARKDOWN = 'markdown',
  SQL = 'sql',
  XML = 'xml',
  YAML = 'yaml',
  GRAPHQL = 'graphql',
}
