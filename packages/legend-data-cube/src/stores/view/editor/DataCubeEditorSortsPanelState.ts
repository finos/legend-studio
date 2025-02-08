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

import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import { _findCol, _toCol } from '../../core/model/DataCubeColumn.js';
import {
  DataCubeColumnKind,
  DataCubeQuerySortDirection,
} from '../../core/DataCubeQueryEngine.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnSelectorState,
  DataCubeEditorSortColumnState,
} from './DataCubeEditorColumnSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { uniqBy } from '@finos/legend-shared';

export class DataCubeEditorSortColumnSelectorState extends DataCubeEditorColumnSelectorState<DataCubeEditorSortColumnState> {
  override cloneColumn(column: DataCubeEditorSortColumnState) {
    return new DataCubeEditorSortColumnState(
      column.name,
      column.type,
      column.direction,
    );
  }

  override get availableColumns() {
    return uniqBy(
      [
        // if pivot is active, take the pivot result columns and include
        // selected dimension columns which are not part of pivot columns
        ...(this._editor.horizontalPivots.selector.selectedColumns.length
          ? [
              ...this._editor.horizontalPivots.pivotResultColumns,
              ...[
                ...this._editor.columns.selector.selectedColumns,
                ...this._editor.verticalPivots.selector.selectedColumns,
              ].filter(
                (column) =>
                  this._editor.columnProperties.getColumnConfiguration(
                    column.name,
                  ).kind === DataCubeColumnKind.DIMENSION &&
                  !_findCol(
                    this._editor.horizontalPivots.selector.selectedColumns,
                    column.name,
                  ),
              ),
            ]
          : [
              ...this._editor.columns.selector.selectedColumns,
              ...this._editor.verticalPivots.selector.selectedColumns,
            ]),
        ...this._editor.groupExtendColumns,
      ],
      (col) => col.name,
    ).map(
      (col) =>
        new DataCubeEditorSortColumnState(
          col.name,
          col.type,
          DataCubeQuerySortDirection.ASCENDING,
        ),
    );
  }
}

export class DataCubeEditorSortsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly selector!: DataCubeEditorColumnSelectorState<DataCubeEditorSortColumnState>;

  constructor(editor: DataCubeEditorState) {
    this.selector = new DataCubeEditorSortColumnSelectorState(editor);
  }

  adaptPropagatedChanges(): void {
    this.selector.setSelectedColumns(
      this.selector.selectedColumns.filter((column) =>
        _findCol(this.selector.availableColumns, column.name),
      ),
    );
  }

  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      snapshot.data.sortColumns.map((col) => {
        const column = this.selector.getColumn(col.name);
        return new DataCubeEditorSortColumnState(
          column.name,
          column.type,
          col.direction,
        );
      }),
    );
  }

  buildSnapshot(newSnapshot: DataCubeSnapshot, baseSnapshot: DataCubeSnapshot) {
    newSnapshot.data.sortColumns = this.selector.selectedColumns.map((col) => ({
      ..._toCol(col),
      direction: col.direction,
    }));
  }
}
