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

import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeColumnKind } from '../core/DataCubeQueryEngine.js';
import {
  _toCol,
  type DataCubeQuerySnapshot,
} from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorVerticalPivotColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState> {
  override cloneColumn(
    column: DataCubeEditorColumnsSelectorColumnState,
  ): DataCubeEditorColumnsSelectorColumnState {
    return new DataCubeEditorColumnsSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns(): DataCubeEditorColumnsSelectorColumnState[] {
    return this.editor.columnProperties.columns
      .filter(
        (column) =>
          column.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !this.editor.groupExtendColumns.find(
            (col) => col.name === column.name,
          ) &&
          // prune columns according to active h-pivot
          !this.editor.horizontalPivots.columnsConsumedByPivot.find(
            (col) => col.name === column.name,
          ),
      )
      .map(
        (col) =>
          new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
      );
  }
}

export class DataCubeEditorVerticalPivotsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorVerticalPivotColumnsSelectorState;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorVerticalPivotColumnsSelectorState(editor);
  }

  adaptPropagatedChanges(): void {
    this.selector.setSelectedColumns(
      this.selector.selectedColumns.filter((column) =>
        this.selector.availableColumns.find((col) => col.name === column.name),
      ),
    );
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      (snapshot.data.groupBy?.columns ?? []).map(
        (col) =>
          new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.groupBy = this.selector.selectedColumns.length
      ? {
          columns: this.selector.selectedColumns.map((col) => _toCol(col)),
        }
      : undefined;
    newSnapshot.data.selectColumns = [
      ...newSnapshot.data.selectColumns,
      ...this.selector.selectedColumns
        .filter(
          (col) =>
            !newSnapshot.data.selectColumns.find(
              (column) => column.name === col.name,
            ),
        )
        .map((col) => _toCol(col)),
    ];
  }
}
