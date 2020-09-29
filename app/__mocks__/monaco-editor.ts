/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * NOTE: we have tried different ways to mock `monaco-editor`. But those ways often involve
 * trying to load `monaco-editor` from `node_modules` and that takes a long time, so we'd better just mock
 * it completely like in this file.
 * See https://gitlab.com/gitlab-org/gitlab/-/issues/119194
 * See https://stackoverflow.com/questions/57731857/cannot-test-jest-with-monaco-editor-unexpected-token
 */

export const mockedEditorModel = {
  dispose: jest.fn(),
  updateOptions: jest.fn(),
  getLineCount: jest.fn(),
  getLineMaxColumn: jest.fn(),
  pushStackElement: jest.fn(),
  pushEditOperations: jest.fn(),
  findMatches: jest.fn(),
};

export const mockedEditor = {
  dispose: jest.fn(),
  addCommand: jest.fn(),
  getValue: jest.fn(),
  getPosition: jest.fn(),
  getRawOptions: jest.fn(),
  getModel: (): typeof mockedEditorModel => mockedEditorModel,
  hasTextFocus: jest.fn(),
  updateOptions: jest.fn(),
  setValue: jest.fn(),
  revealPosition: jest.fn(),
  setPosition: jest.fn(),
  onKeyDown: jest.fn(),
  deltaDecorations: jest.fn(),
  onDidChangeModelContent: jest.fn(),
  onDidChangeCursorPosition: jest.fn(),
  onDidFocusEditorText: jest.fn(),
  onDidBlurEditorText: jest.fn(),
};

export const editor = {
  create: (): typeof mockedEditor => mockedEditor,
  createModel: jest.fn(),
  createDiffEditor: (): Record<PropertyKey, unknown> => ({
    getOriginalEditor: (): typeof mockedEditor => mockedEditor,
    getModifiedEditor: (): typeof mockedEditor => mockedEditor,
  }),
  setModelMarkers: jest.fn(),
};

export enum KeyCode {
  F1 = 59,
  F8 = 66,
  F9 = 67,
  F10 = 68,
}

export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8
}

export const languages = {
  registerCodeLensProvider: jest.fn(),
};
