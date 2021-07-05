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
import { uuid, deleteEntry, addUniqueEntry } from '@finos/legend-studio-shared';
import {
  QueryBuilderExplorerTreePropertyNodeData,
  getPropertyExpression,
} from './QueryBuilderExplorerState';
import {
  getPropertyChainName,
  QueryBuilderPropertyEditorState,
} from './QueryBuilderPropertyEditorState';
import type { QueryBuilderState } from './QueryBuilderState';
import type {
  AbstractPropertyExpression,
  EditorStore,
} from '@finos/legend-studio';
import { TYPICAL_MULTIPLICITY_TYPE } from '@finos/legend-studio';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Const';
import { QueryBuilderAggregationState } from './QueryBuilderAggregationState';
import { QueryBuilderAggregateOperator_Count } from './aggregateOperators/QueryBuilderAggregateOperator_Count';
import { QueryBuilderAggregateOperator_Distinct } from './aggregateOperators/QueryBuilderAggregateOperator_Distinct';
import { QueryBuilderAggregateOperator_Sum } from './aggregateOperators/QueryBuilderAggregateOperator_Sum';
import { QueryBuilderAggregateOperator_Average } from './aggregateOperators/QueryBuilderAggregateOperator_Average';
import { QueryBuilderAggregateOperator_StdDev_Population } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Population';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Sample';

export type ProjectionColumnOption = {
  label: string;
  value: QueryBuilderProjectionColumnState;
};

export enum QUERY_BUILDER_PROJECTION_DND_TYPE {
  PROJECTION_COLUMN = 'PROJECTION_COLUMN',
}

export interface QueryBuilderProjectionColumnDragSource {
  columnState: QueryBuilderProjectionColumnState;
}

export class QueryBuilderProjectionColumnState {
  uuid = uuid();
  editorStore: EditorStore;
  projectionState: QueryBuilderProjectionState;
  lambdaVariableName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  columnName: string;
  propertyEditorState: QueryBuilderPropertyEditorState;
  isBeingDragged = false;

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderProjectionState,
    data: QueryBuilderExplorerTreePropertyNodeData | AbstractPropertyExpression,
    propertyExpressionProcessed?: boolean,
  ) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      projectionState: false,
      setLambdaVariableName: action,
      setIsBeingDragged: action,
      setColumnName: action,
      changeProperty: action,
    });

    this.editorStore = editorStore;
    this.projectionState = projectionState;
    const propertyExpression =
      data instanceof QueryBuilderExplorerTreePropertyNodeData
        ? getPropertyExpression(
            this.projectionState.queryBuilderState.explorerState
              .nonNullableTreeData,
            data,
            this.editorStore.graphState.graph.getTypicalMultiplicity(
              TYPICAL_MULTIPLICITY_TYPE.ONE,
            ),
          )
        : data;
    this.propertyEditorState = new QueryBuilderPropertyEditorState(
      editorStore,
      propertyExpression,
      propertyExpressionProcessed,
    );
    this.columnName = getPropertyChainName(
      this.propertyEditorState.propertyExpression,
    );
  }

  setLambdaVariableName(val: string): void {
    this.lambdaVariableName = val;
  }

  setIsBeingDragged(val: boolean): void {
    this.isBeingDragged = val;
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }

  changeProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.propertyEditorState = new QueryBuilderPropertyEditorState(
      this.editorStore,
      getPropertyExpression(
        this.projectionState.queryBuilderState.explorerState
          .nonNullableTreeData,
        node,
        this.editorStore.graphState.graph.getTypicalMultiplicity(
          TYPICAL_MULTIPLICITY_TYPE.ONE,
        ),
      ),
    );
    this.columnName = getPropertyChainName(
      this.propertyEditorState.propertyExpression,
    );
  }
}

export class QueryBuilderProjectionState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  columns: QueryBuilderProjectionColumnState[] = [];
  aggregationState: QueryBuilderAggregationState;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      removeColumn: action,
      addColumn: action,
      moveColumn: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.aggregationState = new QueryBuilderAggregationState(
      this.editorStore,
      this,
      [
        new QueryBuilderAggregateOperator_Count(),
        new QueryBuilderAggregateOperator_Distinct(),
        new QueryBuilderAggregateOperator_Sum(),
        new QueryBuilderAggregateOperator_Average(),
        new QueryBuilderAggregateOperator_StdDev_Population(),
        new QueryBuilderAggregateOperator_StdDev_Sample(),
      ],
    );
  }

  get columnOptions(): ProjectionColumnOption[] {
    return this.columns.map((projectionCol) => ({
      label: projectionCol.columnName,
      value: projectionCol,
    }));
  }

  removeColumn(val: QueryBuilderProjectionColumnState): void {
    deleteEntry(this.columns, val);

    // remove aggregation that goes with the projection
    const existingAggregateColumnState = this.aggregationState.columns.find(
      (column) => column.projectionColumnState === val,
    );
    if (existingAggregateColumnState) {
      this.aggregationState.removeColumn(existingAggregateColumnState);
    }

    // TODO: do a check here when we support more types of fetch structure
    this.queryBuilderState.resultSetModifierState.updateSortColumns();
  }

  addColumn(val: QueryBuilderProjectionColumnState): void {
    addUniqueEntry(this.columns, val);
  }

  moveColumn(dragIndex: number, hoverIndex: number): void {
    const dragColumn = this.columns[dragIndex];
    this.columns.splice(dragIndex, 1);
    this.columns.splice(hoverIndex, 0, dragColumn);

    // TODO: take into account aggregation columns
  }
}
