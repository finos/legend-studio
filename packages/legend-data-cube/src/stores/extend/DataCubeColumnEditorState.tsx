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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import type { DisplayState } from '../engine/DataCubeLayoutManagerState.js';
import { DataCubeColumnCreator } from '../../components/extend/DataCubeColumnEditor.js';
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
  DEFAULT_LAMBDA_VARIABLE_NAME,
  getDataType,
} from '../core/DataCubeQueryEngine.js';
import {
  clearMarkers,
  CODE_EDITOR_LANGUAGE,
  setErrorMarkers,
} from '@finos/legend-code-editor';
import type { DataCubeQueryBuilderError } from '../engine/DataCubeEngine.js';
import type { DataCubeExtendManagerState } from './DataCubeExtendManagerState.js';
import {
  PRIMITIVE_TYPE,
  V1_Lambda,
  V1_serializeValueSpecification,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../core/DataCubeConfiguration.js';

export abstract class DataCubeColumnBaseEditorState {
  readonly uuid = uuid();
  readonly view: DataCubeViewState;
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

  code = '';
  codePrefix: string;
  codeSuffix: string;

  editor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  readonly editorModel: monacoEditorAPI.ITextModel;
  readonly editorModelUri: Uri;
  codeError?: DataCubeQueryBuilderError | undefined;
  returnType?: string | undefined;

  constructor(
    manager: DataCubeExtendManagerState,
    name: string,
    expectedType: string,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
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
    this.view = manager.view;
    this.display = this.newDisplay(this);

    this.name = name;
    this.expectedType = expectedType;
    this.isGroupLevel = isGroupLevel;
    this.columnKind = columnKind;

    this.codePrefix = `->extend(~${this._name}:`;
    this.codeSuffix = `)`;

    this.editorModelUri = Uri.file(`/${this.uuid}.pure`);
    this.editorModel = monacoEditorAPI.createModel(
      '',
      CODE_EDITOR_LANGUAGE.PURE,
      this.editorModelUri,
    );
  }

  abstract getInitialCode(): Promise<string>;

  async initialize() {
    this.code = await this.getInitialCode();
    this.editorModel.setValue(this.code);
  }

  protected abstract newDisplay(
    state: DataCubeColumnBaseEditorState,
  ): DisplayState;

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
      this.manager.view.engine.filterOperations,
      this.manager.view.engine.aggregateOperations,
    );
  }

  async getReturnType() {
    const baseQuery = this.buildExtendBaseQuery();
    this.validationState.inProgress();

    // properly reset the error state before revalidating
    this.clearError();
    this.setReturnType(undefined);

    try {
      const returnRelationType =
        await this.view.engine.getQueryCodeRelationReturnType(
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
      this.view.application.alertError(err, {
        message: `Expression Validation Failure: ${err.message}`,
      });
    } finally {
      this.validationState.complete();
    }

    return undefined;
  }

  abstract applyChanges(): Promise<void>;

  close() {
    // dispose the editor and its model to avoid memory leak
    this.editorModel.dispose();
    this.editor?.dispose();

    this.display.close();
  }
}

export class DataCubeNewColumnState extends DataCubeColumnBaseEditorState {
  private initialCode: string;

  constructor(
    manager: DataCubeExtendManagerState,
    referenceColumn?: DataCubeColumnConfiguration | undefined,
  ) {
    super(
      manager,
      `col_${manager.allColumnNames.length + 1}`,
      referenceColumn
        ? getDataType(referenceColumn.type)
        : DataCubeColumnDataType.NUMBER,
      false,
      referenceColumn ? referenceColumn.kind : DataCubeColumnKind.MEASURE,
    );

    this.initialCode = referenceColumn
      ? `${DEFAULT_LAMBDA_VARIABLE_NAME}|$${DEFAULT_LAMBDA_VARIABLE_NAME}.${referenceColumn.name}`
      : `${DEFAULT_LAMBDA_VARIABLE_NAME}|`;
  }

  override async getInitialCode(): Promise<string> {
    return this.initialCode;
  }

  override newDisplay(state: DataCubeColumnBaseEditorState): DisplayState {
    return this.view.application.layout.newDisplay(
      'Add New Column',
      () => <DataCubeColumnCreator state={this} />,
      {
        x: 50,
        y: 50,
        width: 500,
        height: 300,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
  }

  override async applyChanges() {
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
        this.view.engine.parseQuery(this.code, false),
        this.getReturnType(), // recompile to get the return type
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.view.application.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    if (!(query instanceof V1_Lambda)) {
      this.view.application.alertError(new Error(), {
        message: `Expression Validation Failure: Expression must be a lambda.`,
      });
      return;
    }

    if (!returnType) {
      this.view.application.alertError(new Error(), {
        message: `Expression Validation Failure: Can't compute expression return type.`,
      });
      return;
    }

    this.manager.addNewColumn(
      {
        name: this.name,
        type: returnType,
        mapFn: V1_serializeValueSpecification(query, []),
      },
      this.isGroupLevel,
      this.columnKind,
      this,
    );

    this.close();
  }
}

export class DataCubeExistingColumnEditorState extends DataCubeColumnBaseEditorState {
  constructor(
    manager: DataCubeExtendManagerState,
    columnConfiguration: DataCubeColumnConfiguration,
    isGroupLevel: boolean,
  ) {
    super(
      manager,
      columnConfiguration.name,
      getDataType(columnConfiguration.type),
      isGroupLevel,
      columnConfiguration.kind,
    );
  }

  override async getInitialCode(): Promise<string> {
    return '';
  }

  override newDisplay(state: DataCubeColumnBaseEditorState): DisplayState {
    return this.view.application.layout.newDisplay(
      'Edit Column',
      // () => <DataCubeColumnCreator state={this} />,
      () => null,
      {
        x: 50,
        y: 50,
        width: 500,
        height: 300,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
  }

  override async applyChanges() {
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
        this.view.engine.parseQuery(this.code, false),
        this.getReturnType(), // recompile to get the return type
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.view.application.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    if (!(query instanceof V1_Lambda)) {
      this.view.application.alertError(new Error(), {
        message: `Expression Validation Failure: Expression must be a lambda.`,
      });
      return;
    }

    if (!returnType) {
      this.view.application.alertError(new Error(), {
        message: `Expression Validation Failure: Can't compute expression return type.`,
      });
      return;
    }

    // this.manager.addNewColumn(
    //   {
    //     _type: DataCubeExtendedColumnType.STANDARD,
    //     name: this.name,
    //     type: returnType,
    //     lambda: V1_serializeValueSpecification(query, []),
    //   },
    //   this.isGroupLevel,
    //   this.columnKind,
    //   this,
    // );

    this.close();
  }
}
