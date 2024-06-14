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
  cloneSnapshot,
  type DataCubeQueryFilter,
  type DataCubeQuerySnapshotFilterCondition,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotAggregateColumn,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotSortColumn,
  DataCubeQuerySnapshotSortDirection,
  DataCubeQuerySnapshotFilterOperation,
} from '../core/DataCubeQuerySnapshot.js';
import { deepEqual, guaranteeNonNullable } from '@finos/legend-shared';
import { DATA_CUBE_FUNCTION } from '../DataCubeMetaModelConst.js';
import { GridClientSortDirection } from './DataCubeGridClientEngine.js';
import {
  PRIMITIVE_TYPE,
  extractElementNameFromPath,
} from '@finos/legend-graph';

export function buildQuerySnapshot(
  request: IServerSideGetRowsRequest,
  baseSnapshot: DataCubeQuerySnapshot,
): DataCubeQuerySnapshot {
  let createNew = false;

  // --------------------------------- GROUP BY ---------------------------------

  const groupByExpandedKeys = request.groupKeys;
  const groupByColumns = request.rowGroupCols.map((r) => {
    // TODO: @akphi - revist this, we should not use `selectColumns` here, or maybe a combination?
    const column = baseSnapshot.selectColumns.find((col) => col.name === r.id);
    return {
      name: r.id,
      type: guaranteeNonNullable(column).type,
    } as DataCubeQuerySnapshotColumn;
  });
  const groupByAggColumns = request.valueCols.map((v) => {
    // TODO: @akphi - revist this, we should not use `selectColumns` here, or maybe a combination?
    const type = baseSnapshot.selectColumns.find(
      (col) => col.name === v.field,
    )?.type;
    return {
      name: v.field,
      type: type,
      function: v.aggFunc,
    } as DataCubeQuerySnapshotAggregateColumn;
  });
  let groupByFilter: DataCubeQueryFilter | undefined;

  for (let index = 0; index < groupByExpandedKeys.length; index++) {
    const groupFilter = {
      conditions: [
        {
          name: guaranteeNonNullable(groupByColumns.at(index)).name,
          type: PRIMITIVE_TYPE.STRING,
          operation: DataCubeQuerySnapshotFilterOperation.EQUAL,
          value: groupByExpandedKeys.at(index),
        } as DataCubeQuerySnapshotFilterCondition,
      ],
      groupOperation: extractElementNameFromPath(DATA_CUBE_FUNCTION.AND),
    } as DataCubeQueryFilter;

    groupByFilter = groupFilter;
  }

  // --------------------------------- SORT ---------------------------------

  const newSortColumns: DataCubeQuerySnapshotSortColumn[] =
    request.sortModel.map((sortInfo) => {
      const column = guaranteeNonNullable(
        baseSnapshot.selectColumns.find((col) => col.name === sortInfo.colId),
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
    !deepEqual(newSortColumns, baseSnapshot.sortColumns) ||
    !deepEqual(groupByExpandedKeys, baseSnapshot.groupByExpandedKeys) ||
    !deepEqual(groupByColumns, baseSnapshot.groupByColumns) ||
    !deepEqual(groupByAggColumns, baseSnapshot.groupByAggColumns) ||
    !deepEqual(groupByFilter, baseSnapshot.groupByFilter)
  ) {
    createNew = true;
  }

  // --------------------------------- SELECT ---------------------------------
  // TODO: @akphi - Implement this

  // --------------------------------- FINALIZE ---------------------------------

  if (createNew) {
    const newSnapshot = cloneSnapshot(baseSnapshot);
    newSnapshot.sortColumns = newSortColumns;
    newSnapshot.groupByExpandedKeys = groupByExpandedKeys;
    newSnapshot.groupByColumns = groupByColumns;
    newSnapshot.groupByAggColumns = groupByAggColumns;
    newSnapshot.groupByFilter = groupByFilter;
    return newSnapshot;
  }
  return baseSnapshot;
}
