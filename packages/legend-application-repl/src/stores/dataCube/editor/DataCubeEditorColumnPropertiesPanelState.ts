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
import { DataCubeMutableColumnConfiguration } from './DataCubeMutableConfiguration.js';
import { getNonNullableEntry, type PlainObject } from '@finos/legend-shared';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

export class DataCubeEditorColumnPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;

  columns: DataCubeMutableColumnConfiguration[] = [];
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
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
  }

  get configurableColumns() {
    return this.columns.filter(
      (column) =>
        this.editor.columns.selector.selectedColumns.find(
          (col) => col.name === column.name,
        ) ??
        this.editor.columns.groupExtendColumns.find(
          (col) => col.name === column.name,
        ),
    );
  }

  getColumnConfiguration(colName: string | undefined) {
    return this.columns.find((col) => col.name === colName);
  }

  setColumns(val: DataCubeMutableColumnConfiguration[]) {
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

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.setColumns(
      (snapshot.data.configuration as { columns: PlainObject[] }).columns.map(
        (column) =>
          DataCubeMutableColumnConfiguration.create(
            column,
          ).populateSyntheticMetadata(snapshot),
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
      columns: this.columns
        .filter((column) =>
          // prune columns which have been deselected except for group-level extended columns
          // those are technically always selected.
          this.configurableColumns.find((col) => col.name === column.name),
        )
        .map((column) => column.serialize()),
    };
  }
}
