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
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotExtendedColumn,
} from '../../core/DataCubeQuerySnapshot.js';
import {
  _toCol,
  type DataCubeColumn,
} from '../../core/models/DataCubeColumn.js';
import {
  assertErrorThrown,
  deleteEntry,
  guaranteeNonNullable,
  noop,
  uniqBy,
} from '@finos/legend-shared';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { DataCubeQuerySnapshotController } from '../DataCubeQuerySnapshotManager.js';
import {
  DataCubeConfiguration,
  type DataCubeColumnConfiguration,
} from '../../core/models/DataCubeConfiguration.js';
import {
  DataCubeExistingColumnEditorState,
  DataCubeNewColumnState,
} from './DataCubeColumnEditorState.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
  getDataType,
} from '../../core/DataCubeQueryEngine.js';
import { buildDefaultColumnConfiguration } from '../../core/DataCubeConfigurationBuilder.js';
import { _lambda } from '../../core/DataCubeQueryBuilderUtils.js';
import { EngineError } from '@finos/legend-graph';

class DataCubeQueryExtendedColumnState {
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
  columnConfigurations: DataCubeColumnConfiguration[] = [];
  selectColumns: DataCubeColumn[] = [];
  sourceColumns: DataCubeColumn[] = [];
  horizontalPivotCastColumns: DataCubeColumn[] = [];

  leafExtendedColumns: DataCubeQueryExtendedColumnState[] = [];
  groupExtendedColumns: DataCubeQueryExtendedColumnState[] = [];

  newColumnEditors: DataCubeNewColumnState[] = [];
  existingColumnEditors: DataCubeExistingColumnEditorState[] = [];

  constructor(view: DataCubeViewState) {
    super(view);

    makeObservable(this, {
      sourceColumns: observable.ref,
      horizontalPivotCastColumns: observable.ref,

      leafExtendedColumns: observable,
      setLeafExtendedColumns: action,

      groupExtendedColumns: observable,
      setGroupExtendedColumns: action,

      allColumnNames: computed,

      addNewColumn: action,
      updateColumn: action,
      deleteColumn: action,

      applySnapshot: action,
    });
  }

  setLeafExtendedColumns(val: DataCubeQueryExtendedColumnState[]): void {
    this.leafExtendedColumns = val;
  }

  setGroupExtendedColumns(val: DataCubeQueryExtendedColumnState[]): void {
    this.groupExtendedColumns = val;
  }

  get allColumnNames(): string[] {
    return uniqBy(
      [
        ...this.sourceColumns,
        ...this.leafExtendedColumns,
        ...this.groupExtendedColumns,
        ...this.horizontalPivotCastColumns,
      ],
      (col) => col.name,
    ).map((col) => col.name);
  }

  async openNewColumnEditor(
    referenceColumn?: DataCubeColumnConfiguration | undefined,
  ) {
    const editor = new DataCubeNewColumnState(this, referenceColumn);
    await editor.initialize();
    this.newColumnEditors.push(editor);
    editor.display.open();
  }

  async openExistingColumnEditor(columnName: string) {
    const existingEditor = this.existingColumnEditors.find(
      (editor) => editor.initialData.name === columnName,
    );
    if (existingEditor) {
      existingEditor.display.open();
      return;
    }

    if (
      !this.leafExtendedColumns.find((col) => col.name === columnName) &&
      !this.groupExtendedColumns.find((col) => col.name === columnName)
    ) {
      return;
    }
    const editor = new DataCubeExistingColumnEditorState(
      this,
      guaranteeNonNullable(
        this.leafExtendedColumns.find((col) => col.name === columnName) ??
          this.groupExtendedColumns.find((col) => col.name === columnName),
      ).data,
      guaranteeNonNullable(
        this.columnConfigurations.find((col) => col.name === columnName),
      ).kind,
      Boolean(this.groupExtendedColumns.find((col) => col.name === columnName)),
    );
    await editor.initialize();
    this.existingColumnEditors.push(editor);
    editor.display.open();
  }

