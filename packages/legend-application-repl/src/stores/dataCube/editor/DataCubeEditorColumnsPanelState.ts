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
  _getCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorColumnsVisibility,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export class DataCubeEditorColumnState extends DataCubeEditorColumnsSelectorColumnState {
  readonly column: DataCubeQuerySnapshotColumn;

  constructor(column: DataCubeQuerySnapshotColumn) {
    super();

    this.column = column;
  }

  get name(): string {
    return this.column.name;
  }
}

export class DataCubeEditorColumnsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorColumnsSelectorState<DataCubeEditorColumnState>;

  showHiddenColumns = false;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      showHiddenColumns: observable,
      setShowHiddenColumns: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorColumnsSelectorState(editor, {
      initialColumnsVisibility:
        DataCubeEditorColumnsSelectorColumnsVisibility.HIDDEN,
      onChange: (selector) => {
        // do nothing
      },
    });
  }

  setShowHiddenColumns(val: boolean): void {
    this.showHiddenColumns = val;
  }

  applySnaphot(snapshot: DataCubeQuerySnapshot): void {
    const columns = snapshot.stageCols('select');
    const selectColumns = snapshot.data.selectColumns;
    this.selector.setAvailableColumns(
      columns
        .filter(
          (col) =>
            !selectColumns.find(
              (selectColumn) => selectColumn.name === col.name,
            ),
        )
        .map(
          (col) => new DataCubeEditorColumnState(_getCol(columns, col.name)),
        ),
    );
    this.selector.setSelectedColumns(
      selectColumns.map(
        (col) => new DataCubeEditorColumnState(_getCol(columns, col.name)),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    newSnapshot.data.selectColumns = this.selector.selectedColumns.map(
      (col) => ({
        name: col.column.name,
        type: col.column.type,
      }),
    );
  }
}
