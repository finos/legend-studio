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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { type DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeEditorMutableColumnConfiguration } from './DataCubeEditorMutableConfiguration.js';
import {
  getNonNullableEntry,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';

export class DataCubeEditorColumnPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  private readonly _view!: DataCubeViewState;

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

      applySnaphot: action,
    });

    this._view = editor.view;
  }

  getColumnConfiguration(colName: string | undefined) {
    return guaranteeNonNullable(
      this.columns.find((col) => col.name === colName),
      `Can't find configuration for column '${colName}'`,
    );
  }

  setColumns(val: DataCubeEditorMutableColumnConfiguration[]) {
    this.columns = val;
  }

  setSelectedColumnName(val: string | undefined) {
    this.selectedColumnName = val;
  }

  get selectedColumn() {
    return this.columns.find((col) => col.name === this.selectedColumnName);
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
          DataCubeEditorMutableColumnConfiguration.create(
            column,
            snapshot,
            this._view.engine.aggregateOperations,
          ),
      ),
    );

    if (!this.selectedColumn && this.columns.length) {
      this.setSelectedColumnName(getNonNullableEntry(this.columns, 0).name);
    }
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ) {
    newSnapshot.data.configuration = {
      ...newSnapshot.data.configuration,
      columns: this.columns.map((column) => column.serialize()),
    };
  }
}