  addNewColumn(
    column: DataCubeQuerySnapshotExtendedColumn,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
    editor: DataCubeNewColumnState,
  ) {
    const columnConfiguration = buildDefaultColumnConfiguration(column);
    if (columnKind) {
      columnConfiguration.kind = columnKind;
      columnConfiguration.excludedFromPivot =
        columnKind === DataCubeColumnKind.DIMENSION;
    }
    this.columnConfigurations.push(columnConfiguration);
    deleteEntry(this.newColumnEditors, editor);
    if (isGroupLevel) {
      this.groupExtendedColumns.push(
        new DataCubeQueryExtendedColumnState(column),
      );
    } else {
      this.leafExtendedColumns.push(
        new DataCubeQueryExtendedColumnState(column),
      );
      this.selectColumns.push(_toCol(column));
    }
    this.applyChanges();
  }

  async updateColumn(
    columnName: string,
    updatedColumn: DataCubeQuerySnapshotExtendedColumn,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
  ) {
    if (
      !this.leafExtendedColumns.find((col) => col.name === columnName) &&
      !this.groupExtendedColumns.find((col) => col.name === columnName)
    ) {
      return;
    }

    const columnConfiguration = guaranteeNonNullable(
      this.columnConfigurations.find((col) => col.name === columnName),
    );

    const task = this.view.newTask('Column update check');

    const currentSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const tempSnapshot = currentSnapshot.clone();
    tempSnapshot.data.leafExtendedColumns =
      tempSnapshot.data.leafExtendedColumns.filter(
        (col) => col.name !== columnName,
      );
    tempSnapshot.data.groupExtendedColumns =
      tempSnapshot.data.groupExtendedColumns.filter(
        (col) => col.name !== columnName,
      );
    tempSnapshot.data.selectColumns = tempSnapshot.data.selectColumns.filter(
      (col) => col.name !== columnName,
    );
    if (isGroupLevel) {
      tempSnapshot.data.groupExtendedColumns.push(updatedColumn);
    } else {
      tempSnapshot.data.leafExtendedColumns.push(updatedColumn);
      if (columnConfiguration.isSelected) {
        tempSnapshot.data.selectColumns.push(_toCol(updatedColumn));
      }
    }
    tempSnapshot.data.configuration = {
      ...tempSnapshot.data.configuration,
      columns: this.columnConfigurations.map((col) => {
        if (col.name === columnName) {
          return {
            ...col.serialize(),
            ..._toCol(updatedColumn),
            kind: columnKind,
          };
        }
        return col.serialize();
      }),
    };

    const codePrefix = `->`;
    const code = await this.view.engine.getPartialQueryCode(tempSnapshot, true);
    try {
      await this.view.engine.getQueryCodeRelationReturnType(
        codePrefix + code,
        _lambda([], [this.view.source.query]),
        this.view.source,
      );
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.view.engine.alertCodeCheckError(error, code, codePrefix, {
          message: `Column Update Check Failure: Can't safely update column '${columnName}'. Check the query code below for more details.`,
          text: `Error: ${error.message}`,
        });
      } else {
        this.view.engine.alertError(error, {
          message: `Column Update Check Failure: Can't safely update column '${columnName}'.`,
          text: `Error: ${error.message}`,
        });
      }
      return;
    } finally {
      this.view.endTask(task);
    }

    this.setLeafExtendedColumns(
      this.leafExtendedColumns.filter((col) => col.name !== columnName),
    );
    this.setGroupExtendedColumns(
      this.groupExtendedColumns.filter((col) => col.name !== columnName),
    );
    this.selectColumns = this.selectColumns.filter(
      (col) => col.name !== columnName,
    );
    if (isGroupLevel) {
      this.setGroupExtendedColumns([
        ...this.groupExtendedColumns,
        new DataCubeQueryExtendedColumnState(updatedColumn),
      ]);
    } else {
      this.setLeafExtendedColumns([
        ...this.leafExtendedColumns,
        new DataCubeQueryExtendedColumnState(updatedColumn),
      ]);
      if (columnConfiguration.isSelected) {
        this.selectColumns.push(_toCol(updatedColumn));
      }
    }
    this.columnConfigurations = this.columnConfigurations.map((col) => {
      if (col.name === columnName) {
        col.kind =
          (columnKind ??
          getDataType(updatedColumn.type) === DataCubeColumnDataType.NUMBER)
            ? DataCubeColumnKind.MEASURE
            : DataCubeColumnKind.DIMENSION;
        col.name = updatedColumn.name;
        col.type = updatedColumn.type;
        col.excludedFromPivot = col.kind === DataCubeColumnKind.DIMENSION;
      }
      return col;
    });

