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
import type { EngineError, V1_Lambda } from '@finos/legend-graph';
import { ActionState, uuid, type PlainObject } from '@finos/legend-shared';
import { editor as monacoEditorAPI, Uri } from 'monaco-editor';
import type { DataCubeEngine } from '../../../stores/core/DataCubeEngine.js';
import type { DataCubeSource } from '../../../stores/core/model/DataCubeSource.js';
import { clearMarkers, CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';

export abstract class DataCubeCodeEditorState {
  protected readonly uuid = uuid();

  editorModel: monacoEditorAPI.ITextModel;
  editor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  editorModelUri: Uri;

  code = '';
  codePrefix: string;
  returnType?: string | undefined;

  finalizationState = ActionState.create();
  codeError?: EngineError | undefined;
  model: DataCubeSource | PlainObject | undefined;
  engine: DataCubeEngine;

  currentlyEditing?: boolean;

  constructor(engine: DataCubeEngine) {
    this.engine = engine;
    this.codePrefix = '';
    this.editorModelUri = Uri.file(`/${this.uuid}.pure`);
    this.editorModel = monacoEditorAPI.createModel(
      '',
      CODE_EDITOR_LANGUAGE.PURE,
      this.editorModelUri,
    );
  }

  get hasErrors(): boolean {
    return Boolean(this.codeError);
  }

  clearError() {
    this.codeError = undefined;
    clearMarkers(this.uuid);
  }

  setReturnType(value: string | undefined) {
    this.returnType = value;
  }

  setEditor(editor: monacoEditorAPI.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  abstract alertHandler: (error: Error) => void;
  abstract getReturnType(): Promise<string | boolean | undefined>;
  abstract queryLambda: () => V1_Lambda;
}
