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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotSortColumn,
  DataCubeQuerySnapshotSortOperation,
} from '../core/DataCubeQuerySnapshot.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeColumnPinPlacement } from '../core/DataCubeQueryEngine.js';

export class DataCubeGridControllerState extends DataCubeQuerySnapshotSubscriber {
  configuration = new DataCubeConfiguration();

  sortableColumns: DataCubeQuerySnapshotColumn[] = [];
  sortColumns: DataCubeQuerySnapshotSortColumn[] = [];

  getActionableSortColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): DataCubeQuerySnapshotSortColumn | undefined {
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

  sortByColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): void {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.operation = operation;
    this.sortColumns = [column];
    this.applyChanges();
  }

  addSortByColumn(
    colName: string,
    operation: DataCubeQuerySnapshotSortOperation,
  ): void {
    const column = this.getActionableSortColumn(colName, operation);
    if (!column) {
      return;
    }
    column.operation = operation;
    this.sortColumns = [...this.sortColumns, column];
    this.applyChanges();
  }

  clearAllSorts(): void {
    this.sortColumns = [];
    this.applyChanges();
  }

  getColumnConfiguration(
    colName: string | undefined,
  ): DataCubeColumnConfiguration | undefined {
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

  removeAllPins() {
    this.configuration.columns.forEach((col) => (col.pinned = undefined));
    this.applyChanges();
  }

  hideColumn(colName: string | undefined): void {
    const columnConfiguration = this.getColumnConfiguration(colName);
    if (columnConfiguration) {
      columnConfiguration.hideFromView = true;
      this.applyChanges();
    }
  }

  private applyChanges(): void {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const snapshot = baseSnapshot.clone();

    snapshot.data.sortColumns = this.sortColumns;
    snapshot.data.configuration = DataCubeConfiguration.serialization.toJson(
      this.configuration,
    );

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const newSnapshot = snapshot.clone();

    this.sortableColumns = newSnapshot.stageCols('sort');
    this.sortColumns = newSnapshot.data.sortColumns;

    this.configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
  }

  override async initialize(): Promise<void> {
    // do nothing
  }
}
