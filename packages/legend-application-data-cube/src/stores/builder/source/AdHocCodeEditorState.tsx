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

import { clearMarkers, setErrorMarkers } from '@finos/legend-code-editor';
import {
  DataCubeCodeEditorState,
  type DataCubeEngine,
} from '@finos/legend-data-cube';
import { EngineError, type V1_Lambda } from '@finos/legend-graph';
import {
  uuid,
  ActionState,
  type PlainObject,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, makeObservable, observable, runInAction } from 'mobx';

export class AdHocCodeEditorState extends DataCubeCodeEditorState {
  protected override readonly uuid = uuid();
  codeSuffix: string;

  readonly validationState = ActionState.create();
  compilationError?: Error | undefined;
  override currentlyEditing = false;

  alertHandler: (error: Error) => void;
  override model: PlainObject | undefined;
  compileQueryCheck: () => Promise<boolean | undefined>;
  queryLambda: () => V1_Lambda;

  constructor(
    alertHandler: (error: Error) => void,
    model: PlainObject | undefined,
    compileQueryCheck: () => Promise<boolean | undefined>,
    queryLambda: () => V1_Lambda,
    engine: DataCubeEngine,
  ) {
    super(engine);
    makeObservable(this, {
      code: observable,

      editor: observable.ref,
      setEditor: action,

      codeError: observable.ref,
      compilationError: observable,
      showError: action,
      clearError: action,

      returnType: observable,
      setReturnType: action,
    });

    this.codePrefix = '';
    this.codeSuffix = '';

    this.alertHandler = alertHandler;
    this.model = model;
    this.compileQueryCheck = compileQueryCheck;
    this.queryLambda = queryLambda;
    this.engine = engine;
  }

  compileFunction = async (): Promise<boolean | undefined> => {
    if (this.code.length !== 0) {
      try {
        this.currentlyEditing = false;
        return await this.compileQueryCheck();
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof EngineError) {
          this.validationState.fail();
          // correct the source information since we added prefix to the code
          // and reveal error in the editor
          if (error.sourceInformation) {
            error.sourceInformation.startColumn -=
              error.sourceInformation.startLine === 1
                ? this.codePrefix.length
                : 0;
            error.sourceInformation.endColumn -=
              error.sourceInformation.endLine === 1
                ? this.codePrefix.length
                : 0;
            const fullRange = this.editorModel.getFullModelRange();
            if (
              error.sourceInformation.startLine < 1 ||
              (error.sourceInformation.startLine === 1 &&
                error.sourceInformation.startColumn < 1) ||
              error.sourceInformation.endLine > fullRange.endLineNumber ||
              (error.sourceInformation.endLine === fullRange.endLineNumber &&
                error.sourceInformation.endColumn > fullRange.endColumn)
            ) {
              error.sourceInformation.startColumn = fullRange.startColumn;
              error.sourceInformation.startLine = fullRange.startLineNumber;
              error.sourceInformation.endColumn = fullRange.endColumn;
              error.sourceInformation.endLine = fullRange.endLineNumber;
            }
          }
          this.showError(error);
          return undefined;
        } else if (error instanceof Error) {
          this.setCompilationError(error);
        }
        this.alertHandler(error);
      }
    }
    return undefined;
  };

  override get hasErrors(): boolean {
    return Boolean(this.codeError ?? this.compilationError);
  }

  isValid(): boolean {
    return Boolean(
      !this.hasErrors &&
        this.code.length !== 0 &&
        !this.currentlyEditing &&
        !this.validationState.isInProgress,
    );
  }

  setCompilationError(val: Error | undefined) {
    runInAction(() => {
      this.compilationError = val;
    });
  }

  setModel(val: PlainObject | undefined) {
    this.model = val;
  }

  clearQuery() {
    this.clearError();
    this.editor?.getModel()?.setValue('');
  }

  override clearError() {
    this.codeError = undefined;
    this.compilationError = undefined;
    clearMarkers(this.uuid);
  }

  showError(error: EngineError) {
    this.codeError = error;
    if (error.sourceInformation) {
      setErrorMarkers(
        this.editorModel,
        [
          {
            message: error.message,
            startLineNumber: error.sourceInformation.startLine,
            startColumn: error.sourceInformation.startColumn,
            endLineNumber: error.sourceInformation.endLine,
            endColumn: error.sourceInformation.endColumn,
          },
        ],
        this.uuid,
      );
    }
  }

  async getReturnType() {
    this.validationState.inProgress();

    // properly reset the error state before revalidating
    this.clearError();
    this.setReturnType(undefined);

    await this.compileFunction();

    this.validationState.complete();

    return undefined;
  }
}
