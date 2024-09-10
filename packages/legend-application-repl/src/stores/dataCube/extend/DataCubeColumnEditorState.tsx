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

import { action, computed, makeObservable, observable } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import { DisplayState } from '../../LayoutManagerState.js';
import { DataCubeColumnCreator } from '../../../components/dataCube/extend/DataCubeColumnEditor.js';
import { editor as monacoEditorAPI, Uri } from 'monaco-editor';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  HttpStatus,
  NetworkClientError,
  uuid,
} from '@finos/legend-shared';
import { buildExecutableQuery } from '../core/DataCubeQueryBuilder.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
  DataCubeExtendedColumnType,
  DEFAULT_LAMBDA_VARIABLE_NAME,
  getDataType,
} from '../core/DataCubeQueryEngine.js';
import {
  clearMarkers,
  CODE_EDITOR_LANGUAGE,
  setErrorMarkers,
} from '@finos/legend-lego/code-editor';
import type { DataCubeQueryBuilderError } from '../../../server/REPLEngine.js';
import type { DataCubeExtendManagerState } from './DataCubeExtendManagerState.js';
import {
  PRIMITIVE_TYPE,
  V1_Lambda,
  V1_serializeValueSpecification,
  type V1_ValueSpecification,
} from '@finos/legend-graph';

export class DataCubeNewColumnState {
  readonly uuid = uuid();
  readonly dataCube: DataCubeState;
  readonly manager: DataCubeExtendManagerState;

  // NOTE: use UUID in the column name to prevent collision
  // when parsing/compiling the expression
  private readonly _name = `col_${this.uuid.replaceAll('-', '_')}`;
  readonly display: DisplayState;
  readonly validationState = ActionState.create();
  readonly finalizationState = ActionState.create();

  name: string;
  expectedType: string;
  isGroupLevel: boolean;
  columnKind?: DataCubeColumnKind | undefined;

  code: string;
  codePrefix: string;
  codeSuffix: string;

  editor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  readonly editorModel: monacoEditorAPI.ITextModel;
  readonly editorModelUri: Uri;
  codeError?: DataCubeQueryBuilderError | undefined;
  returnType?: string | undefined;

  constructor(
    manager: DataCubeExtendManagerState,
    columnName?: string | undefined,
  ) {
    makeObservable(this, {
      name: observable,
      setName: action,
      isNameValid: computed,

      expectedType: observable,
      setExpectedType: action,
      isTypeValid: computed,

      isGroupLevel: observable,
      columnKind: observable,
      setColumnKind: action,

      editor: observable.ref,
      setEditor: action,

      codeError: observable.ref,
      showError: action,
      clearError: action,

      returnType: observable,
      setReturnType: action,
    });

    this.manager = manager;
    this.dataCube = manager.dataCube;
    this.display = new DisplayState(
      this.dataCube.repl.layout,
      'Add New Column',
      () => <DataCubeColumnCreator state={this} />,
    );
    this.display.configuration.window = {
      x: 50,
      y: 50,
      width: 500,
      height: 300,
      minWidth: 300,
      minHeight: 200,
      center: false,
    };

    this.name = `col_${manager.allColumnNames.length + 1}`;
    this.expectedType = DataCubeColumnDataType.NUMBER;
    this.isGroupLevel = false;
    this.columnKind = DataCubeColumnKind.MEASURE;

    this.code = `${DEFAULT_LAMBDA_VARIABLE_NAME}|${
      columnName ? `$${DEFAULT_LAMBDA_VARIABLE_NAME}.${columnName}` : ''
    }`;
    this.codePrefix = `->extend(~${this._name}:`;
    this.codeSuffix = `)`;

    this.editorModelUri = Uri.file(`/${this.uuid}.pure`);
    this.editorModel = monacoEditorAPI.createModel(
      this.code,
      CODE_EDITOR_LANGUAGE.PURE,
      this.editorModelUri,
    );
  }

  setName(value: string) {
    this.name = value;
  }

  get isNameValid(): boolean {
    return !this.manager.allColumnNames.includes(this.name);
  }

  setExpectedType(value: string) {
    this.expectedType = value;
  }

