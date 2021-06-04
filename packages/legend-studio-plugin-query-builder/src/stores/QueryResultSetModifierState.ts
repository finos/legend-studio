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

import { action, makeAutoObservable } from 'mobx';
import type { QueryBuilderProjectionColumnState } from './QueryBuilderFetchStructureState';
import { addUniqueEntry, deleteEntry } from '@finos/legend-studio-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import type { EditorStore, LambdaFunction } from '@finos/legend-studio';
import {
  CollectionInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';

export enum COLUMN_SORT_TYPE {
  ASC = 'asc',
  DESC = 'desc',
}

export class SortColumnState {
  editorStore: EditorStore;
  columnState: QueryBuilderProjectionColumnState;
  sortType = COLUMN_SORT_TYPE.ASC;

  constructor(
    editorStore: EditorStore,
    columnState: QueryBuilderProjectionColumnState,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      columnState: false,
      setColumnState: action,
      setSortType: action,
    });

    this.editorStore = editorStore;
    this.columnState = columnState;
  }

  setColumnState(val: QueryBuilderProjectionColumnState): void {
    this.columnState = val;
  }
  setSortType(val: COLUMN_SORT_TYPE): void {
    this.sortType = val;
  }

  buildFunctionExpression(): SimpleFunctionExpression {
    const multiplicityOne =
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const func = new SimpleFunctionExpression(
      this.sortType.toString(),
      multiplicityOne,
    );
    const stringGenericTypeRef = GenericTypeExplicitReference.create(
      new GenericType(
        this.editorStore.graphState.graph.getPrimitiveType(
          PRIMITIVE_TYPE.STRING,
        ),
      ),
    );
    const stringValue = new PrimitiveInstanceValue(
      stringGenericTypeRef,
      multiplicityOne,
    );
    stringValue.values = [this.columnState.columnName];
    func.parametersValues[0] = stringValue;
    return func;
  }
}

export class QueryResultSetModifierState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  modal = false;
  limit?: number;
  distinct = false;
  sortColumns: SortColumnState[] = [];

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      setModal: action,
      setLimit: action,
      toggleDistinct: action,
      deleteSortColumn: action,
      addSortColumn: action,
      updateSortColumns: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
  }

  setModal(modal: boolean): void {
    this.modal = modal;
  }
  setLimit(val: number | undefined): void {
    this.limit = val === undefined || val <= 0 ? undefined : val;
  }
  toggleDistinct(): void {
    this.distinct = !this.distinct;
  }
  deleteSortColumn(val: SortColumnState): void {
    deleteEntry(this.sortColumns, val);
  }
  addSortColumn(val: SortColumnState): void {
    addUniqueEntry(this.sortColumns, val);
  }
  updateSortColumns(): void {
    this.sortColumns = this.sortColumns.filter((e) =>
      this.queryBuilderState.fetchStructureState.projectionColumns.includes(
        e.columnState,
      ),
    );
  }

  /**
   * modifies the results by processing results through the modifier functions
   * @param lambda current lambda function we wish to modify
   */
  processModifiersOnLambda(
    lambda: LambdaFunction,
    options?: {
      overridingLimit?: number;
    },
  ): LambdaFunction {
    let currentExpression = lambda.expressionSequence[0];
    const multiplicityOne =
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    if (this.canModifyLambdaInProjectionMode(lambda) && this.distinct) {
      const val = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.DISTINCT,
        multiplicityOne,
      );
      val.parametersValues[0] = currentExpression;
      currentExpression = val;
    }
    if (
      this.canModifyLambdaInProjectionMode(lambda) &&
      this.sortColumns.length
    ) {
      const val = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.SORT_FUNC,
        multiplicityOne,
      );
      const multiplicity = new Multiplicity(
        this.sortColumns.length,
        this.sortColumns.length,
      );
      const collection = new CollectionInstanceValue(multiplicity, undefined);
      collection.values = this.sortColumns.map((e) =>
        e.buildFunctionExpression(),
      );
      val.parametersValues[0] = currentExpression;
      val.parametersValues[1] = collection;
      currentExpression = val;
    }
    if (this.limit || options?.overridingLimit) {
      const integerGenericTypeRef = GenericTypeExplicitReference.create(
        new GenericType(
          this.editorStore.graphState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.INTEGER,
          ),
        ),
      );
      const limitColumnValue = new PrimitiveInstanceValue(
        integerGenericTypeRef,
        multiplicityOne,
      );
      limitColumnValue.values = [
        Math.min(
          this.limit ?? Number.MAX_SAFE_INTEGER,
          options?.overridingLimit ?? Number.MAX_SAFE_INTEGER,
        ),
      ];
      const limitColFuncs = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.TAKE,
        multiplicityOne,
      );
      limitColFuncs.parametersValues[0] = currentExpression;
      limitColFuncs.parametersValues[1] = limitColumnValue;
      currentExpression = limitColFuncs;
    }
    lambda.expressionSequence[0] = currentExpression;
    return lambda;
  }

  /**
   * This is subjected to change as we get more modularized in terms of projection mode
   */
  canModifyLambdaInProjectionMode(lambda: LambdaFunction): boolean {
    if (lambda.expressionSequence.length === 1) {
      const func = lambda.expressionSequence[0];
      if (
        func instanceof SimpleFunctionExpression &&
        func.functionName === SUPPORTED_FUNCTIONS.PROJECT
      ) {
        return true;
      }
    }
    return false;
  }
}
