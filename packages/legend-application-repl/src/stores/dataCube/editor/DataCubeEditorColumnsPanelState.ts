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

import { action, makeObservable, observable, override } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import {
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotExtendedColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { type DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeMutableColumnConfiguration } from './DataCubeMutableConfiguration.js';

export class DataCubeEditorBasicColumnsSelectorState extends DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState> {
  showHiddenColumns = false;

  constructor(
    editor: DataCubeEditorState,
    options?: {
      onChange?:
        | ((
            select: DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorColumnState>,
          ) => void)
        | undefined;
    },
  ) {
    super(editor, options);

    makeObservable(this, {
      availableColumnsForDisplay: override,
      selectedColumnsForDisplay: override,

      showHiddenColumns: observable,
      setShowHiddenColumns: action,
    });
  }

  override cloneColumn(column: DataCubeEditorColumnsSelectorColumnState) {
    return new DataCubeEditorColumnsSelectorColumnState(
      column.name,
      column.type,
    );
  }

  override get availableColumns() {
    return [
      ...this.editor.columns.sourceColumns,
      ...this.editor.columns.leafExtendColumns,
      ...this.editor.columns.groupExtendColumns,
    ].map(
      (col) => new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
    );
  }

  override get availableColumnsForDisplay(): DataCubeEditorColumnsSelectorColumnState[] {
    return this.availableColumns
      .filter(
        (column) =>
          !this.selectedColumns.find((col) => column.name === col.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((column) => {
        // group-level extended columns are always shown regardless if they are hidden or not
        if (
          this.editor.columns.groupExtendColumns.find(
            (col) => col.name === column.name,
          )
        ) {
          return true;
        }

        return this.showHiddenColumns
          ? true
          : !this.editor.columnProperties.getColumnConfiguration(column.name)
              ?.hideFromView;
      });
  }

  override get selectedColumnsForDisplay(): DataCubeEditorColumnsSelectorColumnState[] {
    return this.selectedColumns.filter((column) => {
      // group-level extended columns are always shown regardless if they are hidden or not
      if (
        this.editor.columns.groupExtendColumns.find(
          (col) => col.name === column.name,
        )
      ) {
        return true;
      }

      return this.showHiddenColumns
        ? true
        : !this.editor.columnProperties.getColumnConfiguration(column.name)
            ?.hideFromView;
    });
  }

  setShowHiddenColumns(val: boolean): void {
    this.showHiddenColumns = val;
  }
}

/**
 * This panel allows selection of columns (including extended columns) for the query.
 *
 * NOTE: though it technically represents the `select()` function in the query, since for
 * convenience, we also show group-level extended columns, there are a fair amount of
 * edge cases we need to handle, such as we need to translate `unselecting` a group-level
 * extended column to hiding it since this extend() operation occurs after select().
 */
export class DataCubeEditorColumnsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorBasicColumnsSelectorState;

  sourceColumns: DataCubeQuerySnapshotColumn[] = [];
  leafExtendColumns: DataCubeQuerySnapshotExtendedColumn[] = [];
  groupExtendColumns: DataCubeQuerySnapshotExtendedColumn[] = [];

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      sourceColumns: observable.ref,
      leafExtendColumns: observable.ref,
      groupExtendColumns: observable.ref,

      applySnaphot: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorBasicColumnsSelectorState(editor, {
      onChange: (selector) => {
        // populate a default configuration for the newly selected columns
        selector.selectedColumns
          .filter(
            (col) =>
              !this.editor.columnProperties.getColumnConfiguration(col.name),
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

        // update hidden flag for group-level extended columns
        // based on the new selection state
        this.groupExtendColumns.forEach((col) => {
          const columnConfiguration =
            this.editor.columnProperties.getColumnConfiguration(col.name);
          columnConfiguration?.setHideFromView(
            !selector.selectedColumns.find(
              (column) => column.name === col.name,
            ),
          );
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
        this.editor.columnProperties.configurableColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );

    // prune sorts
    this.editor.sorts.selector.setSelectedColumns(
      this.editor.sorts.selector.selectedColumns.filter((column) =>
        this.editor.sorts.selector.availableColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );

    // prune vertical pivots columns
    this.editor.verticalPivots.selector.setSelectedColumns(
      this.editor.verticalPivots.selector.selectedColumns.filter((column) =>
        this.editor.verticalPivots.selector.availableColumns.find(
          (col) => col.name === column.name,
        ),
      ),
    );

    // TODO: prune horizontal pivots columns
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.sourceColumns = snapshot.data.sourceColumns;
    this.leafExtendColumns = snapshot.data.leafExtendedColumns;
    this.groupExtendColumns = snapshot.data.groupExtendedColumns;

    this.selector.setSelectedColumns(
      // extract selected columns from the configuration since the configuration specifies the order
      // taking into account the group-level extended columns
      configuration.columns
        // NOTE: since select() is applied before grouping/aggregation, it's technicaly not possible to
        // unselect the group-level extended columns, so we will take advantage of the `hidden` property to show
        // group-level extended columns that are not hidden as selected
        .filter(
          (col) =>
            !this.groupExtendColumns.find(
              (column) => column.name === col.name,
            ) || !col.hideFromView,
        )
        .map((col) => {
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
      // filter out group-level extended columns since these columns are technically not selectable
      .filter(
        (col) =>
          !this.groupExtendColumns.find((column) => column.name === col.name),
      )
      .map((col) => ({
        name: col.name,
        type: col.type,
      }));
  }
}
