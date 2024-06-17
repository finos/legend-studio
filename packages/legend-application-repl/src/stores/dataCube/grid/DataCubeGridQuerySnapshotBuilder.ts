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
 * These are utilities used to build the query snapshot from server-side row
 * model requests are fired when the grid client, AG Grid, is modified.
 ***************************************************************************************/

import type { IServerSideGetRowsRequest } from '@ag-grid-community/core';
import {
  type DataCubeQuerySnapshotFilter,
  type DataCubeQuerySnapshotFilterCondition,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotAggregateColumn,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotSortColumn,
  DataCubeQuerySnapshotSortDirection,
  DataCubeQuerySnapshotFilterOperation,
  DataCubeQueryFilterGroupOperation,
  _getCol,
  DataCubeQuerySnapshotAggregateFunction,
} from '../core/DataCubeQuerySnapshot.js';
import {
  IllegalStateError,
  deepEqual,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  GridClientAggregateOperation,
  GridClientSortDirection,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';

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
  let createNew = false;

  // --------------------------------- GROUP BY ---------------------------------

  const groupByExpandedKeys = request.groupKeys;
  const groupByAvailableColumns = baseSnapshot.stageCols('aggregation');
  const groupByColumns: DataCubeQuerySnapshotColumn[] =
    request.rowGroupCols.map((col) => ({
      name: col.id,
      type: _getCol(groupByAvailableColumns, col.id).type,
    }));
  const groupByAggColumns: DataCubeQuerySnapshotAggregateColumn[] =
    request.valueCols
      .filter((col) => isNonNullable(col.field) && isNonNullable(col.aggFunc))
      .map((col) => ({
        name: guaranteeNonNullable(col.field),
        type: _getCol(groupByAvailableColumns, guaranteeNonNullable(col.field))
          .type,
        function: _aggFunc(col.aggFunc as GridClientAggregateOperation),
      }));

  let groupByFilter: DataCubeQuerySnapshotFilter | undefined;
  for (let i = 0; i < groupByExpandedKeys.length; i++) {
    const groupFilter = {
      conditions: [
        {
          name: guaranteeNonNullable(groupByColumns[i]).name,
          type: PRIMITIVE_TYPE.STRING,
          operation: DataCubeQuerySnapshotFilterOperation.EQUAL,
          value: groupByExpandedKeys[i],
        } as DataCubeQuerySnapshotFilterCondition,
      ],
      groupOperation: DataCubeQueryFilterGroupOperation.AND,
    };

    groupByFilter = groupFilter;
  }

  // --------------------------------- SORT ---------------------------------

  const newSortColumns: DataCubeQuerySnapshotSortColumn[] =
    request.sortModel.map((sortInfo) => {
      const column = guaranteeNonNullable(
        baseSnapshot.data.selectColumns.find(
          (col) => col.name === sortInfo.colId,
        ),
      );
      return {
        name: sortInfo.colId,
        type: column.type,
        direction:
          sortInfo.sort === GridClientSortDirection.ASCENDING
            ? DataCubeQuerySnapshotSortDirection.ASCENDING
            : DataCubeQuerySnapshotSortDirection.DESCENDING,
      };
    });

  if (
    !deepEqual(newSortColumns, baseSnapshot.data.sortColumns) ||
    !deepEqual(groupByExpandedKeys, baseSnapshot.data.groupBy?.expandedKeys) ||
    !deepEqual(groupByColumns, baseSnapshot.data.groupBy?.columns) ||
    !deepEqual(groupByAggColumns, baseSnapshot.data.groupBy?.aggColumns) ||
    !deepEqual(groupByFilter, baseSnapshot.data.groupBy?.filter)
  ) {
    createNew = true;
  }

  // --------------------------------- SELECT ---------------------------------
  // TODO: @akphi - Implement this

  // --------------------------------- FINALIZE ---------------------------------

  if (createNew) {
    const newSnapshot = baseSnapshot.clone();
    const data = newSnapshot.data;
    data.sortColumns = newSortColumns;
    data.groupBy = {
      columns: groupByColumns,
      aggColumns: groupByAggColumns,
      expandedKeys: groupByExpandedKeys,
      filter: groupByFilter,
    };
    return newSnapshot;
  }
  return baseSnapshot;
}
