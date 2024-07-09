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
import { type DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeMutableColumnConfiguration } from './DataCubeMutableConfiguration.js';

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
        selector.allSelectedColumns
          .filter(
            (col) =>
              !this.editor.columnProperties.columns.find(
                (column) => column.name === col.name,
              ),
          )
          .forEach((col) => {
            this.editor.columnProperties.setColumns([
              ...this.editor.columnProperties.columns,
              DataCubeMutableColumnConfiguration.createDefault({
                name: col.name,
                type: col.column.type,
              }),
            ]);
          });
      },
    });
  }

  /**
   * Propagate column selection changes to other states: column properties, sorts, pivots, etc.
   *
   * NOTE: Ideally, this should be called on every changes made to the column selection, but to
   * give user some room for error, i.e. when user accidentally select/deselect columns, we would
   * not propagate this change until user either leaves this panel or explicitly applies changes
   * (i.e. publishes a new snapshot)
   */
  propagateColumnSelectionChanges(): void {
    // prune column properties
    this.editor.columnProperties.setColumns(
      this.editor.columnProperties.columns.filter((column) =>
        this.selector.allSelectedColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );

    // prune sorts
    this.editor.sorts.selector.setAllAvailableColumns(
      this.editor.sorts.selector.allAvailableColumns.filter((column) =>
        this.selector.allSelectedColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );
    this.editor.sorts.selector.setAllSelectedColumns(
      this.editor.sorts.selector.allSelectedColumns.filter((column) =>
        this.selector.allSelectedColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );

    // TODO: prune groupBy columns
    // this.editor.sorts.selector.setAllAvailableColumns(
    //   this.editor.sorts.selector.allAvailableColumns.filter((column) =>
    //     this.selector.allSelectedColumns.find(
    //       (col) => col.name === column.name,
    //     ),
    //   ),
    // );
    // this.editor.sorts.selector.setAllSelectedColumns(
    //   this.editor.sorts.selector.allSelectedColumns.filter((column) =>
    //     this.selector.allSelectedColumns.find(
    //       (col) => col.name === column.name,
    //     ),
    //   ),
    // );

    // TODO: prune pivot columns and agg columns?
  }

  setShowHiddenColumns(val: boolean): void {
    this.showHiddenColumns = val;
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ): void {
    const columns = [
      ...snapshot.stageCols('select'),
      ...snapshot.data.groupExtendedColumns,
    ];
    this.selector.setAllAvailableColumns(
      columns
        .filter(
          (col) =>
            !configuration.columns.find((column) => column.name === col.name),
        )
        .map(
          (col) => new DataCubeEditorColumnState(_getCol(columns, col.name)),
        ),
    );
    this.selector.setAllSelectedColumns(
      configuration.columns.map(
        (col) => new DataCubeEditorColumnState(_getCol(columns, col.name)),
      ),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    this.propagateColumnSelectionChanges();

    const selectableColumns = baseSnapshot.stageCols('select');
    newSnapshot.data.selectColumns = this.selector.selectedColumns
      .filter((col) =>
        selectableColumns.find(
          (selectableCol) => selectableCol.name === col.name,
        ),
      )
      .map((col) => ({
        name: col.column.name,
        type: col.column.type,
      }));
  }
}
