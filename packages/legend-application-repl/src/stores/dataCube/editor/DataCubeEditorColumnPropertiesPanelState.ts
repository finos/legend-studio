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
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeEditorMutableColumnConfiguration } from './DataCubeEditorMutableConfiguration.js';
import {
  getNonNullableEntry,
  isNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

export class DataCubeEditorColumnPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;

  columns: DataCubeEditorMutableColumnConfiguration[] = [];
  selectedColumnName?: string | undefined;
  showAdvancedSettings = false;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      columns: observable,
      setColumns: action,

      selectedColumnName: observable,
      setSelectedColumnName: action,
      selectedColumn: computed,

      showAdvancedSettings: observable,
      setShowAdvancedSettings: action,

      configurableColumns: computed,

      adaptPropagatedChanges: action,
      applySnaphot: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
  }

  get configurableColumns() {
    return [
      ...this.editor.columns.selector.selectedColumns.map((column) =>
        this.columns.find((col) => col.name === column.name),
      ),
      // NOTE: visible group-level extended columns are already included in
      // the selected columns; whereas hidden group-level extended columns are
      // not included, so we need to include them manually.
      //
      // since the order of columns specified here is important as it would be used
      // to determine the order of displayed columns in the grid and the selector
      // so we will put the hidden group-level extended columns last.
      ...this.editor.columns.groupExtendColumns
        .map((column) => this.columns.find((col) => col.name === column.name))
        .filter((column) => column?.hideFromView),
    ].filter(isNonNullable);
  }

  getColumnConfiguration(colName: string | undefined) {
    return this.columns.find((col) => col.name === colName);
  }

  setColumns(val: DataCubeEditorMutableColumnConfiguration[]) {
    this.columns = val;
  }

  setSelectedColumnName(val: string | undefined) {
    this.selectedColumnName = val;
  }

  get selectedColumn() {
    return this.configurableColumns.find(
      (column) => column.name === this.selectedColumnName,
    );
  }

  setShowAdvancedSettings(val: boolean) {
    this.showAdvancedSettings = val;
  }

  adaptPropagatedChanges() {
    this.setColumns(
      this.columns.filter((column) =>
        this.configurableColumns.find((col) => col.name === column.name),
      ),
    );
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.setColumns(
      (snapshot.data.configuration as { columns: PlainObject[] }).columns.map(
        (column) =>
          DataCubeEditorMutableColumnConfiguration.create(
            column,
            snapshot,
            this.dataCube.engine.aggregateOperations,
          ),
      ),
    );

    if (!this.selectedColumn && this.columns.length) {
      this.setSelectedColumnName(
        getNonNullableEntry(this.configurableColumns, 0).name,
      );
    }
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.configuration = {
      ...newSnapshot.data.configuration,
      // NOTE: make sure the order of column configurations is consistent with the order of selected columns
      // as this would later be used to determine of order of displayed columns in the grid
      columns: this.configurableColumns
        .filter((column) =>
          // prune columns which have been deselected except for group-level extended columns
          // those are technically always selected.
          this.columns.find((col) => col.name === column.name),
        )
        .map((column) => column.serialize()),
    };
  }
}
