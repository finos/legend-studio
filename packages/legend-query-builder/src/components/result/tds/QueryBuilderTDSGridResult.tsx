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

import { clsx } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../../../stores/QueryBuilderState.js';
import type { TDSExecutionResult } from '@finos/legend-graph';
import { isBoolean, type PlainObject } from '@finos/legend-shared';
import { useState } from 'react';
import {
  DataGrid,
  type DataGridColumnApi,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import {
  getAggregationTDSColumnCustomizations,
  QueryResultCellRenderer,
} from './QueryBuilderTDSResultShared.js';
import type { QueryBuilderResultState } from '../../../stores/QueryBuilderResultState.js';

const getAdvancedColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
  // TODO: fix col return type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): DataGridColumnDefinition<any, any>[] =>
  executionResult.result.columns.map((colName) => {
    const col = {
      minWidth: 50,
      sortable: true,
      resizable: true,
      field: colName,
      flex: 1,
      enablePivot: true,
      enableRowGroup: true,
      enableValue: true,
      ...getAggregationTDSColumnCustomizations(executionResult, colName),
    } as DataGridColumnDefinition;
    const persistedColumn = resultState.gridConfig.columns.find(
      (c) => c.colId === colName,
    );
    if (persistedColumn) {
      if (persistedColumn.width) {
        col.width = persistedColumn.width;
      }
      col.pinned = persistedColumn.pinned ?? null;
      col.rowGroup = persistedColumn.rowGroup ?? false;
      col.rowGroupIndex = persistedColumn.rowGroupIndex ?? null;
      col.aggFunc = persistedColumn.aggFunc ?? null;
      col.pivot = persistedColumn.pivot ?? false;
      col.hide = persistedColumn.hide ?? false;
    }
    return col;
  });

const TODO_getColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
  // TODO: fix col return type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): DataGridColumnDefinition<any, any>[] =>
  executionResult.result.columns.map(
    (colName) =>
      ({
        minWidth: 50,
        sortable: true,
        resizable: true,
        field: colName,
        flex: 1,
        cellRenderer: QueryResultCellRenderer,
        cellRendererParams: {
          resultState: resultState,
          tdsExecutionResult: executionResult,
        },
      }) as DataGridColumnDefinition,
  );

export const QueryBuilderTDSGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;

    const [columnAPi, setColumnApi] = useState<DataGridColumnApi | undefined>(
      undefined,
    );
    const resultState = queryBuilderState.resultState;
    const isAdvancedModeEnabled = queryBuilderState.isAdvancedModeEnabled;
    const colDefs = isAdvancedModeEnabled
      ? getAdvancedColDefs(executionResult, resultState)
      : TODO_getColDefs(executionResult, resultState);

    const rowData = executionResult.result.rows.map((_row, rowIdx) => {
      const row: PlainObject = {};
      const cols = executionResult.result.columns;
      _row.values.forEach((value, colIdx) => {
        // `ag-grid` shows `false` value as empty string so we have
        // call `.toString()` to avoid this behavior.
        // See https://github.com/finos/legend-studio/issues/1008
        row[cols[colIdx] as string] = isBoolean(value) ? String(value) : value;
      });

      row.rowNumber = rowIdx;
      return row;
    });
    const onSaveGridColumnState = (): void => {
      if (!columnAPi) {
        return;
      }
      resultState.setGridConfig({
        columns: columnAPi.getColumnState(),
        isPivotModeEnabled: columnAPi.isPivotMode(),
      });
    };

    return (
      <div className="query-builder__result__values__table">
        <div
          className={clsx(
            'ag-theme-balham-dark query-builder__result__tds-grid',
          )}
        >
          {isAdvancedModeEnabled ? (
            <DataGrid
              rowData={rowData}
              onGridReady={(params): void => {
                setColumnApi(params.columnApi);
                params.columnApi.setPivotMode(
                  resultState.gridConfig.isPivotModeEnabled,
                );
              }}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => data.data.rowNumber,
                rowSelection: 'multiple',
                pivotPanelShow: 'always',
                rowGroupPanelShow: 'always',
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={colDefs}
              sideBar={['columns', 'filters']}
              onColumnVisible={onSaveGridColumnState}
              onColumnPinned={onSaveGridColumnState}
              onColumnResized={onSaveGridColumnState}
              onColumnRowGroupChanged={onSaveGridColumnState}
              onColumnValueChanged={onSaveGridColumnState}
              onColumnPivotChanged={onSaveGridColumnState}
              onColumnPivotModeChanged={onSaveGridColumnState}
            />
          ) : (
            <DataGrid
              rowData={rowData}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => data.data.rowNumber,
                rowSelection: 'multiple',
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={true}
              columnDefs={colDefs}
            />
          )}
        </div>
      </div>
    );
  },
);
