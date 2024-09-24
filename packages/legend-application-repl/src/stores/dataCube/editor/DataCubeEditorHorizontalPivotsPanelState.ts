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

import { action, computed, makeObservable, observable } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import {
  DataCubeColumnKind,
  isPivotResultColumnName,
} from '../core/DataCubeQueryEngine.js';
import {
  _toCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { uniqBy } from '@finos/legend-shared';

export class DataCubeEditorHorizontalPivotColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState> {
  override cloneColumn(
    column: DataCubeEditorColumnsSelectorColumnState,
  ): DataCubeEditorColumnsSelectorColumnState {
    return new DataCubeEditorColumnsSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns() {
    return this.editor.columnProperties.columns
      .filter(
        (col) =>
          col.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !this.editor.groupExtendColumns.find(
            (column) => column.name === col.name,
          ),
      )
      .map(
        (col) =>
          new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
      );
  }
}

export class DataCubeEditorHorizontalPivotsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorHorizontalPivotColumnsSelectorState;

  castColumns: DataCubeQuerySnapshotColumn[] = [];

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      castColumns: observable.ref,
      setCastColumns: action,

      pivotResultColumns: computed,
      columnsConsumedByPivot: computed,

      applySnaphot: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorHorizontalPivotColumnsSelectorState(
      editor,
    );
  }

  get pivotResultColumns(): DataCubeQuerySnapshotColumn[] {
    return this.castColumns
      .filter((col) => isPivotResultColumnName(col.name))
      .map(_toCol);
  }

  /**
   * Due to the nature of pivot() operation, some base columns (i.e. source columns and leaf-level columns)
   * will be "consumed" and not available for subsequent operations (e.g. sort, groupBy, etc.).
   */
  get columnsConsumedByPivot(): DataCubeQuerySnapshotColumn[] {
    if (!this.selector.selectedColumns.length) {
      return [];
    }
    return uniqBy(
      [
        ...this.selector.selectedColumns,
        ...this.editor.columnProperties.columns.filter(
          (col) =>
            col.isSelected &&
            col.kind === DataCubeColumnKind.MEASURE &&
            !col.excludedFromHorizontalPivot,
        ),
        /** TODO: @datacube pivot - need to include columns used in complex aggregates (such as weighted-average) */
      ],
      (col) => col.name,
    ).map(_toCol);
  }

  setCastColumns(value: DataCubeQuerySnapshotColumn[]) {
    this.castColumns = value;
  }

  propagateChanges() {
    this.editor.verticalPivots.adaptPropagatedChanges();
    this.editor.sorts.adaptPropagatedChanges();
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      (snapshot.data.pivot?.columns ?? []).map(
        (col) =>
          new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
      ),
    );
    this.setCastColumns(snapshot.data.pivot?.castColumns ?? []);
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.pivot = this.selector.selectedColumns.length
      ? {
          columns: this.selector.selectedColumns.map(_toCol),
          castColumns: this.castColumns.map(_toCol),
        }
      : undefined;
    newSnapshot.data.selectColumns = uniqBy(
      [...newSnapshot.data.selectColumns, ...this.selector.selectedColumns],
      (col) => col.name,
    ).map(_toCol);
  }
}
