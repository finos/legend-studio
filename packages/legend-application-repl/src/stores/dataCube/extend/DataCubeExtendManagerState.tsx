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
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotExtendedColumn,
} from '../core/DataCubeQuerySnapshot.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeQuerySnapshotController } from '../core/DataCubeQuerySnapshotManager.js';
import {
  type DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';
import { DataCubeNewColumnState } from './DataCubeColumnEditorState.js';
import type { DataCubeColumnKind } from '../core/DataCubeQueryEngine.js';
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

  sourceColumns: DataCubeQuerySnapshotColumn[] = [];
  leafExtendedColumns: DataCubeQueryExtendedColumnState[] = [];
  groupExtendedColumns: DataCubeQueryExtendedColumnState[] = [];
  newColumnEditors: DataCubeNewColumnState[] = [];
  // TODO: existingColumnEditors

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      sourceColumns: observable.ref,
      columnConfigurations: observable.struct,
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

  openNewColumnEditor(columnName?: string | undefined) {
    const editor = new DataCubeNewColumnState(this, columnName);
    this.newColumnEditors.push(editor);
    editor.display.open();
  }

  addNewColumn(
    column: DataCubeQuerySnapshotExtendedColumn,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
  ) {
    (isGroupLevel ? this.groupExtendedColumns : this.leafExtendedColumns).push(
      new DataCubeQueryExtendedColumnState(column),
    );

    const columnConfiguration = buildDefaultColumnConfiguration(column);
    if (columnKind) {
      columnConfiguration.kind = columnKind;
    }

    this.columnConfigurations.push(columnConfiguration);
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
    // update the selected columns
    // NOTE: group-extend columns cannot be selected!
    newSnapshot.data.selectColumns = this.columnConfigurations
      .map((col) => ({
        name: col.name,
        type: col.type,
      }))
      .filter(
        (col) =>
          !newSnapshot.data.groupExtendedColumns.find(
            (c) => c.name === col.name,
          ),
      );

    // TODO: support edition, so v-pivots/h-pivots or column configuration that
    // depends on columns with name/type changed should be updated

    newSnapshot.finalize();
    if (newSnapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(newSnapshot);
    }
  }
}
