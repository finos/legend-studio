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
  _toCol,
  type DataCubeQuerySnapshot,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from './DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { type DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

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
      ...this.editor.sourceColumns,
      ...this.editor.leafExtendColumns,
      ...this.editor.groupExtendColumns,
    ].map(
      (col) => new DataCubeEditorColumnsSelectorColumnState(col.name, col.type),
    );
  }

  override get availableColumnsForDisplay(): DataCubeEditorColumnsSelectorColumnState[] {
    return super.availableColumnsForDisplay.filter(
      (column) =>
        this.showHiddenColumns ||
        !this.editor.columnProperties.getColumnConfiguration(column.name)
          ?.hideFromView,
    );
  }

  override get selectedColumnsForDisplay(): DataCubeEditorColumnsSelectorColumnState[] {
    return super.selectedColumnsForDisplay.filter(
      (column) =>
        this.showHiddenColumns ||
        !this.editor.columnProperties.getColumnConfiguration(column.name)
          ?.hideFromView,
    );
  }

  setShowHiddenColumns(val: boolean): void {
    this.showHiddenColumns = val;
  }
}

/**
 * This panel allows selection of columns (including extended columns) for the query.
 *
 * NOTE: this does not really represent the `select()` function in the query. Think about
 * this column selection more intuitively from users' perspective, i.e. what columns they
 * wish to see in the grid. Whereas the `select()` function actually impact the data fetching
 * which should be computed based on more than just information coming from this panels, such
 * as horizontal pivots and vertical pivots, since regardless of whether user choose to see
 * those columns or not, they still need to be fetched.
 */
export class DataCubeEditorColumnsPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly selector!: DataCubeEditorBasicColumnsSelectorState;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      applySnaphot: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.selector = new DataCubeEditorBasicColumnsSelectorState(editor, {
      onChange: (selector) => {
        const selectedColumnConfigurations = selector.selectedColumns.map(
          (col) =>
            this.editor.columnProperties.getColumnConfiguration(col.name),
        );
        const unselectedColumnConfigurations =
          this.editor.columnProperties.columns.filter(
            (col) => !selectedColumnConfigurations.includes(col),
          );

        // update selection config in column configurations and apply the
        // order of selected columns in the column configurations list (unselected
        // columns are kept in the same order and placed after all selected ones)
        selectedColumnConfigurations.forEach((col) => col.setIsSelected(true));
        unselectedColumnConfigurations.forEach((col) =>
          col.setIsSelected(false),
        );
        this.editor.columnProperties.setColumns([
          ...selectedColumnConfigurations,
          ...unselectedColumnConfigurations,
        ]);
      },
    });
  }

  /**
   * NOTE: Ideally, this should be called on every changes made to the column selection, but to
   * give user some room for error, i.e. when user accidentally select/deselect columns, we would
   * not propagate this change until user either leaves this panel or explicitly applies changes
   * (i.e. publishes a new snapshot)
   */
  propagateChanges(): void {
    this.editor.sorts.adaptPropagatedChanges();
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.selector.setSelectedColumns(
      this.editor.columnProperties.columns
        // extract from the configuration since it specifies the order of columns
        // there taking into account group-level extended columns
        .filter((col) => col.isSelected)
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
    this.propagateChanges();
    // NOTE: these columns make up just part of the set of columns we want to fetch with `select()`.
    // Subsequently, we need to include columns used for horizontal pivots and vertical pivots.
    //
    // Note that this is a fairly simple way to determine the set of columns to fetch, but we have a
    // compile check to ensure the columns needed by parts we don't account for well such as group-level
    // extended columns must be properly included.
    //
    // Maybe, we can improve this later by having an algorithm to determine the set of columns needed
    // by each extended column.
    newSnapshot.data.selectColumns = this.selector.selectedColumns
      // filter out group-level extended columns since these columns are technically not selectable
      .filter(
        (col) =>
          !this.editor.groupExtendColumns.find(
            (column) => column.name === col.name,
          ),
      )
      .map((col) => _toCol(col));
  }
}
