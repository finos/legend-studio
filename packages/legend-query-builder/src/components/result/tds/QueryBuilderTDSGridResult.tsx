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
import { useState, useCallback } from 'react';
import {
  DataGrid,
  type DataGridApi,
  type DataGridCellRange,
  type DataGridColumnApi,
  type DataGridColumnDefinition,
  type DataGridGetContextMenuItemsParams,
  type DataGridIRowNode,
  type DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import {
  getAggregationTDSColumnCustomizations,
  getRowDataFromExecutionResult,
  type IQueryRendererParamsWithGridType,
  filterByOrOutValues,
} from './QueryBuilderTDSResultShared.js';
import type {
  QueryBuilderResultState,
  QueryBuilderTDSResultCellData,
  QueryBuilderTDSResultCellDataType,
  QueryBuilderTDSRowDataType,
} from '../../../stores/QueryBuilderResultState.js';
import { QueryBuilderTDSState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { DEFAULT_LOCALE } from '../../../graph-manager/QueryBuilderConst.js';
import { isNumber, isString, isValidURL } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';

const getAdvancedColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
): DataGridColumnDefinition<
  QueryBuilderTDSRowDataType,
  QueryBuilderTDSResultCellDataType
>[] =>
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

const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const resultState = params.resultState;
    const cellValue = params.value as QueryBuilderTDSResultCellDataType;
    const formattedCellValue = (): QueryBuilderTDSResultCellDataType => {
      if (isNumber(cellValue)) {
        return Intl.NumberFormat(DEFAULT_LOCALE, {
          maximumFractionDigits: 4,
        }).format(Number(cellValue));
      }
      return cellValue;
    };
    const cellValueUrlLink =
      isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;

    const mouseDown: React.MouseEventHandler = (event) => {
      event.preventDefault();
      if (event.button === 0 || event.button === 2) {
        resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
      }
    };
    const mouseUp: React.MouseEventHandler = (event) => {
      resultState.setIsSelectingCells(false);
    };
    const mouseOver: React.MouseEventHandler = (event) => {
      resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
    };
    return (
      <div
        className={clsx('query-builder__result__values__table__cell')}
        onMouseDown={(event) => mouseDown(event)}
        onMouseUp={(event) => mouseUp(event)}
        onMouseOver={(event) => mouseOver(event)}
      >
        {cellValueUrlLink ? (
          <a href={cellValueUrlLink} target="_blank" rel="noreferrer">
            {cellValueUrlLink}
          </a>
        ) : (
          <span>{formattedCellValue()}</span>
        )}
      </div>
    );
  },
);

const getColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
): DataGridColumnDefinition<
  QueryBuilderTDSRowDataType,
  QueryBuilderTDSResultCellDataType
>[] =>
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
    const applicationStore = useApplicationStore();
    const [columnAPi, setColumnApi] = useState<DataGridColumnApi | undefined>(
      undefined,
    );
    const resultState = queryBuilderState.resultState;
    const isAdvancedModeEnabled = queryBuilderState.isAdvancedModeEnabled;
    const colDefs = isAdvancedModeEnabled
      ? getAdvancedColDefs(executionResult, resultState)
      : getColDefs(executionResult, resultState);

    const onSaveGridColumnState = (): void => {
      if (!columnAPi) {
        return;
      }
      resultState.setGridConfig({
        columns: columnAPi.getColumnState(),
        isPivotModeEnabled: columnAPi.isPivotMode(),
      });
    };

    const getSelectedCells = (
      api: DataGridApi<QueryBuilderTDSRowDataType>,
    ): QueryBuilderTDSResultCellData[] => {
      const selectedRanges: DataGridCellRange[] | null = api.getCellRanges();
      const nodes = api.getRenderedNodes();
      const columns = api.getColumnDefs() as DataGridColumnDefinition[];
      const selectedCells = [];
      if (selectedRanges) {
        for (const selectedRange of selectedRanges) {
          const startRow: number = selectedRange.startRow?.rowIndex ?? 0;
          const endRow: number = selectedRange.endRow?.rowIndex ?? 0;
          const selectedColumns: string[] = selectedRange.columns.map((col) =>
            col.getColId(),
          );
          for (let x: number = startRow; x <= endRow; x++) {
            const curRowData = nodes.find(
              (n) => (n as DataGridIRowNode).rowIndex === x,
            )?.data;
            if (curRowData) {
              for (const col of selectedColumns) {
                const valueAndColumnId = {
                  value: Object.entries(curRowData)
                    .find((rData) => rData[0] === col)
                    ?.at(1),
                  columnName: col,
                  coordinates: {
                    rowIndex: x,
                    colIndex: columns.findIndex(
                      (colDef) => colDef.colId === col,
                    ),
                  },
                } as QueryBuilderTDSResultCellData;
                selectedCells.push(valueAndColumnId);
              }
            }
          }
        }
      }
      return selectedCells;
    };

    const getContextMenuItems = useCallback(
      (
        params: DataGridGetContextMenuItemsParams<QueryBuilderTDSRowDataType>,
      ): (string | DataGridMenuItemDef)[] => {
        let result: (string | DataGridMenuItemDef)[] = [];
        const fetchStructureImplementation =
          resultState.queryBuilderState.fetchStructureState.implementation;
        if (fetchStructureImplementation instanceof QueryBuilderTDSState) {
          result = [
            {
              name: 'Filter by',
              action: () => {
                filterByOrOutValues(
                  applicationStore,
                  resultState.mousedOverCell,
                  true,
                  fetchStructureImplementation,
                );
              },
            },
            {
              name: 'Filter out',
              action: () => {
                filterByOrOutValues(
                  applicationStore,
                  resultState.mousedOverCell,
                  false,
                  fetchStructureImplementation,
                );
              },
            },
            'copy',
            'copyWithHeaders',
            {
              name: 'Copy row value',
              action: () => {
                params.api.copySelectedRowsToClipboard();
              },
            },
          ];
        }
        return result;
      },
      [
        applicationStore,
        resultState.mousedOverCell,
        resultState.queryBuilderState.fetchStructureState.implementation,
      ],
    );

    return (
      <div className="query-builder__result__values__table">
        <div
          className={clsx(
            'ag-theme-balham-dark query-builder__result__tds-grid',
          )}
        >
          {isAdvancedModeEnabled ? (
            <DataGrid
              rowData={getRowDataFromExecutionResult(executionResult)}
              onGridReady={(params): void => {
                setColumnApi(params.columnApi);
                params.columnApi.setPivotMode(
                  resultState.gridConfig.isPivotModeEnabled,
                );
              }}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => data.data.rowNumber as string,
                rowSelection: 'multiple',
                pivotPanelShow: 'always',
                rowGroupPanelShow: 'always',
                enableRangeSelection: true,
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
              rowData={getRowDataFromExecutionResult(executionResult)}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => data.data.rowNumber as string,
                rowSelection: 'multiple',
                enableRangeSelection: true,
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              onRangeSelectionChanged={(event) => {
                const selectedCells = getSelectedCells(event.api);
                resultState.setSelectedCells([]);
                selectedCells.forEach((cell) =>
                  resultState.addSelectedCell(cell),
                );
              }}
              suppressFieldDotNotation={true}
              suppressClipboardPaste={false}
              suppressContextMenu={false}
              columnDefs={colDefs}
              getContextMenuItems={(params): (string | DataGridMenuItemDef)[] =>
                getContextMenuItems(params)
              }
            />
          )}
        </div>
      </div>
    );
  },
);
