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
 * These are utilities used to build the configuration for the grid client,
 * AG Grid, from the query snapshot.
 ***************************************************************************************/

import {
  DataCubeQuerySnapshotSortDirection,
  type DataCubeQuerySnapshot,
} from '../core/DataCubeQuerySnapshot.js';
import type { GridOptions } from '@ag-grid-community/core';
import { GridClientSortDirection } from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';

function buildColumnSortSpecification(
  colName: string,
  snapshot: DataCubeQuerySnapshot,
) {
  const sortCol = snapshot.sortColumns.find((c) => c.name === colName);
  if (!sortCol) {
    return {
      sort: null,
      sortIndex: null,
    };
  }
  return {
    sort:
      sortCol.direction === DataCubeQuerySnapshotSortDirection.ASCENDING
        ? GridClientSortDirection.ASCENDING
        : GridClientSortDirection.DESCENDING,
    sortIndex: snapshot.sortColumns.indexOf(sortCol),
  };
}

function getAggregationColumnCustomizations(
  colName: string,
  snapshot: DataCubeQuerySnapshot,
): string[] {
  // TODO: @akphi - revist this, we should not use `selectColumns` here, or maybe a combination?
  const columnType = snapshot.selectColumns.find(
    (col) => col.name === colName,
  )?.type;
  switch (columnType) {
    case PRIMITIVE_TYPE.STRING:
      return [];
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return [];
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return ['count', 'sum', 'max', 'min', 'avg'];
    default:
      return [];
  }
}

function buildColumnGroupBySpecification(
  colName: string,
  snapshot: DataCubeQuerySnapshot,
) {
  const rowGroup = snapshot.groupByColumns.find((c) => c.name === colName);
  const aggColumn = snapshot.groupByAggColumns.find((c) => c.name === colName);
  return {
    rowGroup: Boolean(rowGroup),
    hide: Boolean(rowGroup),
    aggFunc: aggColumn ? aggColumn.function : null,
    allowedAggFuncs: getAggregationColumnCustomizations(colName, snapshot),
  };
}

export function generateGridOptionsFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
): GridOptions {
  const gridOptions: GridOptions = {
    columnDefs: snapshot.selectColumns.map((col) => ({
      headerName: col.name,
      field: col.name,
      ...buildColumnSortSpecification(col.name, snapshot),

      // configurable
      minWidth: 50,
      sortable: true,
      flex: 1,
      resizable: true,
      enableRowGroup: true,
      enableValue: true,
      menuTabs: ['generalMenuTab', 'columnsMenuTab'],
      ...buildColumnGroupBySpecification(col.name, snapshot),
    })),
  };
  return gridOptions;
}
