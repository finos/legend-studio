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

import {
  type CommandRegistrar,
  EDITOR_LANGUAGE,
  TAB_SIZE,
} from '@finos/legend-application';
import {
  clearMarkers,
  setErrorMarkers,
  type TextEditorPosition,
} from '@finos/legend-art';
import { action, flowResult, makeObservable, observable } from 'mobx';
import { editor as monacoEditorAPI } from 'monaco-editor';
import {
  FileCoordinate,
  type PureFile,
  trimPathLeadingSlash,
  type FileErrorCoordinate,
} from '../server/models/PureFile.js';
import type { EditorStore } from './EditorStore.js';
import { EditorTabState } from './EditorTabManagerState.js';
import { LEGEND_PURE_IDE_COMMAND_KEY } from './LegendPureIDECommand.js';

class FileTextEditorState {
  readonly model: monacoEditorAPI.ITextModel;

  editor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  viewState?: monacoEditorAPI.ICodeEditorViewState | undefined;

  forcedCursorPosition: TextEditorPosition | undefined;
  wrapText = false;

  constructor(fileEditorState: FileEditorState) {
    makeObservable(this, {
      viewState: observable.ref,
      editor: observable.ref,
      forcedCursorPosition: observable.ref,
      wrapText: observable,
      setViewState: action,
      setEditor: action,
      setForcedCursorPosition: action,
      setWrapText: action,
    });

    this.model = monacoEditorAPI.createModel(
      fileEditorState.uuid,
      EDITOR_LANGUAGE.PURE,
    );
    this.model.updateOptions({ tabSize: TAB_SIZE });
  }

  setViewState(val: monacoEditorAPI.ICodeEditorViewState | undefined): void {
    this.viewState = val;
  }

  setEditor(val: monacoEditorAPI.IStandaloneCodeEditor | undefined): void {
    this.editor = val;
  }

  setForcedCursorPosition(val: TextEditorPosition | undefined): void {
    this.forcedCursorPosition = val;
  }

  setWrapText(val: boolean): void {
    const oldVal = this.wrapText;
    this.wrapText = val;
    if (oldVal !== val && this.editor) {
      this.editor.updateOptions({
        wordWrap: val ? 'on' : 'off',
      });
      this.editor.focus();
    }
  }
}

export class FileEditorState
  extends EditorTabState
  implements CommandRegistrar
{
  file: PureFile;
  readonly filePath: string;
  readonly textEditorState = new FileTextEditorState(this);

  constructor(editorStore: EditorStore, file: PureFile, filePath: string) {
    super(editorStore);

    makeObservable(this, {
      file: observable,
      setFile: action,
    });

    this.file = file;
    this.filePath = filePath;
  }

  get label(): string {
    return trimPathLeadingSlash(this.filePath);
  }

  override get description(): string | undefined {
    return trimPathLeadingSlash(this.filePath);
  }

  override onClose(): void {
    // dispose text model to avoid memory leak
    this.textEditorState.model.dispose();
  }

  setFile(value: PureFile): void {
    this.file = value;
  }

  showError(coordinate: FileErrorCoordinate): void {
    setErrorMarkers(
      this.textEditorState.model,
      [
        {
          message: coordinate.error.message,
          startLineNumber: coordinate.line,
          startColumn: coordinate.column,
          endLineNumber: coordinate.line,
          endColumn: coordinate.column,
        },
      ],
      this.uuid,
    );
  }

  clearError(): void {
    clearMarkers(this.uuid);
  }

  registerCommands(): void {
    this.editorStore.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_DEFINITION,
      trigger: () => Boolean(this.textEditorState.editor?.hasTextFocus()),
      action: () => {
        const currentPosition = this.textEditorState.editor?.getPosition();
        if (currentPosition) {
          const coordinate = new FileCoordinate(
            this.filePath,
            currentPosition.lineNumber,
            currentPosition.column,
          );
          flowResult(this.editorStore.executeNavigation(coordinate)).catch(
            this.editorStore.applicationStore.alertUnhandledError,
          );
        }
      },
    });
    this.editorStore.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.GO_BACK,
      action: () => {
        flowResult(this.editorStore.navigateBack()).catch(
          this.editorStore.applicationStore.alertUnhandledError,
        );
      },
    });
    this.editorStore.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.FIND_USAGES,
      trigger: () => Boolean(this.textEditorState.editor?.hasTextFocus()),
      action: () => {
        const currentPosition = this.textEditorState.editor?.getPosition();
        if (currentPosition) {
          const coordinate = new FileCoordinate(
            this.filePath,
            currentPosition.lineNumber,
            currentPosition.column,
          );
          flowResult(this.editorStore.findUsages(coordinate)).catch(
            this.editorStore.applicationStore.alertUnhandledError,
          );
        }
      },
    });
  }

  deregisterCommands(): void {
    [
      LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_DEFINITION,
      LEGEND_PURE_IDE_COMMAND_KEY.GO_BACK,
      LEGEND_PURE_IDE_COMMAND_KEY.FIND_USAGES,
    ].forEach((key) =>
      this.editorStore.applicationStore.commandCenter.deregisterCommand(key),
    );
  }
}
