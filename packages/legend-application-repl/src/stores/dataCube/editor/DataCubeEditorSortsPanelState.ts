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
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { DataCubeQuerySortOperation } from '../core/DataCubeQueryEngine.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

export class DataCubeEditorSortColumnState extends DataCubeEditorColumnsSelectorColumnState {
  operation: DataCubeQuerySortOperation;

  constructor(
    name: string,
    type: string,
    direction: DataCubeQuerySortOperation,
  ) {
    super(name, type);

    makeObservable(this, {
      operation: observable,
      setOperation: action,
    });

    this.operation = direction;
  }

  setOperation(val: DataCubeQuerySortOperation) {
    this.operation = val;
  }
}

export class DataCubeEditorSortColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorSortColumnState> {
  override cloneColumn(column: DataCubeEditorSortColumnState) {
    return new DataCubeEditorSortColumnState(
      column.name,
      column.type,
      column.operation,
    );
  }

  override get availableColumns() {
    return this.editor.columns.selector.selectedColumns.map(
      (col) =>
        new DataCubeEditorSortColumnState(
          col.name,
          col.type,
          DataCubeQuerySortOperation.ASCENDING,
        ),
    );
  }
}

export class DataCubeEditorSortsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorColumnsSelectorState<DataCubeEditorSortColumnState>;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorSortColumnsSelectorState(editor);
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      snapshot.data.sortColumns.map((col) => {
        const column = this.selector.getColumn(col.name);
        return new DataCubeEditorSortColumnState(
          column.name,
          column.type,
          col.operation,
        );
      }),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.sortColumns = this.selector.selectedColumns.map((col) => ({
      name: col.name,
      type: col.type,
      operation: col.operation,
    }));
  }
}
