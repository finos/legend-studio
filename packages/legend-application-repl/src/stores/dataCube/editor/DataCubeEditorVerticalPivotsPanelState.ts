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
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
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
    return this.editor.columns.selector.selectedColumns
      .filter(
        (column) =>
          this.editor.columnProperties.getColumnConfiguration(column.name)
            ?.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !this.editor.columns.groupExtendColumns.find(
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
          columns: this.selector.selectedColumns.map((column) => ({
            name: column.name,
            type: column.type,
          })),
          aggColumns: this.editor.columnProperties.columns
            .filter(
              (column) =>
                // exclude group-by columns
                this.selector.selectedColumns.find(
                  (col) => col.name !== column.name,
                ) &&
                // exclude group-level extended columns
                !this.editor.columns.groupExtendColumns.find(
                  (col) => col.name === column.name,
                ),
            )
            .map((column) => ({
              name: column.name,
              type: column.type,
              operation: column.aggregateOperation.operator,
              parameters: column.aggregationParameters,
            })),
        }
      : undefined;
  }
}
