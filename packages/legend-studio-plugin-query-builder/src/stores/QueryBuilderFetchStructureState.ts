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
import { uuid, deleteEntry } from '@finos/legend-studio-shared';
import type { QueryBuilderExplorerTreeDragSource } from './QueryBuilderExplorerState';
import {
  QueryBuilderExplorerTreePropertyNodeData,
  getPropertyExpression,
} from './QueryBuilderExplorerState';
import {
  getPropertyChainName,
  QueryBuilderPropertyEditorState,
} from './QueryBuilderPropertyEditorState';
import type { QueryBuilderState } from './QueryBuilderState';
import { QueryBuilderGraphFetchTreeState } from './QueryBuilderGraphFetchTreeState';
import type {
  AbstractPropertyExpression,
  EditorStore,
} from '@finos/legend-studio';
import { TYPICAL_MULTIPLICITY_TYPE } from '@finos/legend-studio';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Constants';

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

export type QueryBuilderProjectionDropTarget =
  QueryBuilderExplorerTreeDragSource;
export type QueryBuilderProjectionColumnRearrangeDropTarget =
  QueryBuilderProjectionColumnDragSource;

export class QueryBuilderProjectionColumnState {
  uuid = uuid();
  editorStore: EditorStore;
  lambdaVariableName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  projectionState: QueryBuilderFetchStructureState;
  columnName: string;
  propertyEditorState: QueryBuilderPropertyEditorState;
  isBeingDragged = false;

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderFetchStructureState,
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

//TODO: if we go beyond 2 modes, we want to use states
export enum FETCH_STRUCTURE_MODE {
  PROJECTION = 'PROJECTION',
  GRAPH_FETCH = 'GRAPH_FETCH',
}
export class QueryBuilderFetchStructureState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  fetchStructureMode = FETCH_STRUCTURE_MODE.PROJECTION;
  projectionColumns: QueryBuilderProjectionColumnState[] = [];
  graphFetchTreeState: QueryBuilderGraphFetchTreeState;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      removeProjectionColumn: action,
      addProjectionColumn: action,
      moveProjectionColumn: action,
      handleFetchStructureModeChange: action,
      setFetchStructureMode: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.graphFetchTreeState = new QueryBuilderGraphFetchTreeState(
      editorStore,
      queryBuilderState,
    );
  }

  get projectionColumnOptions(): ProjectionColumnOption[] {
    return this.projectionColumns.map((projectionCol) => ({
      label: projectionCol.columnName,
      value: projectionCol,
    }));
  }

  removeProjectionColumn(val: QueryBuilderProjectionColumnState): void {
    deleteEntry(this.projectionColumns, val);
    // TODO: do a check here when we support more types of fetch structure
    this.queryBuilderState.resultSetModifierState.updateSortColumns();
  }

  addProjectionColumn(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.projectionColumns.push(
      new QueryBuilderProjectionColumnState(this.editorStore, this, node),
    );
  }

  addPropertyExpressionProjectionColumn(
    propertyExpression: AbstractPropertyExpression,
    propertyExpressionProcessed: boolean,
  ): QueryBuilderProjectionColumnState {
    const newColumnState = new QueryBuilderProjectionColumnState(
      this.editorStore,
      this,
      propertyExpression,
      propertyExpressionProcessed,
    );
    this.projectionColumns.push(newColumnState);
    return newColumnState;
  }

  moveProjectionColumn(dragIndex: number, hoverIndex: number): void {
    const dragColumn = this.projectionColumns[dragIndex];
    this.projectionColumns.splice(dragIndex, 1);
    this.projectionColumns.splice(hoverIndex, 0, dragColumn);
  }

  setFetchStructureMode(val: FETCH_STRUCTURE_MODE): void {
    this.fetchStructureMode = val;
  }

  handleFetchStructureModeChange(
    fetchStructureMode: FETCH_STRUCTURE_MODE,
  ): void {
    if (this.fetchStructureMode !== fetchStructureMode) {
      this.setFetchStructureMode(fetchStructureMode);
      this.queryBuilderState.resetData();
    }
  }

  isGraphFetchMode(): boolean {
    return this.fetchStructureMode === FETCH_STRUCTURE_MODE.GRAPH_FETCH;
  }

  isProjectionMode(): boolean {
    return this.fetchStructureMode === FETCH_STRUCTURE_MODE.PROJECTION;
  }
}
