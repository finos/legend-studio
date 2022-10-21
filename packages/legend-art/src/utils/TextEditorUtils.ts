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

export const DUMMY_MARKER_OWNER = 'dummy_marker_owner';

/**
 * Normally `monaco-editor` worker disposes after 5 minutes staying idle, but we fasten
 * this pace just in case the usage of the editor causes memory-leak somehow
 */
export const disposeEditor = (
  editor: monacoEditorAPI.IStandaloneCodeEditor,
): void => {
  editor.dispose();
  // NOTE: just to be sure, we dispose the model after disposing the editor
  editor.getModel()?.dispose();
};

/**
 * This method eliminates CR '\r' character(s) in the provided text value.
 */
export const normalizeLineEnding = (val: string): string =>
  val.replace(/\r/g, '');

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
export const getEditorValue = (
  editor: monacoEditorAPI.IStandaloneCodeEditor,
): string =>
  editor.getModel()?.getValue(monacoEditorAPI.EndOfLinePreference.LF) ?? '';

export const disposeDiffEditor = (
  editor: monacoEditorAPI.IStandaloneDiffEditor,
): void => {
  editor.dispose();
  editor.getOriginalEditor().getModel()?.dispose();
  editor.getModifiedEditor().getModel()?.dispose();
};

export const baseTextEditorSettings: monacoEditorAPI.IStandaloneEditorConstructionOptions =
  {
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
    fontLigatures: true,
    // Make sure hover or widget shown near boundary are not truncated by setting their position to `fixed`
    fixedOverflowWidgets: true,
  };

export const moveToPosition = (
  editor: monacoEditorAPI.ICodeEditor,
  line: number,
  column: number,
): void => {
  if (!editor.hasTextFocus()) {
    editor.focus();
  } // focus the editor first so that it can shows the cursor
  editor.revealPositionInCenter({ lineNumber: line, column: column }, 0);
  editor.setPosition({ lineNumber: line, column: column });
};

export const revealError = (
  editor: monacoEditorAPI.ICodeEditor,
  startLine: number,
  startColumn: number,
): void => {
  moveToPosition(editor, startLine, startColumn);
};

export const setErrorMarker = (
  editorModel: monacoEditorAPI.ITextModel,
  message: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): void => {
  monacoEditorAPI.setModelMarkers(editorModel, DUMMY_MARKER_OWNER, [
    {
      startLineNumber: startLine,
      startColumn,
      endColumn: endColumn + 1, // add a 1 to endColumn as monaco editor range is not inclusive
      endLineNumber: endLine,
      // NOTE: when the message is empty, no error tooltip is shown, we want to avoid this
      message: message === '' ? '(no error message)' : message,
      severity: MarkerSeverity.Error,
    },
  ]);
};

export type TextEditorRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export const setAllWarningMarkers = (
  editorModel: monacoEditorAPI.ITextModel,
  allWarnings: { textEditorRange: TextEditorRange; message: string }[],
): void => {
  const markers = allWarnings.map((warning) => {
    const marker = {
      startLineNumber: warning.textEditorRange.startLineNumber,
      startColumn: warning.textEditorRange.startColumn,
      endColumn: warning.textEditorRange.endColumn,
      endLineNumber: warning.textEditorRange.endLineNumber,
      message: warning.message,
      severity: MarkerSeverity.Warning,
    };
    return marker;
  });
  monacoEditorAPI.setModelMarkers(editorModel, DUMMY_MARKER_OWNER, markers);
};

export const clearProblemMarkers = (): void => {
  monacoEditorAPI.removeAllMarkers(DUMMY_MARKER_OWNER);
};

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
