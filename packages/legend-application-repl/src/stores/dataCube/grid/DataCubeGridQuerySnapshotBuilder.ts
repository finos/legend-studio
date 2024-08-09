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
  type DataCubeQuerySnapshotGroupBy,
  _getCol,
} from '../core/DataCubeQuerySnapshot.js';
import { GridClientSortDirection } from './DataCubeGridClientEngine.js';
import {
  DataCubeColumnKind,
  DataCubeQuerySortOperator,
} from '../core/DataCubeQueryEngine.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { _defaultAggCol } from '../core/DataCubeQuerySnapshotBuilder.js';
import { isNonNullable } from '@finos/legend-shared';

export function _groupByAggCols(
  groupBy: DataCubeQuerySnapshotGroupBy | undefined,
  configuration: DataCubeConfiguration,
) {
  return configuration.columns
    .filter(
      (column) =>
        column.kind === DataCubeColumnKind.MEASURE &&
        !groupBy?.columns.find((col) => col.name === column.name),
    )
    .map(
      (column) =>
        groupBy?.aggColumns.find((col) => col.name === column.name) ??
        _defaultAggCol(column.name, column.type),
    )
    .filter(isNonNullable);
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
    snapshot.data.groupBy = {
      columns: request.rowGroupCols.map((col) => ({
        name: col.id,
        type: _getCol(availableCols, col.id).type,
      })),
      aggColumns: _groupByAggCols(baseSnapshot.data.groupBy, configuration),
    };
  } else {
    snapshot.data.groupBy = undefined;
  }

  // --------------------------------- SORT ---------------------------------

  snapshot.data.sortColumns = request.sortModel.map((item) => ({
    ..._getCol(baseSnapshot.stageCols('sort'), item.colId),
    operation:
      item.sort === GridClientSortDirection.ASCENDING
        ? DataCubeQuerySortOperator.ASCENDING
        : DataCubeQuerySortOperator.DESCENDING,
  }));

  // --------------------------------- FINALIZE ---------------------------------

  return snapshot.finalize();
}
