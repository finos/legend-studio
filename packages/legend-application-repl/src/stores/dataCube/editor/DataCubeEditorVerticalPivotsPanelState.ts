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

import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeColumnKind } from '../core/DataCubeQueryEngine.js';
import {
  _getCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorGroupByColumnState extends DataCubeEditorColumnsSelectorColumnState {
  readonly column: DataCubeQuerySnapshotColumn;

  constructor(column: DataCubeQuerySnapshotColumn) {
    super();

    this.column = column;
  }

  get name(): string {
    return this.column.name;
  }
}

export class DataCubeEditorVerticalPivotsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorColumnsSelectorState<DataCubeEditorGroupByColumnState>;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorColumnsSelectorState(editor, {
      onChange: (selector) => {
        // do nothing
      },
    });
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ): void {
    const columns = snapshot
      .stageCols('aggregation')
      .filter(
        (column) =>
          configuration.columns.find((col) => col.name === column.name)
            ?.kind === DataCubeColumnKind.DIMENSION,
      );
    this.selector.setAllAvailableColumns(
      columns
        .filter(
          (col) =>
            !snapshot.data.groupBy?.columns.find(
              (column) => column.name === col.name,
            ),
        )
        .map(
          (col) =>
            new DataCubeEditorGroupByColumnState(_getCol(columns, col.name)),
        ),
    );
    this.selector.setAllSelectedColumns(
      (snapshot.data.groupBy?.columns ?? []).map(
        (col) =>
          new DataCubeEditorGroupByColumnState(_getCol(columns, col.name)),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    newSnapshot.data.groupBy = {
      columns: this.selector.selectedColumns.map((column) => ({
        name: column.name,
        type: column.column.type,
      })),
      aggColumns: this.editor.columnProperties.columns
        .filter(
          (column) =>
            column.kind === DataCubeColumnKind.MEASURE &&
            column.aggregateFunction !== undefined &&
            this.selector.selectedColumns.find(
              (col) => col.name !== column.name,
            ),
        )
        .map((column) => ({
          name: column.name,
          type: column.type,
          function: guaranteeNonNullable(column.aggregateFunction),
        })),
    };
  }
}
