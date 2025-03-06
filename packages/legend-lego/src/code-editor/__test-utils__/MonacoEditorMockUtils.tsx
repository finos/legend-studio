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

import { createMock } from '@finos/legend-shared/test';

/**
 * NOTE: we have tried different ways to mock `monaco-editor`. But those ways often involve
 * trying to load `monaco-editor` from `node_modules` and that takes a long time, so we'd better just mock
 * it completely like in this file.
 * See https://gitlab.com/gitlab-org/gitlab/-/issues/119194
 * See https://stackoverflow.com/questions/57731857/cannot-test-jest-with-monaco-editor-unexpected-token
 */
export enum MockedMonacoEditorKeyCode {
  F1 = 59,
  F8 = 66,
  F9 = 67,
  F10 = 68,
}

export enum MockedMonacoEditorMarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

export enum MockedMonacoEditorEndOfLinePreference {
  LF = 1,
}

export const MockedMonacoEditorModel = {
  dispose: createMock(),
  updateOptions: createMock(),
  getValue: createMock(),
  getLineCount: createMock(),
  getLineMaxColumn: createMock(),
  pushStackElement: createMock(),
  pushEditOperations: createMock(),
  findMatches: createMock(),
};

export const MockedMonacoEditorInstance = {
  focus: createMock(),
  dispose: createMock(),
  addCommand: createMock(),
  getValue: createMock(),
  getPosition: createMock(),
  getRawOptions: createMock(),
  getModel: (): typeof MockedMonacoEditorModel => MockedMonacoEditorModel,
  hasTextFocus: createMock(),
  updateOptions: createMock(),
  setValue: createMock(),
  revealPosition: createMock(),
  setPosition: createMock(),
  onKeyDown: createMock(),
  createDecorationsCollection: createMock(),
  onDidChangeModelContent: createMock(),
  onDidChangeCursorPosition: createMock(),
  onDidFocusEditorText: createMock(),
  onDidBlurEditorText: createMock(),
  onDidFocusEditorWidget: createMock(),
};

export const MockedMonacoEditorAPI = {
  create: (): typeof MockedMonacoEditorInstance => MockedMonacoEditorInstance,
  focus: createMock(),
  createModel: createMock(),
  createDiffEditor: () => ({
    getOriginalEditor: (): typeof MockedMonacoEditorInstance =>
      MockedMonacoEditorInstance,
    getModifiedEditor: (): typeof MockedMonacoEditorInstance =>
      MockedMonacoEditorInstance,
  }),
  setModelMarkers: createMock(),
  setModelLanguage: createMock(),
  defineTheme: createMock(),
  EndOfLinePreference: MockedMonacoEditorEndOfLinePreference,
  removeAllMarkers: createMock(),
  remeasureFonts: createMock(),
};

export enum MockedMonacoLanguageCompletionItemKind {
  Keyword = 17,
  Snippet = 27,
}

export enum MockedMonacoLanguageCompletionItemInsertTextRule {
  InsertAsSnippet = 4,
}

export const MockedMonacoEditorLanguagesAPI = {
  register: createMock(),
  setLanguageConfiguration: createMock(),
  setMonarchTokensProvider: createMock(),
  registerCodeLensProvider: createMock(),
  registerHoverProvider: createMock(),
  registerCompletionItemProvider: createMock(),
  CompletionItemKind: MockedMonacoLanguageCompletionItemKind,
  CompletionItemInsertTextRule: MockedMonacoLanguageCompletionItemKind,
};
