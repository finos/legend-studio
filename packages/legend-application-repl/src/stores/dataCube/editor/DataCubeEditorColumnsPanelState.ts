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
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorHiddenColumnsVisibility,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { type DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeMutableColumnConfiguration } from './DataCubeMutableConfiguration.js';

export class DataCubeEditorBasicColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState> {
  override cloneColumn(column: DataCubeEditorColumnsSelectorColumnState) {
    return new DataCubeEditorColumnsSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns() {
    return [
      ...this.editor.columns.sourceColumns,
      // TODO: add extended columns
    ].map(
      (col) => new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
    );
  }
}

export class DataCubeEditorColumnsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorBasicColumnsSelectorState;

  sourceColumns: DataCubeQuerySnapshotColumn[] = [];

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      sourceColumns: observable,
      setSourceColumns: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorBasicColumnsSelectorState(editor, {
      initialHiddenColumnsVisibility:
        DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN,
      onChange: (selector) => {
        // populate a default configuration for the newly selected columns
        selector.selectedColumns
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
                type: col.type,
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
  propagateColumnSelectionChanges() {
    // prune column properties
    this.editor.columnProperties.setColumns(
      this.editor.columnProperties.columns.filter((column) =>
        this.selector.selectedColumns.find((col) => col.name === column.name),
      ),
    );

    // prune sorts
    this.editor.sorts.selector.setSelectedColumns(
      this.editor.sorts.selector.selectedColumns.filter((column) =>
        this.selector.selectedColumns.find((col) => col.name === column.name),
      ),
    );

    // prune vertical pivots columns
    this.editor.verticalPivots.selector.setSelectedColumns(
      this.editor.verticalPivots.selector.selectedColumns.filter((column) =>
        this.selector.selectedColumns.find((col) => col.name === column.name),
      ),
    );

    // TODO: prune horizontal pivots columns
  }

  setSourceColumns(columns: DataCubeQuerySnapshotColumn[]) {
    this.sourceColumns = columns;
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.setSourceColumns(snapshot.data.sourceColumns);
    this.selector.setSelectedColumns(
      // extract selected columns from the configuration since the configuration specifies the order
      // taking into account the group extended columns
      // NOTE: since select() is applied before grouping/aggregation, it's technicaly not possible to
      // unselect the group extended columns, so we will take advantage of the `hidden` property to show
      // group extended columns that are not hidden as selected
      configuration.columns.map((col) => {
        const column = this.selector.getColumn(col.name);
        return new DataCubeEditorColumnsSelectorColumnState(
          column.name,
          column.type,
        );
      }),
    );
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    this.propagateColumnSelectionChanges();
    newSnapshot.data.selectColumns = this.selector.selectedColumns
      // TODO: filter by group extended columns
      // and translate unselection to hidden columns in column configuration
      .map((col) => ({
        name: col.name,
        type: col.type,
      }));
  }
}
