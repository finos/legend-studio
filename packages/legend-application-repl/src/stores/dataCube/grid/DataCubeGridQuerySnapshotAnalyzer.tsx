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
  DataCubeQuerySnapshotAggregateFunction,
  DataCubeQuerySnapshotSortOperation,
  _findCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type { ColDef, ColGroupDef, GridOptions } from '@ag-grid-community/core';
import {
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
  GridClientAggregateOperation,
  GridClientSortDirection,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { IllegalStateError } from '@finos/legend-shared';

// --------------------------------- UTILITIES ---------------------------------

function _allowedAggFuncs(column: DataCubeQuerySnapshotColumn): string[] {
  switch (column.type) {
    case PRIMITIVE_TYPE.STRING:
      return [];
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return [];
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return [
        GridClientAggregateOperation.AVERAGE,
        GridClientAggregateOperation.COUNT,
        GridClientAggregateOperation.SUM,
        GridClientAggregateOperation.MAX,
        GridClientAggregateOperation.MIN,
      ];
    default:
      return [];
  }
}

function _aggFunc(
  func: DataCubeQuerySnapshotAggregateFunction,
): GridClientAggregateOperation {
  switch (func) {
    case DataCubeQuerySnapshotAggregateFunction.AVERAGE:
      return GridClientAggregateOperation.AVERAGE;
    case DataCubeQuerySnapshotAggregateFunction.COUNT:
      return GridClientAggregateOperation.COUNT;
    case DataCubeQuerySnapshotAggregateFunction.MAX:
      return GridClientAggregateOperation.MAX;
    case DataCubeQuerySnapshotAggregateFunction.MIN:
      return GridClientAggregateOperation.MIN;
    case DataCubeQuerySnapshotAggregateFunction.SUM:
      return GridClientAggregateOperation.SUM;
    default:
      throw new IllegalStateError(`Unsupported aggregate function '${func}'`);
  }
}

// --------------------------------- BUILDING BLOCKS ---------------------------------

function _sortSpec(snapshot: DataCubeQuerySnapshot, colName: string) {
  const sortColumns = snapshot.data.sortColumns;
  const sortCol = _findCol(sortColumns, colName);
  if (!sortCol) {
    return {
      sort: null,
      sortIndex: null,
    };
  }
  return {
    sort:
      sortCol.operation === DataCubeQuerySnapshotSortOperation.ASCENDING
        ? GridClientSortDirection.ASCENDING
        : GridClientSortDirection.DESCENDING,
    sortIndex: sortColumns.indexOf(sortCol),
  } satisfies ColDef;
}

function _rowGroupSpec(snapshot: DataCubeQuerySnapshot, colName: string) {
  const data = snapshot.data;
  const columns = snapshot.stageCols('aggregation');
  const column = _findCol(columns, colName);
  const groupByCol = _findCol(data.groupBy?.columns, colName);
  const aggCol = _findCol(data.groupBy?.aggColumns, colName);
  return {
    rowGroup: Boolean(groupByCol),
    // TODO: @akphi - add this from configuration object
    aggFunc: aggCol
      ? _aggFunc(aggCol.function)
      : column
        ? (
            [
              PRIMITIVE_TYPE.NUMBER,
              PRIMITIVE_TYPE.DECIMAL,
              PRIMITIVE_TYPE.FLOAT,
              PRIMITIVE_TYPE.INTEGER,
            ] as string[]
          ).includes(column.type)
          ? GridClientAggregateOperation.SUM
          : null
        : null,
    // TODO: @akphi - add this from configuration object
    allowedAggFuncs: column ? _allowedAggFuncs(column) : [],
  } satisfies ColDef;
}

export function generateGridOptionsFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
): GridOptions {
  const data = snapshot.data;
  const gridOptions: GridOptions = {
    columnDefs: [
      {
        headerName: '',
        colId: INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
        cellRenderer: 'agGroupCellRenderer',
        // cellRendererParams: {
        //   innerRenderer: (params: ICellRendererParams) => (
        //     <>
        //       <span>{params.value}</span>
        //       {Boolean(
        //         params.data[
        //           INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID
        //         ],
        //       ) && (
        //         <span>{`(${params.data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID]})`}</span>
        //       )}
        //     </>
        //   ),
        //   suppressCount: true,
        // } satisfies IGroupCellRendererParams,
        showRowGroup: true,
        hide: !snapshot.data.groupBy,
        lockPinned: true,
        lockPosition: true,
        cellStyle: {
          flex: 1,
          justifyContent: 'space-between',
          display: 'flex',
        },
        sortable: false, // TODO: @akphi - we can support this in the configuration
      } satisfies ColDef,
      ...data.selectColumns.map(
        (col) =>
          ({
            headerName: col.name,
            field: col.name,

            // TODO: configure
            flex: 1, // when the column supposed to fill the remainig space of the grid
            resizable: true,
            minWidth: 50,

            sortable: true, // if this is pivot column, no sorting is allowed
            enableRowGroup: true,
            enableValue: true,
            menuTabs: ['generalMenuTab', 'columnsMenuTab'],
            ..._sortSpec(snapshot, col.name),
            ..._rowGroupSpec(snapshot, col.name),
          }) satisfies ColDef | ColGroupDef,
      ),
    ],
  };

  return gridOptions;
}
