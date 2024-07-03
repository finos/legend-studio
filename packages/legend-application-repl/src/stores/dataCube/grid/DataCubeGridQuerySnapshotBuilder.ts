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
  DataCubeQuerySnapshotSortOperation,
  _getCol,
  DataCubeQuerySnapshotAggregateFunction,
} from '../core/DataCubeQuerySnapshot.js';
import {
  IllegalStateError,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  GridClientAggregateOperation,
  GridClientSortDirection,
} from './DataCubeGridClientEngine.js';

// --------------------------------- UTILITIES ---------------------------------

function _aggFunc(
  func: GridClientAggregateOperation,
): DataCubeQuerySnapshotAggregateFunction {
  switch (func) {
    case GridClientAggregateOperation.AVERAGE:
      return DataCubeQuerySnapshotAggregateFunction.AVERAGE;
    case GridClientAggregateOperation.COUNT:
      return DataCubeQuerySnapshotAggregateFunction.COUNT;
    case GridClientAggregateOperation.MAX:
      return DataCubeQuerySnapshotAggregateFunction.MAX;
    case GridClientAggregateOperation.MIN:
      return DataCubeQuerySnapshotAggregateFunction.MIN;
    case GridClientAggregateOperation.SUM:
      return DataCubeQuerySnapshotAggregateFunction.SUM;
    default:
      throw new IllegalStateError(`Unsupported aggregate function '${func}'`);
  }
}

// --------------------------------- MAIN ---------------------------------

export function buildQuerySnapshot(
  request: IServerSideGetRowsRequest,
  baseSnapshot: DataCubeQuerySnapshot,
): DataCubeQuerySnapshot {
  const snapshot = baseSnapshot.clone();

  // --------------------------------- SELECT ---------------------------------
  // TODO: @akphi - Implement this

  // --------------------------------- GROUP BY ---------------------------------

  if (request.rowGroupCols.length) {
    const availableCols = baseSnapshot.stageCols('aggregation');
    snapshot.data.groupBy = {
      columns: request.rowGroupCols.map((col) => ({
        name: col.id,
        type: _getCol(availableCols, col.id).type,
      })),
      aggColumns: request.valueCols
        .filter((col) => isNonNullable(col.field) && isNonNullable(col.aggFunc))
        .map((col) => ({
          name: guaranteeNonNullable(col.field),
          type: _getCol(availableCols, guaranteeNonNullable(col.field)).type,
          function: _aggFunc(col.aggFunc as GridClientAggregateOperation),
        })),
    };
  } else {
    snapshot.data.groupBy = undefined;
  }

  // --------------------------------- SORT ---------------------------------

  snapshot.data.sortColumns = request.sortModel.map((item) => ({
    ..._getCol(baseSnapshot.stageCols('sort'), item.colId),
    operation:
      item.sort === GridClientSortDirection.ASCENDING
        ? DataCubeQuerySnapshotSortOperation.ASCENDING
        : DataCubeQuerySnapshotSortOperation.DESCENDING,
  }));

  // --------------------------------- FINALIZE ---------------------------------

  return snapshot.finalize();
}
