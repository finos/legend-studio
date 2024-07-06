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
  INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
  INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME,
  generateFontFamilyUtilityClassName,
  generateFontSizeUtilityClassName,
  generateFontUnderlineUtilityClassName,
  generateTextAlignUtilityClassName,
  generateTextColorUtilityClassName,
  generateBackgroundColorUtilityClassName,
  generateFontCaseUtilityClassName,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  IllegalStateError,
  isNumber,
} from '@finos/legend-shared';
import type {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';
import {
  DataCubeColumnDataType,
  DataCubeNumberScale,
  DEFAULT_ROW_BUFFER,
  getDataType,
} from '../core/DataCubeQueryEngine.js';
import type { CustomLoadingCellRendererProps } from '@ag-grid-community/react';
import { DataCubeIcon } from '@finos/legend-art';

// --------------------------------- UTILITIES ---------------------------------

// See https://www.ag-grid.com/javascript-data-grid/cell-data-types/
function _cellDataType(column: DataCubeQuerySnapshotColumn) {
  switch (column.type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return 'number';
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return 'dateString';
    case PRIMITIVE_TYPE.STRING:
    default:
      return 'text';
  }
}

function _allowedAggFuncs(column: DataCubeQuerySnapshotColumn) {
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

function scaleNumber(
  value: number,
  type: DataCubeNumberScale | undefined,
): { value: number; unit: string | undefined } {
  switch (type) {
    case DataCubeNumberScale.PERCENT:
      return { value: value * 1e2, unit: '%' };
    case DataCubeNumberScale.BASIS_POINT:
      return { value: value * 1e4, unit: 'bp' };
    case DataCubeNumberScale.THOUSANDS:
      return { value: value / 1e3, unit: 'k' };
    case DataCubeNumberScale.MILLIONS:
      return { value: value / 1e6, unit: 'm' };
    case DataCubeNumberScale.BILLIONS:
      return { value: value / 1e9, unit: 'b' };
    case DataCubeNumberScale.TRILLIONS:
      return { value: value / 1e12, unit: 't' };
    case DataCubeNumberScale.AUTO:
      return scaleNumber(
        value,
        value >= 1e12
          ? DataCubeNumberScale.TRILLIONS
          : value >= 1e9
            ? DataCubeNumberScale.BILLIONS
            : value >= 1e6
              ? DataCubeNumberScale.MILLIONS
              : value >= 1e3
                ? DataCubeNumberScale.THOUSANDS
                : undefined,
      );
    default:
      return { value, unit: undefined };
  }
}

// --------------------------------- BUILDING BLOCKS ---------------------------------

type ColumnData = {
  snapshot: DataCubeQuerySnapshot;
  column: DataCubeQuerySnapshotColumn;
  configuration: DataCubeColumnConfiguration;
  gridConfiguration: DataCubeConfiguration;
};

function _displaySpec(columnData: ColumnData) {
  const { column, configuration, gridConfiguration } = columnData;
  const dataType = getDataType(column.type);
  const fontFamily =
    configuration.fontFamily ?? gridConfiguration.defaultFontFamily;
  const fontSize = configuration.fontSize ?? gridConfiguration.defaultFontSize;
  const fontBold = configuration.fontBold ?? gridConfiguration.defaultFontBold;
  const fontItalic =
    configuration.fontItalic ?? gridConfiguration.defaultFontItalic;
  const fontStrikethrough =
    configuration.fontStrikethrough ??
    gridConfiguration.defaultFontStrikethrough;
  const fontUnderline =
    configuration.fontUnderline ?? gridConfiguration.defaultFontUnderline;
  const fontCase = configuration.fontCase ?? gridConfiguration.defaultFontCase;
  const textAlign =
    configuration.textAlign ?? gridConfiguration.defaultTextAlign;
  const foregroundColor =
    configuration.foregroundColor ?? gridConfiguration.defaultForegroundColor;
  const backgroundColor =
    configuration.backgroundColor ?? gridConfiguration.defaultBackgroundColor;
  const negativeForegroundColor =
    configuration.negativeForegroundColor ??
    gridConfiguration.defaultNegativeForegroundColor;
  const negativeBackgroundColor =
    configuration.negativeBackgroundColor ??
    gridConfiguration.defaultNegativeBackgroundColor;
  const zeroForegroundColor =
    configuration.zeroForegroundColor ??
    gridConfiguration.defaultZeroForegroundColor;
  const zeroBackgroundColor =
    configuration.zeroBackgroundColor ??
    gridConfiguration.defaultZeroBackgroundColor;
  const errorForegroundColor =
    configuration.errorForegroundColor ??
    gridConfiguration.defaultErrorForegroundColor;
  const errorBackgroundColor =
    configuration.errorBackgroundColor ??
    gridConfiguration.defaultErrorBackgroundColor;
  return {
    // setting the cell data type might helps guide the grid to render the cell properly
    // and optimize the grid performance slightly by avoiding unnecessary type inference
    cellDataType: _cellDataType(column),
    valueFormatter:
      dataType === DataCubeColumnDataType.NUMBER
        ? (params) => {
            const value = params.value as number | null | undefined;
            if (value === null || value === undefined) {
              return null;
            }
            const showNegativeNumberInParens =
              configuration.negativeNumberInParens && value < 0;
            // 1. apply the number scale
            const scaledNumber = scaleNumber(value, configuration.numberScale);
            // 2. apply the number formatter
            const formattedValue = (
              showNegativeNumberInParens
                ? Math.abs(scaledNumber.value)
                : scaledNumber.value
            ).toLocaleString(undefined, {
              useGrouping: configuration.displayCommas,
              ...(configuration.decimals !== undefined
                ? {
                    minimumFractionDigits: configuration.decimals,
                    maximumFractionDigits: configuration.decimals,
                  }
                : {}),
            });
            // 3. add the parentheses (and then the unit)
            return (
              (showNegativeNumberInParens
                ? `(${formattedValue})`
                : formattedValue) +
              (scaledNumber.unit ? ` ${scaledNumber.unit}` : '')
            );
          }
        : (params) => params.value,
    loadingCellRenderer: (props: CustomLoadingCellRendererProps) => {
      if (props.node.failedLoad) {
        return <span className="inline-flex items-center">#ERR</span>;
      }
      return (
        <span className="inline-flex items-center">
          <DataCubeIcon.Loader className="mr-1 animate-spin stroke-2" />
          Loading
        </span>
      );
    },
    cellClassRules: {
      [generateFontFamilyUtilityClassName(fontFamily)]: () => true,
      [generateFontSizeUtilityClassName(fontSize)]: () => true,
      [INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_BOLD]: () => fontBold,
      [INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_ITALIC]: () =>
        fontItalic,
      [INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_STRIKETHROUGH]: () =>
        fontStrikethrough,
      [generateFontUnderlineUtilityClassName(fontUnderline)]: () =>
        Boolean(fontUnderline),
      [generateFontCaseUtilityClassName(fontCase)]: (params) =>
        dataType === DataCubeColumnDataType.TEXT && Boolean(fontCase),
      [generateTextAlignUtilityClassName(textAlign)]: () => true,
      [generateTextColorUtilityClassName(foregroundColor, undefined)]: () =>
        true,
      [generateBackgroundColorUtilityClassName(backgroundColor, undefined)]:
        () => true,
      [generateTextColorUtilityClassName(zeroForegroundColor, 'zero')]: (
        params,
      ) =>
        dataType === DataCubeColumnDataType.NUMBER &&
        isNumber(params.value) &&
        params.value === 0,
      [generateBackgroundColorUtilityClassName(zeroBackgroundColor, 'zero')]: (
        params,
      ) =>
        dataType === DataCubeColumnDataType.NUMBER &&
        isNumber(params.value) &&
        params.value === 0,
      [generateTextColorUtilityClassName(negativeForegroundColor, 'negative')]:
        (params) =>
          dataType === DataCubeColumnDataType.NUMBER &&
          isNumber(params.value) &&
          params.value < 0,
      [generateBackgroundColorUtilityClassName(
        negativeBackgroundColor,
        'negative',
      )]: (params) =>
        dataType === DataCubeColumnDataType.NUMBER &&
        isNumber(params.value) &&
        params.value < 0,
      [generateTextColorUtilityClassName(errorForegroundColor, 'error')]: (
        params,
      ) => params.node.failedLoad,
      [generateBackgroundColorUtilityClassName(errorBackgroundColor, 'error')]:
        (params) => params.node.failedLoad,
      [INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.BLUR]: () =>
        configuration.blur,
    },
  } as ColDef;
}

function _sizeSpec(columnData: ColumnData) {
  const { configuration } = columnData;
  return {
    // NOTE: there is a problem with ag-grid when scrolling horizontally, the header row
    // lags behind the data, it seems to be caused by synchronizing scroll not working properly
    // There is currently, no way around this
    // See https://github.com/ag-grid/ag-grid/issues/5233
    // See https://github.com/ag-grid/ag-grid/issues/7620
    // See https://github.com/ag-grid/ag-grid/issues/6292
    // See https://issues.chromium.org/issues/40890343#comment11
    //
    // TODO: if we support column resize to fit content, should we disable this behavior?
    resizable: configuration.fixedWidth === undefined,
    // suppressAutoSize: columnConfiguration.fixedWidth !== undefined,
    width: configuration.fixedWidth,
    minWidth: Math.max(
      configuration.minWidth ?? INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
      INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
    ),
    maxWidth: configuration.maxWidth,
  } as ColDef;
}

function _sortSpec(columnData: ColumnData) {
  const { snapshot, column } = columnData;
  const sortColumns = snapshot.data.sortColumns;
  const sortCol = _findCol(sortColumns, column.name);
  return {
    sortable: true, // if this is pivot column, no sorting is allowed
    sort: sortCol
      ? sortCol.operation === DataCubeQuerySnapshotSortOperation.ASCENDING
        ? GridClientSortDirection.ASCENDING
        : GridClientSortDirection.DESCENDING
      : null,
    sortIndex: sortCol ? sortColumns.indexOf(sortCol) : null,
  } as ColDef;
}

function _rowGroupSpec(columnData: ColumnData) {
  const { snapshot, column } = columnData;
  const data = snapshot.data;
  const columns = snapshot.stageCols('aggregation');
  const rowGroupColumn = _findCol(columns, column.name);
  const groupByCol = _findCol(data.groupBy?.columns, column.name);
  const aggCol = _findCol(data.groupBy?.aggColumns, column.name);
  return {
    enableRowGroup: true,
    enableValue: true,
    rowGroup: Boolean(groupByCol),
    // TODO: @akphi - add this from configuration object
    aggFunc: aggCol
      ? _aggFunc(aggCol.function)
      : rowGroupColumn
        ? (
            [
              PRIMITIVE_TYPE.NUMBER,
              PRIMITIVE_TYPE.DECIMAL,
              PRIMITIVE_TYPE.FLOAT,
              PRIMITIVE_TYPE.INTEGER,
            ] as string[]
          ).includes(rowGroupColumn.type)
          ? GridClientAggregateOperation.SUM
          : null
        : null,
    // TODO: @akphi - add this from configuration object
    allowedAggFuncs: rowGroupColumn ? _allowedAggFuncs(rowGroupColumn) : [],
  } satisfies ColDef;
}

// --------------------------------- MAIN ---------------------------------

export function generateGridOptionsFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
): GridOptions {
  const data = snapshot.data;
  const gridOptions = {
    /**
     * NOTE: there is a strange issue where if we put dynamic configuration directly
     * such as rowClassRules which depends on some changing state (e.g. alternateRows)
     * as the grid component's props, the grid performance will be heavily compromised
     * while if we programatically set it like this, it does not seem so taxing to the
     * performance; perhaps something to do with React component rendering on props change
     * so in general for grid options which are not static, we must configure them here
     */
    rowClassRules: configuration.alternateRows
      ? {
          [INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.HIGHLIGHT_ROW]: (
            params,
          ) =>
            params.rowIndex % (configuration.alternateRowsCount * 2) >=
            configuration.alternateRowsCount,
        }
      : null,
    rowBuffer: DEFAULT_ROW_BUFFER,
    // -------------------------------------- COLUMNS --------------------------------------
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
      // TODO: handle pivot and column grouping
      ...data.selectColumns.map((column) => {
        const columnData = {
          snapshot,
          column,
          configuration: guaranteeNonNullable(
            configuration.columns.find((col) => col.name === column.name),
          ),
          gridConfiguration: configuration,
        };
        return {
          headerName: column.name,
          field: column.name,
          menuTabs: [],

          ..._displaySpec(columnData),
          ..._sizeSpec(columnData),
          ..._sortSpec(columnData),
          ..._rowGroupSpec(columnData),
        } satisfies ColDef | ColGroupDef;
      }),
    ],
  } as GridOptions;

  return gridOptions;
}