    // close and remove editors for the updated column
    const matchingEditors = this.existingColumnEditors.filter(
      (editor) => editor.initialData.name === columnName,
    );
    matchingEditors.forEach((editor) => editor.display.close());
    this.existingColumnEditors = this.existingColumnEditors.filter(
      (editor) => editor.initialData.name !== columnName,
    );

    this.applyChanges();
  }

  async deleteColumn(columnName: string) {
    if (
      !this.leafExtendedColumns.find((col) => col.name === columnName) &&
      !this.groupExtendedColumns.find((col) => col.name === columnName)
    ) {
      return;
    }

    const task = this.view.newTask('Column delete check');

    const currentSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const tempSnapshot = currentSnapshot.clone();
    tempSnapshot.data.leafExtendedColumns =
      tempSnapshot.data.leafExtendedColumns.filter(
        (col) => col.name !== columnName,
      );
    tempSnapshot.data.groupExtendedColumns =
      tempSnapshot.data.groupExtendedColumns.filter(
        (col) => col.name !== columnName,
      );
    tempSnapshot.data.selectColumns = tempSnapshot.data.selectColumns.filter(
      (col) => col.name !== columnName,
    );
    tempSnapshot.data.configuration = {
      ...tempSnapshot.data.configuration,
      columns: this.columnConfigurations
        .filter((col) => col.name !== columnName)
        .map((col) => col.serialize()),
    };

    const codePrefix = `->`;
    const code = await this.view.engine.getPartialQueryCode(tempSnapshot, true);
    try {
      await this.view.engine.getQueryCodeRelationReturnType(
        codePrefix + code,
        _lambda([], [this.view.source.query]),
        this.view.source,
      );
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.view.engine.alertCodeCheckError(error, code, codePrefix, {
          message: `Column Delete Check Failure: Can't safely delete column '${columnName}'. Check the query code below for more details.`,
          text: `Error: ${error.message}`,
        });
      } else {
        this.view.engine.alertError(error, {
          message: `Column Delete Check Failure: Can't safely delete column '${columnName}'.`,
          text: `Error: ${error.message}`,
        });
      }
      return;
    } finally {
      this.view.endTask(task);
    }

    this.setLeafExtendedColumns(
      this.leafExtendedColumns.filter((col) => col.name !== columnName),
    );
    this.setGroupExtendedColumns(
      this.groupExtendedColumns.filter((col) => col.name !== columnName),
    );
    this.columnConfigurations = this.columnConfigurations.filter(
      (col) => col.name !== columnName,
    );
    this.selectColumns = this.selectColumns.filter(
      (col) => col.name !== columnName,
    );

    // close and remove editors for the deleted column
    const matchingEditors = this.existingColumnEditors.filter(
      (editor) => editor.initialData.name === columnName,
    );
    matchingEditors.forEach((editor) => editor.display.close());
    this.existingColumnEditors = this.existingColumnEditors.filter(
      (editor) => editor.initialData.name !== columnName,
    );

    this.applyChanges();
  }

  override getSnapshotSubscriberName() {
    return 'extend-manager';
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    this.columnConfigurations = configuration.columns;
    this.sourceColumns = snapshot.data.sourceColumns;
    this.leafExtendedColumns = snapshot.data.leafExtendedColumns.map(
      (col) => new DataCubeQueryExtendedColumnState(col),
    );
    this.groupExtendedColumns = snapshot.data.groupExtendedColumns.map(
      (col) => new DataCubeQueryExtendedColumnState(col),
    );
    this.horizontalPivotCastColumns = snapshot.data.pivot?.castColumns ?? [];
    this.selectColumns = snapshot.data.selectColumns.map(_toCol);

    // trigger re-compile in each existing column editor as the base query has changed
    [...this.newColumnEditors, ...this.existingColumnEditors].forEach(
      (editor) => {
        editor.getReturnType().catch(noop());
      },
    );
  }

  applyChanges() {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const newSnapshot = baseSnapshot.clone();

    newSnapshot.data.configuration = {
      ...baseSnapshot.data.configuration,
      columns: this.columnConfigurations.map((col) => col.serialize()),
    };

    newSnapshot.data.leafExtendedColumns = this.leafExtendedColumns.map(
      (col) => col.data,
    );
    newSnapshot.data.groupExtendedColumns = this.groupExtendedColumns.map(
      (col) => col.data,
    );
    newSnapshot.data.selectColumns = [...this.selectColumns];

    newSnapshot.finalize();
    if (newSnapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(newSnapshot);
    }
  }
}
