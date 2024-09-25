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
import {
  _toCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotExtendedColumn,
} from '../core/DataCubeQuerySnapshot.js';
import { deleteEntry, guaranteeNonNullable, noop } from '@finos/legend-shared';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { DataCubeQuerySnapshotController } from '../core/DataCubeQuerySnapshotManager.js';
import {
  type DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';
import { DataCubeNewColumnState } from './DataCubeColumnEditorState.js';
import { DataCubeColumnKind } from '../core/DataCubeQueryEngine.js';
import { buildDefaultColumnConfiguration } from '../core/DataCubeConfigurationBuilder.js';

export class DataCubeQueryExtendedColumnState {
  name: string;
  type: string;
  data: DataCubeQuerySnapshotExtendedColumn;

  constructor(data: DataCubeQuerySnapshotExtendedColumn) {
    makeObservable(this, {
      name: observable,
      type: observable,
    });

    this.name = data.name;
    this.type = data.type;
    this.data = data;
  }
}

/**
 * This query editor state backs the form editor for extend columns, i.e. creating new columns.
 */
export class DataCubeExtendManagerState extends DataCubeQuerySnapshotController {
  configuration = new DataCubeConfiguration();

  columnConfigurations: DataCubeColumnConfiguration[] = [];
  selectedColumns: DataCubeQuerySnapshotColumn[] = [];
  sourceColumns: DataCubeQuerySnapshotColumn[] = [];

  leafExtendedColumns: DataCubeQueryExtendedColumnState[] = [];
  groupExtendedColumns: DataCubeQueryExtendedColumnState[] = [];

  newColumnEditors: DataCubeNewColumnState[] = [];
  // TODO: existingColumnEditors

  constructor(view: DataCubeViewState) {
    super(view);

    makeObservable(this, {
      columnConfigurations: observable.struct,
      selectedColumns: observable.struct,
      sourceColumns: observable.ref,

      leafExtendedColumns: observable,
      groupExtendedColumns: observable,

      allColumnNames: computed,

      addNewColumn: action,

      applySnapshot: action,
    });
  }

  get allColumnNames(): string[] {
    return [
      ...this.sourceColumns,
      ...this.leafExtendedColumns,
      ...this.groupExtendedColumns,
    ].map((col) => col.name);
  }

  openNewColumnEditor(
    referenceColumn?: DataCubeColumnConfiguration | undefined,
  ) {
    const editor = new DataCubeNewColumnState(this, referenceColumn);
    this.newColumnEditors.push(editor);
    editor.display.open();
  }

  addNewColumn<T extends DataCubeQuerySnapshotExtendedColumn>(
    column: T,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
    editor: DataCubeNewColumnState,
  ) {
    (isGroupLevel ? this.groupExtendedColumns : this.leafExtendedColumns).push(
      new DataCubeQueryExtendedColumnState(column),
    );

    const columnConfiguration = buildDefaultColumnConfiguration(column);
    if (columnKind) {
      columnConfiguration.kind = columnKind;
      columnConfiguration.excludedFromHorizontalPivot =
        columnKind === DataCubeColumnKind.DIMENSION;
    }

    this.columnConfigurations.push(columnConfiguration);
    deleteEntry(this.newColumnEditors, editor);
    this.selectedColumns.push(_toCol(column));
    this.applyChanges();
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    this.configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    this.columnConfigurations = this.configuration.columns;
    this.sourceColumns = snapshot.data.sourceColumns;
    this.leafExtendedColumns = snapshot.data.leafExtendedColumns.map(
      (col) => new DataCubeQueryExtendedColumnState(col),
    );
    this.groupExtendedColumns = snapshot.data.groupExtendedColumns.map(
      (col) => new DataCubeQueryExtendedColumnState(col),
    );
    this.selectedColumns = snapshot.data.selectColumns.map(_toCol);

    // trigger re-compile in each existing column editor as the base query has changed
    this.newColumnEditors.forEach((editor) => {
      editor.getReturnType().catch(noop());
    });
    // TODO: existingColumnEditors
  }

  applyChanges() {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const newSnapshot = baseSnapshot.clone();

    newSnapshot.data.configuration = {
      ...baseSnapshot.data.configuration,
      columns: this.columnConfigurations,
    };

    newSnapshot.data.leafExtendedColumns = this.leafExtendedColumns.map(
      (col) => col.data,
    );
    newSnapshot.data.groupExtendedColumns = this.groupExtendedColumns.map(
      (col) => col.data,
    );
    newSnapshot.data.selectColumns = [...this.selectedColumns];

    // TODO: support edition, so v-pivots/h-pivots or column configuration that
    // depends on columns with name/type changed should be updated

    newSnapshot.finalize();
    if (newSnapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(newSnapshot);
    }
  }
}
