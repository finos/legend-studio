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
  _toCol,
  type DataCubeQuerySnapshot,
} from '../core/DataCubeQuerySnapshot.js';
import {
  GridClientSortDirection,
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import {
  DataCubeQuerySortDirection,
  getPivotResultColumnBaseColumnName,
  isPivotResultColumnName,
} from '../core/DataCubeQueryEngine.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { guaranteeNonNullable, uniqBy } from '@finos/legend-shared';
import { _pruneExpandedPaths } from '../core/DataCubeQuerySnapshotBuilderUtils.js';

export function getColumnConfiguration(
  colName: string,
  configuration: DataCubeConfiguration,
) {
  return guaranteeNonNullable(
    configuration.columns.find((col) => col.name === colName),
    `Can't find configuration for column '${colName}'`,
  );
}

// --------------------------------- MAIN ---------------------------------

export function buildQuerySnapshot(
  request: IServerSideGetRowsRequest,
  baseSnapshot: DataCubeQuerySnapshot,
) {
  const snapshot = baseSnapshot.clone();
  const configuration = DataCubeConfiguration.serialization.fromJson(
    snapshot.data.configuration,
  );

  // --------------------------------- SELECT ---------------------------------

  snapshot.data.selectColumns = uniqBy(
    [
      ...configuration.columns.filter((col) => col.isSelected),
      ...request.pivotCols.map((col) =>
        getColumnConfiguration(col.id, configuration),
      ),
      ...request.rowGroupCols.map((col) =>
        getColumnConfiguration(col.id, configuration),
      ),
    ],
    (col) => col.name,
  ).map(_toCol);

  // --------------------------------- PIVOT ---------------------------------

  snapshot.data.pivot = request.pivotCols.length
    ? {
        columns: request.pivotCols.map((col) =>
          _toCol(getColumnConfiguration(col.id, configuration)),
        ),
        // NOTE: since we re-fetch the cast columns anyway in this flow, we just
        // reuse the current cast columns
        castColumns: baseSnapshot.data.pivot?.castColumns ?? [],
      }
    : undefined;

  // --------------------------------- GROUP BY ---------------------------------

  snapshot.data.groupBy = request.rowGroupCols.length
    ? {
        columns: request.rowGroupCols.map((col) =>
          _toCol(getColumnConfiguration(col.id, configuration)),
        ),
      }
    : undefined;

  // --------------------------------- SORT ---------------------------------

  snapshot.data.sortColumns = request.sortModel
    // Make sure the tree column is not being sorted since it's a synthetic column
    // the sorting state of this special column is `synthesized` by ag-grid
    // so when all group by columns are sorted in the same direction, the tree group
    // column will be sorted in that direction, and vice versa, when user sorts
    // the tree column, all groupBy columns will be sorted in that direction
    .filter((item) => item.colId !== INTERNAL__GRID_CLIENT_TREE_COLUMN_ID)
    .map((item) => ({
      ..._toCol(
        getColumnConfiguration(
          isPivotResultColumnName(item.colId)
            ? getPivotResultColumnBaseColumnName(item.colId)
            : item.colId,
          configuration,
        ),
      ),
      direction:
        item.sort === GridClientSortDirection.ASCENDING
          ? DataCubeQuerySortDirection.ASCENDING
          : DataCubeQuerySortDirection.DESCENDING,
    }));

  // --------------------------------- CONFIGURATION ---------------------------------

  configuration.pivotLayout.expandedPaths = _pruneExpandedPaths(
    baseSnapshot.data.groupBy?.columns ?? [],
    snapshot.data.groupBy?.columns ?? [],
    configuration.pivotLayout.expandedPaths,
  );
  snapshot.data.configuration =
    DataCubeConfiguration.serialization.toJson(configuration);

  // --------------------------------- FINALIZE ---------------------------------

  return snapshot;
}
