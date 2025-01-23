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

import { type DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import { _toCol } from '../../core/model/DataCubeColumn.js';
import {
  DataCubeGridClientSortDirection,
  INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
  type DataCubeGridClientDataFetchRequest,
} from './DataCubeGridClientEngine.js';
import {
  DataCubeQuerySortDirection,
  getPivotResultColumnBaseColumnName,
  isPivotResultColumnName,
} from '../../core/DataCubeQueryEngine.js';
import { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { guaranteeNonNullable, uniqBy } from '@finos/legend-shared';
import { _pruneExpandedPaths } from '../../core/DataCubeQuerySnapshotBuilderUtils.js';

export function getColumnConfiguration(
  colName: string,
  configuration: DataCubeConfiguration,
) {
  return guaranteeNonNullable(
    configuration.getColumn(colName),
    `Can't find configuration for column '${colName}'`,
  );
}

// --------------------------------- MAIN ---------------------------------

export function buildQuerySnapshot(
  request: DataCubeGridClientDataFetchRequest,
  baseSnapshot: DataCubeQuerySnapshot,
) {
  const snapshot = baseSnapshot.clone();
  const configuration = DataCubeConfiguration.serialization.fromJson(
    snapshot.data.configuration,
  );
  const rowGroupColumns = request.rowGroupColumns.filter(
    (col) => col !== INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
  );

  // --------------------------------- SELECT ---------------------------------

  snapshot.data.selectColumns = uniqBy(
    [
      ...snapshot.data.selectColumns,
      ...request.pivotColumns.map((col) =>
        getColumnConfiguration(col, configuration),
      ),
      ...rowGroupColumns.map((col) =>
        getColumnConfiguration(col, configuration),
      ),
    ],
    (col) => col.name,
  ).map(_toCol);

  // --------------------------------- PIVOT ---------------------------------

  snapshot.data.pivot = request.pivotColumns.length
    ? {
        columns: request.pivotColumns.map((col) =>
          _toCol(getColumnConfiguration(col, configuration)),
        ),
        // NOTE: since we re-fetch the cast columns anyway in this flow, we just
        // reuse the current cast columns
        castColumns: baseSnapshot.data.pivot?.castColumns ?? [],
      }
    : undefined;

  // --------------------------------- GROUP BY ---------------------------------

  snapshot.data.groupBy = rowGroupColumns.length
    ? {
        columns: rowGroupColumns.map((col) =>
          _toCol(getColumnConfiguration(col, configuration)),
        ),
      }
    : undefined;

  // --------------------------------- SORT ---------------------------------

  snapshot.data.sortColumns = request.sortColumns
    // Make sure the tree column is not being sorted since it's a synthetic column
    // the sorting state of this special column is `synthesized` by ag-grid
    // so when all group by columns are sorted in the same direction, the tree group
    // column will be sorted in that direction, and vice versa, when user sorts
    // the tree column, all groupBy columns will be sorted in that direction
    .filter(
      (item) =>
        ![
          INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
          INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
        ].includes(item.name),
    )
    .map((item) => ({
      name: item.name,
      type: getColumnConfiguration(
        isPivotResultColumnName(item.name)
          ? getPivotResultColumnBaseColumnName(item.name)
          : item.name,
        configuration,
      ).type,
      direction:
        item.direction === DataCubeGridClientSortDirection.ASCENDING
          ? DataCubeQuerySortDirection.ASCENDING
          : DataCubeQuerySortDirection.DESCENDING,
    }));

  // --------------------------------- CONFIGURATION ---------------------------------

  configuration.pivotLayout.expandedPaths = _pruneExpandedPaths(
    baseSnapshot.data.groupBy?.columns ?? [],
    snapshot.data.groupBy?.columns ?? [],
    configuration.pivotLayout.expandedPaths,
  );
  // if root aggregation synthetic column has been removed
  // pdate the configuration to disable root aggregation
  if (
    !request.rowGroupColumns.includes(
      INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
    ) &&
    configuration.showRootAggregation
  ) {
    configuration.showRootAggregation = false;
  }
  snapshot.data.configuration = configuration.serialize();

  // --------------------------------- FINALIZE ---------------------------------

  return snapshot;
}