  get isTypeValid() {
    return (
      this.returnType !== undefined &&
      this.expectedType === getDataType(this.returnType)
    );
  }

  setColumnKind(
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
  ) {
    this.isGroupLevel = isGroupLevel;
    this.columnKind = columnKind;
  }

  setCode(value: string) {
    this.code = value;
  }

  setEditor(editor: monacoEditorAPI.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  setReturnType(value: string | undefined) {
    this.returnType = value;
  }

  showError(error: DataCubeQueryBuilderError) {
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

  clearError() {
    this.codeError = undefined;
    clearMarkers(this.uuid);
  }

  buildExtendBaseQuery() {
    const currentSnapshot = guaranteeNonNullable(
      this.manager.getLatestSnapshot(),
    );
    const snapshot = currentSnapshot.clone();
    if (!this.isGroupLevel) {
      snapshot.data.leafExtendedColumns = [];
      snapshot.data.selectColumns = [];
      snapshot.data.filter = undefined;
      snapshot.data.groupBy = undefined;
      snapshot.data.pivot = undefined;
    }
    snapshot.data.groupExtendedColumns = [];
    snapshot.data.sortColumns = [];
    snapshot.data.limit = undefined;
    return buildExecutableQuery(
      snapshot,
      this.manager.dataCube.engine.filterOperations,
    );
  }

  async getReturnType() {
    const baseQuery = this.buildExtendBaseQuery();
    this.validationState.inProgress();

    try {
      const returnRelationType =
        await this.dataCube.engine.getQueryCodeRelationReturnType(
          this.codePrefix + this.code + this.codeSuffix,
          baseQuery,
        );
      let returnType = returnRelationType.columns.find(
        (col) => col.name === this._name,
      )?.type;
      returnType =
        returnType &&
        (Object.values(PRIMITIVE_TYPE) as string[]).includes(returnType)
          ? returnType
          : undefined;
      this.setReturnType(returnType);
      return returnType;
    } catch (err) {
      assertErrorThrown(err);
      if (
        err instanceof NetworkClientError &&
        err.response.status === HttpStatus.BAD_REQUEST
      ) {
        this.validationState.fail();
        // correct the source information since we added prefix to the code
        // and reveal error in the editor
        const error = err.payload as DataCubeQueryBuilderError;
        if (error.sourceInformation) {
          error.sourceInformation.startColumn -=
            error.sourceInformation.startLine === 1
              ? this.codePrefix.length
              : 0;
          error.sourceInformation.endColumn -=
            error.sourceInformation.endLine === 1 ? this.codePrefix.length : 0;
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
        this.showError(err.payload as DataCubeQueryBuilderError);
        return undefined;
      }
      this.dataCube.repl.alertError(err, {
        message: `Expression Validation Failure: ${err.message}`,
        text: err.stack,
      });
    } finally {
      this.validationState.complete();
    }

    return undefined;
  }

  async applyChanges() {
    if (
      !this.validationState.hasCompleted ||
      !this.isNameValid ||
      !this.isTypeValid
    ) {
      return;
    }

    this.finalizationState.inProgress();

    let query: V1_ValueSpecification;
    let returnType: string | undefined;
    try {
      [query, returnType] = await Promise.all([
        this.dataCube.engine.parseQuery(this.code, false),
        this.getReturnType(), // recompile to get the return type
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.dataCube.repl.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
        text: error.stack,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    if (!(query instanceof V1_Lambda)) {
      this.dataCube.repl.alertError(new Error(), {
        message: `Expression Validation Failure: Expression must be a lambda.`,
      });
      return;
    }

    if (!returnType) {
      this.dataCube.repl.alertError(new Error(), {
        message: `Expression Validation Failure: Can't compute expression return type.`,
      });
      return;
    }

    this.manager.addNewColumn(
      {
        _type: DataCubeExtendedColumnType.SIMPLE,
        name: this.name,
        type: returnType,
        lambda: V1_serializeValueSpecification(query, []),
      },
      this.isGroupLevel,
      this.columnKind,
    );

    this.close();
  }

  close() {
    // dispose the editor and its model to avoid memory leak
    this.editorModel.dispose();
    this.editor?.dispose();

    this.display.close();
  }
}
