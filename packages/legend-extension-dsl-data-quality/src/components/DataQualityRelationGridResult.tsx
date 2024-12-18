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
import type { TDSExecutionResult } from '@finos/legend-graph';
import type {
  DataQualityRelationResultCellDataType,
  DataQualityRelationResultState,
  DataQualityRelationRowDataType,
} from './states/DataQualityRelationResultState.js';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import {
  getTDSColumnCustomizations,
  getFilterTDSColumnCustomizations,
} from '@finos/legend-query-builder';
import {
  isBoolean,
  isNumber,
  isString,
  isValidURL,
} from '@finos/legend-shared';
import { clsx } from '@finos/legend-art';
import {
  type DataGridGetContextMenuItemsParams,
  type DataGridMenuItemDef,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  DataGrid,
  type DataGridDefaultMenuItem,
} from '@finos/legend-lego/data-grid';

import { useCallback } from 'react';

export const DEFAULT_LOCALE = 'en-US';
export const MAXIMUM_FRACTION_DIGITS = 4;

export type IRelationValidationRendererParamsWithGridType =
  DataGridCellRendererParams & {
    resultState: DataQualityRelationResultState;
    tdsExecutionResult: TDSExecutionResult;
  };

export const getRowDataFromExecutionResult = (
  executionResult: TDSExecutionResult,
): DataQualityRelationRowDataType[] => {
  const rowData = executionResult.result.rows.map((_row, rowIdx) => {
    const row: DataQualityRelationRowDataType = {};
    const cols = executionResult.result.columns;
    _row.values.forEach((value, colIdx) => {
      row[cols[colIdx] as string] = value;
    });
    row.rowNumber = rowIdx;
    return row;
  });
  return rowData;
};

const DataQualityResultCellRenderer = observer(
  (params: IRelationValidationRendererParamsWithGridType) => {
    const cellValue = params.value as DataQualityRelationResultCellDataType;

    const formattedCellValue = (): DataQualityRelationResultCellDataType => {
      if (isNumber(cellValue)) {
        return Intl.NumberFormat(DEFAULT_LOCALE, {
          maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
        }).format(Number(cellValue));
      } else if (isBoolean(cellValue)) {
        return String(cellValue);
      }
      return cellValue;
    };
    const cellValueUrlLink =
      isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;

    return (
      <div className="data-quality-validation__result__values__table__cell">
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

export const DataQualityRelationGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    relationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { executionResult, relationValidationConfigurationState } = props;
    const resultState = relationValidationConfigurationState.resultState;
    const darkMode =
      !relationValidationConfigurationState.editorStore.applicationStore
        .layoutService.TEMPORARY__isLightColorThemeEnabled;
    const colDefs = executionResult.result.columns.map(
      (colName) =>
        ({
          minWidth: 50,
          sortable: true,
          resizable: true,
          field: colName,
          flex: 1,
          ...getTDSColumnCustomizations(executionResult, colName),
          ...getFilterTDSColumnCustomizations(executionResult, colName),
          cellRenderer: DataQualityResultCellRenderer,
          cellRendererParams: {
            resultState: resultState,
            tdsExecutionResult: executionResult,
          },
        }) as DataGridColumnDefinition,
    );

    const getContextMenuItems = useCallback(
      (
        params: DataGridGetContextMenuItemsParams<DataQualityRelationRowDataType>,
      ): (DataGridDefaultMenuItem | DataGridMenuItemDef)[] => {
        return [
          'copy',
          'copyWithHeaders',
          {
            name: 'Copy Row Value',
            action: () => {
              params.api.copySelectedRowsToClipboard();
            },
          },
        ];
      },
      [],
    );

    return (
      <div className="data-quality-validation__result__values__table">
        <div
          className={clsx('data-quality-validation__result__tds-grid', {
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          <DataGrid
            rowData={getRowDataFromExecutionResult(executionResult)}
            gridOptions={{
              suppressScrollOnNewData: true,
              getRowId: (data) => `${data.data.rowNumber}`,
              rowSelection: {
                mode: 'multiRow',
                checkboxes: false,
                headerCheckbox: false,
              },
            }}
            // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
            // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressContextMenu={false}
            columnDefs={colDefs}
            getContextMenuItems={(params) => getContextMenuItems(params)}
          />
        </div>
      </div>
    );
  },
);
