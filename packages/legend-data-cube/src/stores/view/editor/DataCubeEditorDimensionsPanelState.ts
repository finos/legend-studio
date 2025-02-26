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

import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { DataCubeColumnKind } from '../../core/DataCubeQueryEngine.js';
import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import { _findCol, _sortByColName } from '../../core/model/DataCubeColumn.js';
import { DataCubeEditorColumnsSelectorColumnState } from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { action, computed, makeObservable, observable } from 'mobx';
import { generateEnumerableNameFromToken } from '@finos/legend-shared';

export type DataCubeEditorDimensionsTreeNode = {
  name: string;
  data: DataCubeEditorDimensionState | DataCubeEditorColumnsSelectorColumnState;
  children?: DataCubeEditorDimensionsTreeNode[] | undefined;
};

export class DataCubeEditorDimensionState {
  name: string;
  isRenaming = false;
  columns: DataCubeEditorColumnsSelectorColumnState[] = [];

  constructor(name: string) {
    makeObservable(this, {
      name: observable,
      setName: action,

      isRenaming: observable,
      setIsRenaming: action,

      columns: observable,
      setColumns: action,
    });

    this.name = name;
  }

  setName(name: string) {
    this.name = name;
  }

  setIsRenaming(val: boolean) {
    this.isRenaming = val;
  }

  setColumns(columns: DataCubeEditorColumnsSelectorColumnState[]) {
    this.columns = columns;
  }
}

export class DataCubeEditorDimensionsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly _editor!: DataCubeEditorState;

  availableColumnsSearchText = '';
  dimensions: DataCubeEditorDimensionState[] = [];
  dimensionsTreeData: {
    nodes: DataCubeEditorDimensionsTreeNode[];
  } = { nodes: [] };
  dimensionsTreeSearchText = '';

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      availableColumns: computed,
      availableColumnsForDisplay: computed,

      availableColumnsSearchText: observable,
      setAvailableColumnsSearchText: action,

      selectedColumns: computed,
      deselectColumns: action,

      dimensions: observable,
      setDimensions: action,
      newDimension: action,

      dimensionsTreeData: observable.ref,
      refreshDimensionsTreeData: action,

      dimensionsTreeSearchText: observable,
      setDimensionsTreeSearchText: action,
    });

    this._editor = editor;
  }

  get availableColumns() {
    return this._editor.columnProperties.columns
      .filter(
        (column) =>
          column.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !_findCol(this._editor.groupExtendColumns, column.name) &&
          // exclude pivot columns
          !_findCol(
            this._editor.horizontalPivots.selector.selectedColumns,
            column.name,
          ),
      )
      .map(
        (col) =>
          new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
      );
  }

  get availableColumnsForDisplay() {
    return this.availableColumns
      .filter((column) => !_findCol(this.selectedColumns, column.name))
      .sort(_sortByColName);
  }

  setAvailableColumnsSearchText(val: string) {
    this.availableColumnsSearchText = val;
  }

  get selectedColumns() {
    return this.dimensions.flatMap((dimension) => dimension.columns);
  }

  deselectColumns(columns: DataCubeEditorColumnsSelectorColumnState[]) {
    this.dimensions.forEach((dimension) => {
      dimension.setColumns(
        dimension.columns.filter((column) => !_findCol(columns, column.name)),
      );
    });
  }

  setDimensions(dimensions: DataCubeEditorDimensionState[]) {
    this.dimensions = dimensions;
  }

  newDimension() {
    const newDimension = new DataCubeEditorDimensionState(
      generateEnumerableNameFromToken(
        this.dimensions.map((dimension) => dimension.name),
        'Dimension',
        'whitespace',
      ),
    );
    this.dimensions.push(newDimension);
    return newDimension;
  }

  refreshDimensionsTreeData() {
    this.dimensionsTreeData = {
      nodes: this.dimensions.map((dimension) => ({
        name: dimension.name,
        data: dimension,
        children: dimension.columns.map((column) => ({
          name: column.name,
          data: column,
        })),
      })),
    };
  }

  setDimensionsTreeSearchText(val: string) {
    this.dimensionsTreeSearchText = val;
  }

  adaptPropagatedChanges(): void {
    this.deselectColumns(
      this.selectedColumns.filter(
        (column) => !_findCol(this.availableColumns, column.name),
      ),
    );
    this.refreshDimensionsTreeData();
  }

  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ) {
    // this.selector.setSelectedColumns(
    //   (snapshot.data.groupBy?.columns ?? []).map(
    //     (col) =>
    //       new DataCubeEditorColumnSelectorColumnState(col.name, col.type),
    //   ),
    // );
  }

  buildSnapshot(newSnapshot: DataCubeSnapshot, baseSnapshot: DataCubeSnapshot) {
    // newSnapshot.data.groupBy = this.selector.selectedColumns.length
    //   ? {
    //       columns: this.selector.selectedColumns.map(_toCol),
    //     }
    //   : undefined;
    // newSnapshot.data.selectColumns = uniqBy(
    //   [...newSnapshot.data.selectColumns, ...this.selector.selectedColumns],
    //   (col) => col.name,
    // ).map(_toCol);
  }
}
