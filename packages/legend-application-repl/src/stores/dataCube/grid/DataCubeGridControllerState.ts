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

import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotSortColumn,
} from '../core/DataCubeQuerySnapshot.js';
import { DataCubeQuerySnapshotController } from '../core/DataCubeQuerySnapshotManager.js';
import {
  type DataCubeQuerySortOperator,
  type DataCubeColumnPinPlacement,
  DataCubeColumnKind,
} from '../core/DataCubeQueryEngine.js';
import type {
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
} from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { generateMenuBuilder } from './DataCubeGridMenuBuilder.js';
import { _groupByAggCols } from './DataCubeGridQuerySnapshotBuilder.js';

/**
 * This state is responsible for capturing edition to the data cube query
 * caused by interaction with the grid which is not captured by the server-side row model
 * datasource, e.g. column pinning, column visibility changes, etc.
 *
 * NOTE: since typically, each grid action causes a new snapshot to be created,
 * we MUST NEVER use the editor here, as it could potentially create illegal state
 * while the editor is still in the middle of a modification that has not been applied.
 */
export class DataCubeGridControllerState extends DataCubeQuerySnapshotController {
  configuration = new DataCubeConfiguration();

  selectableColumns: DataCubeQuerySnapshotColumn[] = [];
  selectColumns: DataCubeQuerySnapshotColumn[] = [];

  verticalPivotableColumns: DataCubeQuerySnapshotColumn[] = [];
  verticalPivotedColumns: DataCubeQuerySnapshotColumn[] = [];

  sortableColumns: DataCubeQuerySnapshotColumn[] = [];
  sortColumns: DataCubeQuerySnapshotSortColumn[] = [];

  menuBuilder?:
    | ((
        params:
          | GetContextMenuItemsParams<unknown, { dataCube: DataCubeState }>
          | GetMainMenuItemsParams<unknown, { dataCube: DataCubeState }>,
      ) => (string | MenuItemDef)[])
    | undefined;

  getColumnConfiguration(colName: string | undefined) {
    return this.configuration.columns.find((col) => col.name === colName);
  }

  pinColumn(
    colName: string | undefined,
    placement: DataCubeColumnPinPlacement | undefined,
  ) {
    const columnConfiguration = this.getColumnConfiguration(colName);
    if (columnConfiguration) {
      columnConfiguration.pinned = placement;
      this.applyChanges();
    }
  }

  rearrangeColumns(columnByNames: string[]) {
    this.configuration.columns = columnByNames
      .map((colName) => this.getColumnConfiguration(colName))
      .filter(isNonNullable);
    this.selectColumns = this.configuration.columns
      .map((column) =>
        this.selectColumns.find((col) => col.name === column.name),
      )
      .filter(isNonNullable);
    this.applyChanges();
  }

  removeAllPins() {
    this.configuration.columns.forEach((col) => (col.pinned = undefined));
    this.applyChanges();
  }

  showColumn(colName: string | undefined, isVisible: boolean) {
    const columnConfiguration = this.getColumnConfiguration(colName);
    if (columnConfiguration) {
      columnConfiguration.hideFromView = !isVisible;
      this.applyChanges();
    }
  }

  setVerticalPivotOnColumn(colName: string | undefined) {
    const column = this.verticalPivotableColumns.find(
      (col) => col.name === colName,
    );
    if (column) {
      this.verticalPivotedColumns = [column];
      this.applyChanges();
    }
  }

  addVerticalPivotOnColumn(colName: string | undefined) {
    const column = this.verticalPivotableColumns.find(
      (col) => col.name === colName,
    );
    if (column) {
      this.verticalPivotedColumns = [...this.verticalPivotedColumns, column];
      this.applyChanges();
    }
  }

  removeVerticalPivotOnColumn(colName: string | undefined) {
    this.verticalPivotedColumns = this.verticalPivotedColumns.filter(
      (col) => col.name === colName,
    );
    this.applyChanges();
  }

  clearAllVerticalPivots() {
    this.verticalPivotedColumns = [];
    this.applyChanges();
  }

  getActionableSortColumn(
    colName: string,
    operation: DataCubeQuerySortOperator,
  ) {
    const column = this.sortableColumns.find((col) => col.name === colName);
    if (!column) {
      return undefined;
    }
    const sortColumn = this.sortColumns.find((col) => col.name === colName);
    if (sortColumn && sortColumn.operation !== operation) {
      return sortColumn;
    }
    if (!sortColumn) {
      return { ...column, operation };
    }
    return undefined;
  }

  setSortByColumn(colName: string, operation: DataCubeQuerySortOperator) {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.operation = operation;
    this.sortColumns = [column];
    this.applyChanges();
  }

  addSortByColumn(colName: string, operation: DataCubeQuerySortOperator) {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.operation = operation;
    this.sortColumns = [...this.sortColumns, column];
    this.applyChanges();
  }

  clearSortByColumn(colName: string) {
    this.sortColumns = this.sortColumns.filter((col) => col.name !== colName);
    this.applyChanges();
  }

  clearAllSorts() {
    this.sortColumns = [];
    this.applyChanges();
  }

  private applyChanges() {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const snapshot = baseSnapshot.clone();

    snapshot.data.selectColumns = this.selectColumns;
    snapshot.data.sortColumns = this.sortColumns;
    snapshot.data.configuration = DataCubeConfiguration.serialization.toJson(
      this.configuration,
    );

    snapshot.data.groupBy = this.verticalPivotedColumns.length
      ? {
          columns: this.verticalPivotedColumns,
          aggColumns: _groupByAggCols(
            baseSnapshot.data.groupBy,
            this.configuration,
          ),
        }
      : undefined;

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    const newSnapshot = snapshot.clone();

    this.configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    this.selectableColumns = newSnapshot.stageCols('select');
    this.selectColumns = newSnapshot.data.selectColumns;

    this.sortableColumns = newSnapshot.stageCols('sort');
    this.sortColumns = newSnapshot.data.sortColumns;

    this.verticalPivotableColumns = newSnapshot
      .stageCols('aggregation')
      .filter(
        (column) =>
          this.getColumnConfiguration(column.name)?.kind ===
          DataCubeColumnKind.DIMENSION,
      );
    this.verticalPivotedColumns = newSnapshot.data.groupBy?.columns ?? [];

    this.menuBuilder = generateMenuBuilder(this);
  }
}
