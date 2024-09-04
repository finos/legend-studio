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
  DataCubeQueryFilterGroupOperator,
} from '../core/DataCubeQueryEngine.js';
import type {
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
} from '@ag-grid-community/core';
import type { DataCubeState } from '../DataCubeState.js';
import { generateMenuBuilder } from './DataCubeGridMenuBuilder.js';
import { _groupByAggCols } from './DataCubeGridQuerySnapshotBuilder.js';
import {
  buildFilterEditorTree,
  buildFilterQuerySnapshot,
  DataCubeFilterEditorConditionGroupTreeNode,
  type DataCubeFilterEditorConditionTreeNode,
  type DataCubeFilterEditorTree,
  type DataCubeFilterEditorTreeNode,
} from '../core/filter/DataCubeQueryFilterEditorState.js';

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

  filterTree: DataCubeFilterEditorTree = {
    nodes: new Map<string, DataCubeFilterEditorTreeNode>(),
  };

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
        fromHeader: boolean,
      ) => (string | MenuItemDef)[])
    | undefined;

  getColumnConfiguration(colName: string | undefined) {
    return this.configuration.columns.find((col) => col.name === colName);
  }

  /**
   * Add a new filter condition to the root of the filter tree.
   * 1. If the root is empty, add a new AND group with the condition as the root
   * 2. If the root is an AND group, add the condition to the root
   * 3. If the root is an OR group, create a new AND group with the condition and
   *    wrapping the current root and set that as the new root
   */
  addNewFilterCondition(condition: DataCubeFilterEditorConditionTreeNode) {
    if (!this.filterTree.root) {
      const root = new DataCubeFilterEditorConditionGroupTreeNode(
        undefined,
        DataCubeQueryFilterGroupOperator.AND,
        undefined,
      );
      this.filterTree.nodes.set(root.uuid, root);
      this.filterTree.root = root;
      root.addChild(condition);
      this.filterTree.nodes.set(condition.uuid, condition);
    } else if (
      this.filterTree.root.operation === DataCubeQueryFilterGroupOperator.AND
    ) {
      this.filterTree.root.addChild(condition);
      this.filterTree.nodes.set(condition.uuid, condition);
    } else {
      // Normally, for this case, we just wrap the current root with a new AND group
      // but if the current (OR group) root has only 1 condition (this is only allowed
      // if the group is root), we can just simply change the group operator to AND
      const currentRoot = this.filterTree.root;
      if (currentRoot.children.length === 1) {
        currentRoot.operation = DataCubeQueryFilterGroupOperator.AND;
        currentRoot.addChild(condition);
        this.filterTree.nodes.set(condition.uuid, condition);
      } else {
        const newRoot = new DataCubeFilterEditorConditionGroupTreeNode(
          undefined,
          DataCubeQueryFilterGroupOperator.AND,
          undefined,
        );
        this.filterTree.nodes.set(newRoot.uuid, newRoot);
        this.filterTree.root = newRoot;
        newRoot.addChild(currentRoot);
        newRoot.addChild(condition);
        this.filterTree.nodes.set(condition.uuid, condition);
      }
    }
    this.applyChanges();
  }

  clearFilters() {
    this.filterTree.root = undefined;
    this.filterTree.nodes = new Map<string, DataCubeFilterEditorTreeNode>();
    this.applyChanges();
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

    snapshot.data.filter = this.filterTree.root
      ? buildFilterQuerySnapshot(this.filterTree.root)
      : undefined;
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

    this.filterTree.nodes = new Map<string, DataCubeFilterEditorTreeNode>();
    this.filterTree.root = snapshot.data.filter
      ? buildFilterEditorTree(
          snapshot.data.filter,
          undefined,
          this.filterTree.nodes,
          (operator) =>
            guaranteeNonNullable(
              this.dataCube.engine.filterOperations.find(
                (op) => op.operator === operator,
              ),
            ),
        )
      : undefined;

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
