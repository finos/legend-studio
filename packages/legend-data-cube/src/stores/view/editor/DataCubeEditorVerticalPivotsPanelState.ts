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

import { uniqBy } from '@finos/legend-shared';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import type { DataCubeConfiguration } from '../../core/models/DataCubeConfiguration.js';
import { DataCubeColumnKind } from '../../core/DataCubeQueryEngine.js';
import { type DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import { _toCol } from '../../core/models/DataCubeColumn.js';
import {
  DataCubeEditorColumnSelectorColumnState,
  DataCubeEditorColumnSelectorState,
} from './DataCubeEditorColumnSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorVerticalPivotColumnSelectorState extends DataCubeEditorColumnSelectorState<DataCubeEditorColumnSelectorColumnState> {
  override cloneColumn(
    column: DataCubeEditorColumnSelectorColumnState,
  ): DataCubeEditorColumnSelectorColumnState {
    return new DataCubeEditorColumnSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns() {
    return this.editor.columnProperties.columns
      .filter(
        (column) =>
          column.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !this.editor.groupExtendColumns.find(
            (col) => col.name === column.name,
          ) &&
          // exclude pivot columns
          !this.editor.horizontalPivots.selector.selectedColumns.find(
            (col) => col.name === column.name,
          ),
      )
      .map(
        (col) =>
          new DataCubeEditorColumnSelectorColumnState(col.name, col.type),
      );
  }
}

export class DataCubeEditorVerticalPivotsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly view!: DataCubeViewState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorVerticalPivotColumnSelectorState;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.view = editor.view;
    this.selector = new DataCubeEditorVerticalPivotColumnSelectorState(editor);
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
          new DataCubeEditorColumnSelectorColumnState(col.name, col.type),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.groupBy = this.selector.selectedColumns.length
      ? {
          columns: this.selector.selectedColumns.map(_toCol),
        }
      : undefined;
    newSnapshot.data.selectColumns = uniqBy(
      [...newSnapshot.data.selectColumns, ...this.selector.selectedColumns],
      (col) => col.name,
    ).map(_toCol);
  }
}
