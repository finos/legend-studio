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
  DataCubeQuerySnapshotSortDirection,
  _getCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotSortColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import { deepEqual } from '@finos/legend-shared';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';

export class DataCubeEditorSortColumnState extends DataCubeEditorColumnsSelectorColumnState {
  readonly column: DataCubeQuerySnapshotColumn;
  direction: DataCubeQuerySnapshotSortDirection;

  constructor(
    column: DataCubeQuerySnapshotColumn,
    direction: DataCubeQuerySnapshotSortDirection,
  ) {
    super();

    makeObservable(this, {
      direction: observable,
      setDirection: action,
    });

    this.column = column;
    this.direction = direction;
  }

  get name(): string {
    return this.column.name;
  }

  setDirection(val: DataCubeQuerySnapshotSortDirection): void {
    this.direction = val;
  }
}

export class DataCubeEditorSortsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly columnsSelector!: DataCubeEditorColumnsSelectorState<DataCubeEditorSortColumnState>;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;
    this.columnsSelector = new DataCubeEditorColumnsSelectorState();
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
              DataCubeQuerySnapshotSortDirection.ASCENDING,
            ),
        ),
    );
    this.columnsSelector.setSelectedColumns(
      sortColumns.map(
        (col) =>
          new DataCubeEditorSortColumnState(
            _getCol(columns, col.name),
            col.direction,
          ),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): boolean {
    const newSortColumns: DataCubeQuerySnapshotSortColumn[] =
      this.columnsSelector.selectedColumns.map((sortInfo) => ({
        name: sortInfo.column.name,
        type: sortInfo.column.type,
        direction: sortInfo.direction,
      }));

    if (!deepEqual(newSortColumns, baseSnapshot.data.sortColumns)) {
      newSnapshot.data.sortColumns = newSortColumns;
      return true;
    }
    return false;
  }
}
