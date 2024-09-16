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
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeColumnKind } from '../core/DataCubeQueryEngine.js';
import {
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorHorizontalPivotColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState> {
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

      applySnaphot: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorHorizontalPivotColumnsSelectorState(
      editor,
    );
  }

  get columnsConsumedByPivot(): DataCubeQuerySnapshotColumn[] {
    if (!this.selector.selectedColumns.length) {
      return [];
    }
    return [
      ...this.selector.selectedColumns,
      ...this.editor.columnProperties.columns.filter(
        (col) =>
          col.kind === DataCubeColumnKind.MEASURE &&
          !col.excludedFromHorizontalPivot,
      ),
      /** TODO: @datacube pivot - need to include columns used in aggregates (such as weighted-average) */
    ].map((col) => ({ name: col.name, type: col.type }));
  }

  setCastColumns(value: DataCubeQuerySnapshotColumn[]) {
    this.castColumns = value;
  }

  adaptPropagatedChanges() {
    this.selector.setSelectedColumns(
      this.selector.selectedColumns.filter((column) =>
        this.selector.availableColumns.find((col) => col.name === column.name),
      ),
    );
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
          columns: this.selector.selectedColumns.map((column) => ({
            name: column.name,
            type: column.type,
          })),
          castColumns: this.castColumns.map((column) => ({
            name: column.name,
            type: column.type,
          })),
        }
      : undefined;
  }
}
