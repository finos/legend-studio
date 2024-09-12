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

/***************************************************************************************
 * [GRID]
 *
 * These are utilities used to build the query snapshot from the internal state
 * of the grid client, AG Grid.
 ***************************************************************************************/

import type { IServerSideGetRowsRequest } from '@ag-grid-community/core';
import {
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotGroupBy,
  _getCol,
} from '../core/DataCubeQuerySnapshot.js';
import {
  GridClientSortDirection,
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import {
  DataCubeAggregateOperator,
  DataCubeQuerySortOperator,
} from '../core/DataCubeQueryEngine.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';

export function _groupByAggCols(
  newGroupByColumns: DataCubeQuerySnapshotColumn[],
  groupBy: DataCubeQuerySnapshotGroupBy | undefined,
  configuration: DataCubeConfiguration,
  excludedColumns?: DataCubeQuerySnapshotColumn[] | undefined,
) {
  return configuration.columns
    .filter(
      (column) =>
        !excludedColumns?.find((col) => col.name === column.name) &&
        !newGroupByColumns.find((col) => col.name === column.name),
    )
    .map((column) => {
      // try to retrieve the aggregation from previous snapshot
      // if not possible, create a new default aggregation
      // based on the column type
      const aggCol = groupBy?.aggColumns.find(
        (col) => col.name === column.name,
      );
      if (aggCol) {
        return aggCol;
      }
      switch (column.type) {
        case PRIMITIVE_TYPE.NUMBER:
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT: {
          return {
            name: column.name,
            type: column.type,
            operation: DataCubeAggregateOperator.SUM,
            parameters: [],
          };
        }
        default:
          return {
            name: column.name,
            type: column.type,
            operation: DataCubeAggregateOperator.UNIQUE,
            parameters: [],
          };
      }
    });
}

// --------------------------------- MAIN ---------------------------------

export function buildQuerySnapshot(
  request: IServerSideGetRowsRequest,
  baseSnapshot: DataCubeQuerySnapshot,
) {
  const configuration = DataCubeConfiguration.serialization.fromJson(
    baseSnapshot.data.configuration,
  );
  const snapshot = baseSnapshot.clone();

  // --------------------------------- GROUP BY ---------------------------------

  if (request.rowGroupCols.length) {
    const availableCols = baseSnapshot.stageCols('aggregation');
    const newGroupByColumns = request.rowGroupCols.map((col) => ({
      name: col.id,
      type: _getCol(availableCols, col.id).type,
    }));
    snapshot.data.groupBy = {
      columns: newGroupByColumns,
      aggColumns: _groupByAggCols(
        newGroupByColumns,
        baseSnapshot.data.groupBy,
        configuration,
        baseSnapshot.data.groupExtendedColumns,
      ),
    };
  } else {
    snapshot.data.groupBy = undefined;
  }

  // --------------------------------- SORT ---------------------------------

  snapshot.data.sortColumns = request.sortModel
    // Make sure the tree group is not being sorted since it's a synthetic column
    // the sorting state of this special column is `synthesized` by ag-grid
    // so when all group by columns are sorted in the same direction, the tree group
    // column will be sorted in that direction, and vice versa, when user sorts
    // the tree-group, all group-by columns will be sorted in that direction
    .filter((item) => item.colId !== INTERNAL__GRID_CLIENT_TREE_COLUMN_ID)
    .map((item) => ({
      ..._getCol(baseSnapshot.stageCols('sort'), item.colId),
      operation:
        item.sort === GridClientSortDirection.ASCENDING
          ? DataCubeQuerySortOperator.ASCENDING
          : DataCubeQuerySortOperator.DESCENDING,
    }));

  // --------------------------------- FINALIZE ---------------------------------

  return snapshot.finalize();
}
