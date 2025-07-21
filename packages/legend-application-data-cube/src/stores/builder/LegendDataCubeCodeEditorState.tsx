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

import { setErrorMarkers } from '@finos/legend-code-editor';
import {
  _lambda,
  DataCubeCodeEditorState,
  type DataCubeEngine,
  type DataCubeAlertService,
  type DataCubeSource,
} from '@finos/legend-data-cube';
import { EngineError, type V1_Lambda } from '@finos/legend-graph';
import { ActionState, assertErrorThrown, uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export class LegendDataCubeCodeEditorState extends DataCubeCodeEditorState {
  protected override readonly uuid = uuid();
  readonly validationState = ActionState.create();
  readonly alertService: DataCubeAlertService;

  queryLambda: () => V1_Lambda;

  constructor(
    engine: DataCubeEngine,
    alertService: DataCubeAlertService,
    model: DataCubeSource | undefined,
  ) {
    super(engine);
    makeObservable(this, {
      editor: observable.ref,
      setEditor: action,

      codeError: observable.ref,
      showError: action,
      clearError: action,

      returnType: observable,
      setReturnType: action,
    });

    this.engine = engine;
    this.alertService = alertService;
    this.model = model;
    this.queryLambda = this.buildDataCubeQuery;
  }

  alertHandler = (error: Error): void => {
    this.alertService.alertUnhandledError(error);
  };

  initialize(query: string) {
    this.code = query;
    this.editorModel.setValue(this.code);
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

  buildDataCubeQuery = () => {
    let parsedLambda: V1_Lambda = _lambda([], []);
    this.engine
      .parseValueSpecification(this.code)
      .then((lambda) => {
        parsedLambda = _lambda([], [lambda]);
      })
      .catch((error) => {
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
        }
      });
    return parsedLambda;
  };

  async getReturnType() {
    this.validationState.inProgress();

    // properly reset the error state before revalidating
    this.clearError();
    this.setReturnType(undefined);

    try {
      this.buildDataCubeQuery();
      return undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.alertHandler(error);
    } finally {
      this.validationState.complete();
    }

    return undefined;
  }

  close() {
    // dispose the editor and its model to avoid memory leak
    this.editorModel.dispose();
    this.editor?.dispose();
  }
}
