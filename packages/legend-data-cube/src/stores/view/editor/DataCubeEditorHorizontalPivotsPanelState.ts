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
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import {
  DataCubeColumnKind,
  isPivotResultColumnName,
} from '../../core/DataCubeQueryEngine.js';
import { type DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import {
  _toCol,
  type DataCubeColumn,
} from '../../core/model/DataCubeColumn.js';
import {
  DataCubeEditorColumnSelectorColumnState,
  DataCubeEditorColumnSelectorState,
} from './DataCubeEditorColumnSelectorState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { uniqBy } from '@finos/legend-shared';

export class DataCubeEditorHorizontalPivotColumnSelectorState extends DataCubeEditorColumnSelectorState<DataCubeEditorColumnSelectorColumnState> {
  override cloneColumn(
    column: DataCubeEditorColumnSelectorColumnState,
  ): DataCubeEditorColumnSelectorColumnState {
    return new DataCubeEditorColumnSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns() {
    return this._editor.columnProperties.columns
      .filter(
        (col) =>
          col.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !this._editor.groupExtendColumns.find(
            (column) => column.name === col.name,
          ),
      )
      .map(
        (col) =>
          new DataCubeEditorColumnSelectorColumnState(col.name, col.type),
      );
  }
}

export class DataCubeEditorHorizontalPivotsPanelState
  implements DataCubeQueryEditorPanelState
{
  private readonly _editor!: DataCubeEditorState;

  readonly selector!: DataCubeEditorHorizontalPivotColumnSelectorState;

  castColumns: DataCubeColumn[] = [];

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      castColumns: observable.ref,
      pivotResultColumns: computed,
      setCastColumns: action,

      applySnaphot: action,
    });

    this._editor = editor;
    this.selector = new DataCubeEditorHorizontalPivotColumnSelectorState(
      editor,
    );
  }

  get pivotResultColumns(): DataCubeColumn[] {
    return this.castColumns
      .filter((col) => isPivotResultColumnName(col.name))
      .map(_toCol);
  }

  setCastColumns(value: DataCubeColumn[]) {
    this.castColumns = value;
  }

  propagateChanges() {
    this._editor.verticalPivots.adaptPropagatedChanges();
    this._editor.sorts.adaptPropagatedChanges();
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      (snapshot.data.pivot?.columns ?? []).map(
        (col) =>
          new DataCubeEditorColumnSelectorColumnState(col.name, col.type),
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
