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

import { action, makeObservable, observable } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import {
  DataCubeQuerySnapshotSortOperation,
  _getCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorSortColumnState extends DataCubeEditorColumnsSelectorColumnState {
  readonly column: DataCubeQuerySnapshotColumn;
  operation: DataCubeQuerySnapshotSortOperation;

  constructor(
    column: DataCubeQuerySnapshotColumn,
    direction: DataCubeQuerySnapshotSortOperation,
  ) {
    super();

    makeObservable(this, {
      operation: observable,
      setOperation: action,
    });

    this.column = column;
    this.operation = direction;
  }

  get name(): string {
    return this.column.name;
  }

  override resetWhenMadeAvailable(): void {
    this.setOperation(DataCubeQuerySnapshotSortOperation.ASCENDING);
  }

  setOperation(val: DataCubeQuerySnapshotSortOperation): void {
    this.operation = val;
  }
}

export class DataCubeEditorSortsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly columnsSelector!: DataCubeEditorColumnsSelectorState<DataCubeEditorSortColumnState>;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.columnsSelector = new DataCubeEditorColumnsSelectorState();
  }

  getActionableSortColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): DataCubeEditorSortColumnState | undefined {
    let column = this.columnsSelector.getAvailableColumn(colName);
    if (!column) {
      const selectedColumn = this.columnsSelector.getSelectedColumn(colName);
      if (selectedColumn && selectedColumn.operation !== operation) {
        column = selectedColumn;
      }
    }
    return column;
  }

  sortByColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): void {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.setOperation(operation);

    this.columnsSelector.setAvailableColumns(
      [
        ...this.columnsSelector.availableColumns,
        ...this.columnsSelector.selectedColumns,
      ].filter((col) => col.name !== colName),
    );
    this.columnsSelector.setSelectedColumns([column]);
    this.editor.applyChanges();
  }

  addSortByColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): void {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.setOperation(operation);

    this.columnsSelector.setAvailableColumns(
      this.columnsSelector.availableColumns.filter(
        (col) => col.name !== colName,
      ),
    );
    this.columnsSelector.setSelectedColumns([
      ...this.columnsSelector.selectedColumns,
      column,
    ]);
    this.editor.applyChanges();
  }

  clearAllSorts(): void {
    if (this.columnsSelector.selectedColumns.length !== 0) {
      this.columnsSelector.setAvailableColumns([
        ...this.columnsSelector.availableColumns,
        ...this.columnsSelector.selectedColumns,
      ]);
      this.columnsSelector.setSelectedColumns([]);
      this.editor.applyChanges();
    }
  }

  applySnaphot(snapshot: DataCubeQuerySnapshot): void {
    const columns = snapshot.stageCols('sort');
    const sortColumns = snapshot.data.sortColumns;
    this.columnsSelector.setAvailableColumns(
      columns
        .filter(
          (col) => !sortColumns.find((sortCol) => sortCol.name === col.name),
        )
        .map(
          (col) =>
            new DataCubeEditorSortColumnState(
              _getCol(columns, col.name),
              DataCubeQuerySnapshotSortOperation.ASCENDING,
            ),
        ),
    );
    this.columnsSelector.setSelectedColumns(
      sortColumns.map(
        (col) =>
          new DataCubeEditorSortColumnState(
            _getCol(columns, col.name),
            col.operation,
          ),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    newSnapshot.data.sortColumns = this.columnsSelector.selectedColumns.map(
      (sortInfo) => ({
        name: sortInfo.column.name,
        type: sortInfo.column.type,
        operation: sortInfo.operation,
      }),
    );
  }
}
