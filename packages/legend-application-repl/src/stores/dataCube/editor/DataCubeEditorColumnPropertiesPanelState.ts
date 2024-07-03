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
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeMutableColumnConfiguration } from './DataCubeMutableConfiguration.js';
import { getNonNullableEntry, type PlainObject } from '@finos/legend-shared';

export class DataCubeEditorColumnPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;

  columns: DataCubeMutableColumnConfiguration[] = [];
  selectedColumnName?: string | undefined;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      columns: observable,
      setColumns: action,

      selectedColumnName: observable,
      setSelectedColumnName: action,
      selectedColumn: computed,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
  }

  setColumns(val: DataCubeMutableColumnConfiguration[]): void {
    this.columns = val;
  }

  setSelectedColumnName(val: string | undefined): void {
    this.selectedColumnName = val;
  }

  get selectedColumn(): DataCubeMutableColumnConfiguration | undefined {
    return this.columns.find(
      (column) => column.name === this.selectedColumnName,
    );
  }

  applySnaphot(snapshot: DataCubeQuerySnapshot): void {
    this.setColumns(
      (snapshot.data.configuration as { columns: PlainObject[] }).columns.map(
        (column) => DataCubeMutableColumnConfiguration.create(column),
      ),
    );
    if (!this.selectedColumn && this.columns.length) {
      this.setSelectedColumnName(getNonNullableEntry(this.columns, 0).name);
    }
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    newSnapshot.data.configuration = {
      ...newSnapshot.data.configuration,
      columns: this.columns.map((column) => column.serialize()),
    };
  }
}
