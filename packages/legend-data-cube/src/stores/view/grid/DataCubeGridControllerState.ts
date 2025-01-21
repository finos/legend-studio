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

import {
  guaranteeNonNullable,
  isNonNullable,
  uniq,
  uniqBy,
} from '@finos/legend-shared';
import { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import {
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotSortColumn,
} from '../../core/DataCubeQuerySnapshot.js';
import {
  _findCol,
  _toCol,
  type DataCubeColumn,
} from '../../core/model/DataCubeColumn.js';
import { DataCubeQuerySnapshotController } from '../../services/DataCubeQuerySnapshotService.js';
import {
  type DataCubeColumnPinPlacement,
  DataCubeColumnKind,
  DataCubeQueryFilterGroupOperator,
  DataCubeQuerySortDirection,
  isPivotResultColumnName,
  getPivotResultColumnBaseColumnName,
} from '../../core/DataCubeQueryEngine.js';
import type {
  DefaultMenuItem,
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
} from 'ag-grid-community';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { generateMenuBuilder } from './DataCubeGridMenuBuilder.js';
import {
  buildFilterEditorTree,
  buildFilterQuerySnapshot,
  DataCubeFilterEditorConditionGroupTreeNode,
  type DataCubeFilterEditorConditionTreeNode,
  type DataCubeFilterEditorTree,
  type DataCubeFilterEditorTreeNode,
} from '../../core/filter/DataCubeQueryFilterEditorState.js';
import { _pruneExpandedPaths } from '../../core/DataCubeQuerySnapshotBuilderUtils.js';

/**
 * This query editor state is responsible for capturing updates to the data cube query
 * caused by interactions with the grid which are either not captured by the server-side row model
 * datasource, e.g. column pinning, column visibility changes, etc or done programatically via grid
 * context menu. Think of this as a companion state for grid editor which bridges the gap between
 * ag-grid state and data cube query state.
 *
 * More technically, this handles interactions that result in instant (not batched) change to the query.
 * For example, in the editor, users can make changes to multiple parts of the query, but until they are
 * explicit applied, these changes will not impact the query; whereas here a change immediately take effect.
 *
 * NOTE: since typically, each grid action causes a new snapshot to be created,
 * we MUST NEVER use the editor here, as it could potentially create illegal state
 * while the editor is still in the middle of a modification that has not been applied.
 */
export class DataCubeGridControllerState extends DataCubeQuerySnapshotController {
  readonly view: DataCubeViewState;

  constructor(view: DataCubeViewState) {
    super(view.engine, view.settingService, view.snapshotService);

    this.view = view;
  }

  configuration = new DataCubeConfiguration();

  menuBuilder?:
    | ((
        params:
          | GetContextMenuItemsParams<unknown, { view: DataCubeViewState }>
          | GetMainMenuItemsParams<unknown, { view: DataCubeViewState }>,
        fromHeader: boolean,
      ) => (DefaultMenuItem | MenuItemDef)[])
    | undefined;

  getColumnConfiguration(colName: string | undefined) {
    return _findCol(this.configuration.columns, colName);
  }

  // --------------------------------- FILTER ---------------------------------

  filterTree: DataCubeFilterEditorTree = {
    nodes: new Map<string, DataCubeFilterEditorTreeNode>(),
  };

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

  // --------------------------------- COLUMNS ---------------------------------

  selectColumns: DataCubeColumn[] = [];
  leafExtendedColumns: DataCubeColumn[] = [];
  groupExtendedColumns: DataCubeColumn[] = [];

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

  rearrangeColumns(columns: string[]) {
    const rearrangedColumnConfigurations = columns
      .map((colName) => this.getColumnConfiguration(colName))
      .filter(isNonNullable);
    this.configuration.columns = [
      ...rearrangedColumnConfigurations,
      ...this.configuration.columns.filter(
        (col) => !rearrangedColumnConfigurations.includes(col),
      ),
    ];

    const rearrangedSelectColumns = columns
      .map((colName) => _findCol(this.selectColumns, colName))
      .filter(isNonNullable);
    this.selectColumns = [
      ...rearrangedSelectColumns,
      ...rearrangedSelectColumns.filter(
        (col) => !rearrangedSelectColumns.includes(col),
      ),
    ];

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

  // --------------------------------- PIVOT ---------------------------------

  horizontalPivotColumns: DataCubeColumn[] = [];
  horizontalPivotCastColumns: DataCubeColumn[] = [];

  private get horizontalPivotResultColumns() {
    return this.horizontalPivotCastColumns
      .filter((col) => isPivotResultColumnName(col.name))
      .map(_toCol);
  }

  getHorizontalPivotableColumn(colName: string) {
    return _findCol(
      this.configuration.columns.filter(
        (col) =>
          col.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !_findCol(this.groupExtendedColumns, col.name),
      ),
      colName,
    );
  }

  setHorizontalPivotOnColumn(colName: string) {
    const column = this.getHorizontalPivotableColumn(colName);
    if (column) {
      this.horizontalPivotColumns = [column];
      this.applyChanges();
    }
  }

  addHorizontalPivotOnColumn(colName: string) {
    const column = this.getHorizontalPivotableColumn(colName);
    if (column) {
      this.horizontalPivotColumns = [...this.horizontalPivotColumns, column];
      this.applyChanges();
    }
  }

  clearAllHorizontalPivots() {
    this.horizontalPivotColumns = [];
    this.horizontalPivotCastColumns = [];
    this.applyChanges();
  }

  excludeColumnFromHorizontalPivot(colName: string) {
    if (isPivotResultColumnName(colName)) {
      const baseColumnName = getPivotResultColumnBaseColumnName(colName);
      const columnConfiguration = this.getColumnConfiguration(baseColumnName);
      if (columnConfiguration && !columnConfiguration.excludedFromPivot) {
        columnConfiguration.excludedFromPivot = true;
        this.applyChanges();
      }
    }
  }

  includeColumnInHorizontalPivot(colName: string) {
    const columnConfiguration = this.getColumnConfiguration(colName);
    if (columnConfiguration?.excludedFromPivot) {
      columnConfiguration.excludedFromPivot = false;
      this.applyChanges();
    }
  }

  // --------------------------------- GROUP BY ---------------------------------

  verticalPivotColumns: DataCubeColumn[] = [];

  getVerticalPivotableColumn(colName: string) {
    return _findCol(
      this.configuration.columns.filter(
        (col) =>
          col.kind === DataCubeColumnKind.DIMENSION &&
          // exclude group-level extended columns
          !_findCol(this.groupExtendedColumns, col.name) &&
          // exclude pivot columns
          !_findCol(this.horizontalPivotColumns, col.name),
      ),
      colName,
    );
  }

  setVerticalPivotOnColumn(colName: string) {
    const column = this.getVerticalPivotableColumn(colName);
    if (column) {
      this.verticalPivotColumns = [column];
      this.applyChanges();
    }
  }

  addVerticalPivotOnColumn(colName: string) {
    const column = this.getVerticalPivotableColumn(colName);
    if (column) {
      this.verticalPivotColumns = [...this.verticalPivotColumns, column];
      this.applyChanges();
    }
  }

  removeVerticalPivotOnColumn(colName: string) {
    this.verticalPivotColumns = this.verticalPivotColumns.filter(
      (col) => col.name !== colName,
    );
    this.applyChanges();
  }

  clearAllVerticalPivots() {
    this.verticalPivotColumns = [];
    this.applyChanges();
  }

  collapseAllPaths() {
    this.view.grid.client.collapseAll();
    this.configuration.pivotLayout.expandedPaths = [];
    this.applyChanges();
  }

  expandPath(path: string) {
    this.configuration.pivotLayout.expandedPaths = uniq([
      ...this.configuration.pivotLayout.expandedPaths,
      path,
    ]).sort();
    this.applyChanges();
  }

  collapsePath(path: string) {
    this.configuration.pivotLayout.expandedPaths =
      this.configuration.pivotLayout.expandedPaths.filter((p) => p !== path);
    this.applyChanges();
  }

  // --------------------------------- SORT ---------------------------------

  sortColumns: DataCubeQuerySnapshotSortColumn[] = [];

  getSortableColumn(colName: string | undefined) {
    if (!colName) {
      return undefined;
    }
    return _findCol(
      [
        ...(this.horizontalPivotCastColumns.length
          ? this.horizontalPivotCastColumns
          : this.selectColumns),
        ...this.groupExtendedColumns,
      ],
      colName,
    );
  }

  setSortByColumn(colName: string, direction: DataCubeQuerySortDirection) {
    const column = this.getSortableColumn(colName);
    if (!column) {
      return;
    }
    this.sortColumns = [
      {
        ...column,
        direction,
      },
    ];
    this.applyChanges();
  }

  addSortByColumn(colName: string, direction: DataCubeQuerySortDirection) {
    const column = this.getSortableColumn(colName);
    if (!column) {
      return;
    }
    this.sortColumns = [...this.sortColumns, { ...column, direction }];
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

  // --------------------------------- MAIN ---------------------------------

  override getSnapshotSubscriberName() {
    return 'grid-controller';
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    this.configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    this.filterTree.nodes = new Map<string, DataCubeFilterEditorTreeNode>();
    this.filterTree.root = snapshot.data.filter
      ? buildFilterEditorTree(
          snapshot.data.filter,
          undefined,
          this.filterTree.nodes,
          (operator) => this.view.engine.getFilterOperation(operator),
        )
      : undefined;

    this.selectColumns = snapshot.data.selectColumns;
    this.leafExtendedColumns = snapshot.data.leafExtendedColumns;
    this.groupExtendedColumns = snapshot.data.groupExtendedColumns;

    this.horizontalPivotColumns = snapshot.data.pivot?.columns ?? [];
    this.horizontalPivotCastColumns = snapshot.data.pivot?.castColumns ?? [];

    this.verticalPivotColumns = snapshot.data.groupBy?.columns ?? [];

    this.sortColumns = snapshot.data.sortColumns;

    this.menuBuilder = generateMenuBuilder(this);
  }

  private propagateChanges(baseSnapshot: DataCubeQuerySnapshot) {
    this.verticalPivotColumns = this.verticalPivotColumns.filter(
      (col) => !_findCol(this.horizontalPivotColumns, col.name),
    );
    this.configuration.pivotLayout.expandedPaths = _pruneExpandedPaths(
      baseSnapshot.data.groupBy?.columns ?? [],
      this.verticalPivotColumns,
      this.configuration.pivotLayout.expandedPaths,
    );
    this.configuration.columns.forEach((col) => {
      col.pivotSortDirection = _findCol(this.horizontalPivotColumns, col.name)
        ? (col.pivotSortDirection ?? DataCubeQuerySortDirection.ASCENDING)
        : undefined;
    });

    this.selectColumns = uniqBy(
      [
        ...this.configuration.columns.filter(
          (col) =>
            col.isSelected && !_findCol(this.groupExtendedColumns, col.name),
        ),
        ...this.horizontalPivotColumns,
        ...this.verticalPivotColumns,
      ],
      (col) => col.name,
    ).map(_toCol);

    const sortableColumns = uniqBy(
      [
        // if pivot is active, take the pivot result columns and include
        // selected dimension columns which are not part of pivot columns
        ...(this.horizontalPivotColumns.length
          ? [
              ...this.horizontalPivotResultColumns,
              ...[
                ...this.configuration.columns.filter((col) => col.isSelected),
                ...this.verticalPivotColumns,
              ].filter(
                (column) =>
                  this.getColumnConfiguration(column.name)?.kind ===
                    DataCubeColumnKind.DIMENSION &&
                  !_findCol(this.horizontalPivotColumns, column.name),
              ),
            ]
          : [
              ...this.configuration.columns.filter((col) => col.isSelected),
              ...this.verticalPivotColumns,
            ]),
        ...this.groupExtendedColumns,
      ],
      (col) => col.name,
    );
    this.sortColumns = this.sortColumns.filter((col) =>
      _findCol(sortableColumns, col.name),
    );
  }

  private applyChanges() {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const snapshot = baseSnapshot.clone();

    this.propagateChanges(baseSnapshot);

    snapshot.data.configuration = this.configuration.serialize();

    snapshot.data.filter = this.filterTree.root
      ? buildFilterQuerySnapshot(this.filterTree.root)
      : undefined;
    snapshot.data.selectColumns = this.selectColumns;
    snapshot.data.pivot = this.horizontalPivotColumns.length
      ? {
          columns: this.horizontalPivotColumns,
          castColumns: this.horizontalPivotCastColumns,
        }
      : undefined;
    snapshot.data.groupBy = this.verticalPivotColumns.length
      ? {
          columns: this.verticalPivotColumns,
        }
      : undefined;
    snapshot.data.sortColumns = this.sortColumns;

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }
  }
}
