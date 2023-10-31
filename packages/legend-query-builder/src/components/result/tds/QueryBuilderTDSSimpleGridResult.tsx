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
import {
  DataGrid,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { QueryResultCellRenderer } from './QueryBuilderTDSResultShared.js';

export const QueryBuilderTDSSimpleGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    const resultState = queryBuilderState.resultState;
    const colDefs = executionResult.result.columns.map(
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

    return (
      <div className="query-builder__result__values__table">
        <div
          className={clsx(
            'ag-theme-balham-dark query-builder__result__tds-grid',
          )}
        >
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
            suppressContextMenu={false}
            columnDefs={colDefs}
          />
        </div>
      </div>
    );
  },
);
