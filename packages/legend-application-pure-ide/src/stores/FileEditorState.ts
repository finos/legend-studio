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

import type { CommandRegistrar } from '@finos/legend-application';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, flowResult, makeObservable, observable } from 'mobx';
import type { editor as monacoEditorAPI } from 'monaco-editor';
import {
  FileCoordinate,
  type PureFile,
  trimPathLeadingSlash,
} from '../server/models/PureFile.js';
import type { EditorStore } from './EditorStore.js';
import { EditorTabState } from './EditorTabManagerState.js';
import { LEGEND_PURE_IDE_COMMAND_KEY } from './LegendPureIDECommand.js';

export class FileEditorState
  extends EditorTabState
  implements CommandRegistrar
{
  _textEditor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  file: PureFile;
  filePath: string;
  coordinate?: FileCoordinate | undefined;

  constructor(
    editorStore: EditorStore,
    file: PureFile,
    filePath: string,
    coordinate?: FileCoordinate,
  ) {
    super(editorStore);

    makeObservable(this, {
      _textEditor: observable,
      file: observable,
      coordinate: observable,
      setTextEditor: action,
      setFile: action,
      setCoordinate: action,
    });

    this.file = file;
    this.filePath = filePath;
    this.coordinate = coordinate;
  }

  get label(): string {
    return trimPathLeadingSlash(this.filePath);
  }

  override get description(): string | undefined {
    return trimPathLeadingSlash(this.filePath);
  }

  get textEditor(): monacoEditorAPI.IStandaloneCodeEditor {
    return guaranteeNonNullable(
      this._textEditor,
      `Text editor must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  setTextEditor(val: monacoEditorAPI.IStandaloneCodeEditor): void {
    this._textEditor = val;
  }

  setFile(value: PureFile): void {
    this.file = value;
  }

  setCoordinate(value: FileCoordinate | undefined): void {
    this.coordinate = value;
  }

  clearError(): void {
    this.coordinate?.setErrorMessage(undefined);
  }

  registerCommands(): void {
    this.editorStore.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_DEFINITION,
      trigger: () =>
        this._textEditor !== undefined && this.textEditor.hasTextFocus(),
      action: () => {
        const currentPosition = this.textEditor.getPosition();
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
      trigger: () =>
        this._textEditor !== undefined && this.textEditor.hasTextFocus(),
      action: () => {
        const currentPosition = this.textEditor.getPosition();
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
