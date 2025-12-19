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

import { observer } from 'mobx-react-lite';
import { BlankPanelContent, clsx } from '@finos/legend-art';
import { useCallback } from 'react';
import {
  at,
  isString,
  parseCSVString,
  isNonNullable,
  isNumber,
  isValidURL,
} from '@finos/legend-shared';

import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridDefaultMenuItem,
  type DataGridGetContextMenuItemsParams,
  type DataGridMenuItemDef,
} from '../data-grid/DataGrid.js';

const parseExecutionResultData = (
  data: string,
): { rowData: Record<string, string>[]; columns: string[] } | undefined => {
  const lines = data.split('\n').filter((line) => line.trim().length);
  if (lines.length) {
    const columns = parseCSVString(at(lines, 0)) ?? [];
    const rowData = lines
      .slice(1)
      .map((item) => {
        const rowItems = parseCSVString(item);
        if (!rowItems) {
          return undefined;
        }
        const row: Record<string, string> = {};
        columns.forEach((column, idx) => {
          row[column] = rowItems[idx] ?? '';
        });
        return row;
      })
      .filter(isNonNullable);
    return { rowData, columns };
  }
  return undefined;
};

const TDSResultCellRenderer = observer((params: DataGridCellRendererParams) => {
  const cellValue = params.value as string;
  const formattedCellValue = (): string => {
    if (isNumber(cellValue)) {
      return Intl.NumberFormat('en-US', {
        maximumFractionDigits: 4,
      }).format(Number(cellValue));
    }
    return cellValue;
  };
  const cellValueUrlLink =
    isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;

  return (
    <div className={clsx('query-builder__result__values__table__cell')}>
      {cellValueUrlLink ? (
        <a href={cellValueUrlLink} target="_blank" rel="noreferrer">
          {cellValueUrlLink}
        </a>
      ) : (
        <span>{formattedCellValue()}</span>
      )}
    </div>
  );
});

export const PlayGroundSQLExecutionResultGrid = observer(
  (props: {
    result: string;
    useAdvancedGrid?: boolean;
    useLocalMode?: boolean;
    enableDarkMode?: boolean;
  }) => {
    const {
      result,
      useAdvancedGrid,
      useLocalMode,
      enableDarkMode = false,
    } = props;
    const data = parseExecutionResultData(result);
    const darkMode = enableDarkMode;

    if (!data) {
      return (
        <BlankPanelContent>{`Can't parse result, displaying raw form:\n${result}`}</BlankPanelContent>
      );
    }
    if (useAdvancedGrid) {
      if (useLocalMode) {
        const localcolDefs = data.columns.map(
          (colName) =>
            ({
              minWidth: 150,
              sortable: true,
              resizable: true,
              field: colName,
              flex: 1,
              enablePivot: true,
              enableRowGroup: true,
              enableValue: true,
              allowedAggFuncs: ['count'],
            }) as DataGridColumnDefinition,
        );

        return (
          <div
            className={clsx('sql-playground__result__grid', {
              'ag-theme-balham': !darkMode,
              'ag-theme-balham-dark': darkMode,
            })}
          >
            <DataGrid
              rowData={data.rowData}
              gridOptions={{
                suppressScrollOnNewData: true,
                rowSelection: {
                  mode: 'multiRow',
                  checkboxes: false,
                  headerCheckbox: false,
                },
                pivotPanelShow: 'always',
                rowGroupPanelShow: 'always',
                cellSelection: true,
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={localcolDefs}
              sideBar={['columns', 'filters']}
            />
          </div>
        );
      }
      const colDefs = data.columns.map(
        (colName) =>
          ({
            minWidth: 150,
            sortable: true,
            resizable: true,
            field: colName,
            flex: 1,
            cellRenderer: TDSResultCellRenderer,
            filter: true,
          }) as DataGridColumnDefinition,
      );
      const getContextMenuItems = useCallback(
        (
          params: DataGridGetContextMenuItemsParams<{
            [key: string]: string;
          }>,
        ): (DataGridDefaultMenuItem | DataGridMenuItemDef)[] => [
          'copy',
          'copyWithHeaders',
          {
            name: 'Copy Row Value',
            action: () => {
              params.api.copySelectedRowsToClipboard();
            },
          },
        ],
        [],
      );
      return (
        <div
          className={clsx('sql-playground__result__grid', {
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          <DataGrid
            rowData={data.rowData}
            overlayNoRowsTemplate={`<div class="sql-playground__result__grid--empty">No results</div>`}
            gridOptions={{
              suppressScrollOnNewData: true,
              rowSelection: {
                mode: 'multiRow',
                checkboxes: false,
                headerCheckbox: false,
              },
              cellSelection: true,
            }}
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressClipboardPaste={false}
            suppressContextMenu={false}
            columnDefs={colDefs}
            getContextMenuItems={(params) => getContextMenuItems(params)}
          />
        </div>
      );
    }

    return (
      <div
        className={clsx('sql-playground__result__grid', {
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
      >
        <DataGrid
          rowData={data.rowData}
          overlayNoRowsTemplate={`<div class="sql-playground__result__grid--empty">No results</div>`}
          alwaysShowVerticalScroll={true}
          suppressFieldDotNotation={true}
          columnDefs={data.columns.map((column) => ({
            minWidth: 150,
            sortable: true,
            resizable: true,
            headerName: column,
            field: column,
            flex: 1,
          }))}
        />
      </div>
    );
  },
);
