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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import {
  _toCol,
  type DataCubeQuerySnapshot,
} from '../../core/DataCubeQuerySnapshot.js';
import {
  DataCubeColumnKind,
  DataCubeQuerySortDirection,
} from '../../core/DataCubeQueryEngine.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnSelectorColumnState,
  DataCubeEditorColumnSelectorState,
} from './DataCubeEditorColumnSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import type { DataCubeConfiguration } from '../../core/DataCubeConfiguration.js';
import { uniqBy } from '@finos/legend-shared';

export class DataCubeEditorSortColumnState extends DataCubeEditorColumnSelectorColumnState {
  direction: DataCubeQuerySortDirection;

  constructor(
    name: string,
    type: string,
    direction: DataCubeQuerySortDirection,
  ) {
    super(name, type);

    makeObservable(this, {
      direction: observable,
      setDirection: action,
    });

    this.direction = direction;
  }

  setDirection(val: DataCubeQuerySortDirection) {
    this.direction = val;
  }
}

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
        ...(this.editor.horizontalPivots.selector.selectedColumns.length
          ? [
              ...this.editor.horizontalPivots.pivotResultColumns,
              ...[
                ...this.editor.columns.selector.selectedColumns,
                ...this.editor.verticalPivots.selector.selectedColumns,
              ].filter(
                (column) =>
                  this.editor.columnProperties.getColumnConfiguration(
                    column.name,
                  ).kind === DataCubeColumnKind.DIMENSION &&
                  !this.editor.horizontalPivots.selector.selectedColumns.find(
                    (col) => col.name === column.name,
                  ),
              ),
            ]
          : [
              ...this.editor.columns.selector.selectedColumns,
              ...this.editor.verticalPivots.selector.selectedColumns,
            ]),
        ...this.editor.groupExtendColumns,
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
  readonly view!: DataCubeViewState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorColumnSelectorState<DataCubeEditorSortColumnState>;

  constructor(editor: DataCubeEditorState) {
    this.editor = editor;
    this.view = editor.view;
    this.selector = new DataCubeEditorSortColumnSelectorState(editor);
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

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.sortColumns = this.selector.selectedColumns.map((col) => ({
      ..._toCol(col),
      direction: col.direction,
    }));
  }
}
