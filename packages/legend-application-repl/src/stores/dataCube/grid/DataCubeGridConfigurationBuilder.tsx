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
  _findCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from '../core/DataCubeQuerySnapshot.js';
import type {
  ColDef,
  ColGroupDef,
  GridOptions,
  ICellRendererParams,
} from '@ag-grid-community/core';
import {
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
  GridClientSortDirection,
  INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
  INTERNAL__GridClientUtilityCssClassName,
  generateFontFamilyUtilityClassName,
  generateFontSizeUtilityClassName,
  generateFontUnderlineUtilityClassName,
  generateTextAlignUtilityClassName,
  generateTextColorUtilityClassName,
  generateBackgroundColorUtilityClassName,
  generateFontCaseUtilityClassName,
  GridClientPinnedAlignement,
  INTERNAL__GRID_CLIENT_ROW_HEIGHT,
  INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING,
  INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
  INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY,
  INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH,
  INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
  INTERNAL__GRID_CLIENT_FILTER_TRIGGER_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  getQueryParameters,
  getQueryParameterValue,
  isNonNullable,
  isNullable,
  isNumber,
  isValidUrl,
} from '@finos/legend-shared';
import type {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../core/DataCubeConfiguration.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnPinPlacement,
  DataCubeNumberScale,
  DEFAULT_ROW_BUFFER,
  DEFAULT_URL_LABEL_QUERY_PARAM,
  getDataType,
  DataCubeQuerySortOperator,
  DataCubeColumnKind,
  DEFAULT_MISSING_VALUE_DISPLAY_TEXT,
} from '../core/DataCubeQueryEngine.js';
import type { CustomLoadingCellRendererProps } from '@ag-grid-community/react';
import { DataCubeIcon } from '@finos/legend-art';
import type { DataCubeState } from '../DataCubeState.js';

// --------------------------------- UTILITIES ---------------------------------

// See https://www.ag-grid.com/react-data-grid/cell-data-types/
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

function DataCubeGridLoadingCellRenderer(
  props: CustomLoadingCellRendererProps,
) {
  if (props.node.failedLoad) {
    return <span className="inline-flex items-center">#ERR</span>;
  }
  return (
    <span className="inline-flex items-center">
      <DataCubeIcon.Loader className="mr-1 animate-spin stroke-2" />
      Loading
    </span>
  );
}

// --------------------------------- BUILDING BLOCKS ---------------------------------

type ColumnData = {
  snapshot: DataCubeQuerySnapshot;
  column: DataCubeColumnConfiguration;
  configuration: DataCubeConfiguration;
};

function getCellRenderer(columnData: ColumnData) {
  const { column } = columnData;
  const dataType = getDataType(column.type);
  if (dataType === DataCubeColumnDataType.TEXT && column.displayAsLink) {
    return function LinkRenderer(params: ICellRendererParams) {
      const isUrl = isValidUrl(params.value);
      if (!isUrl) {
        return params.value;
      }
      const url = params.value as string;
      const label = getQueryParameterValue(
        column.linkLabelParameter ?? DEFAULT_URL_LABEL_QUERY_PARAM,
        getQueryParameters(url, true),
      );
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {label ?? url}
        </a>
      );
    };
  }
  return null;
}

function _displaySpec(columnData: ColumnData) {
  const { column, configuration } = columnData;
  const dataType = getDataType(column.type);
  const fontFamily = column.fontFamily ?? configuration.fontFamily;
  const fontSize = column.fontSize ?? configuration.fontSize;
  const fontBold = column.fontBold ?? configuration.fontBold;
  const fontItalic = column.fontItalic ?? configuration.fontItalic;
  const fontStrikethrough =
    column.fontStrikethrough ?? configuration.fontStrikethrough;
  const fontUnderline = column.fontUnderline ?? configuration.fontUnderline;
  const fontCase = column.fontCase ?? configuration.fontCase;
  const textAlign = column.textAlign ?? configuration.textAlign;
  const normalForegroundColor =
    column.normalForegroundColor ?? configuration.normalForegroundColor;
  const normalBackgroundColor =
    column.normalBackgroundColor ?? configuration.normalBackgroundColor;
  const negativeForegroundColor =
    column.negativeForegroundColor ?? configuration.negativeForegroundColor;
  const negativeBackgroundColor =
    column.negativeBackgroundColor ?? configuration.negativeBackgroundColor;
  const zeroForegroundColor =
    column.zeroForegroundColor ?? configuration.zeroForegroundColor;
  const zeroBackgroundColor =
    column.zeroBackgroundColor ?? configuration.zeroBackgroundColor;
  const errorForegroundColor =
    column.errorForegroundColor ?? configuration.errorForegroundColor;
  const errorBackgroundColor =
    column.errorBackgroundColor ?? configuration.errorBackgroundColor;
  const cellRenderer = getCellRenderer(columnData);
  return {
    // setting the cell data type might helps guide the grid to render the cell properly
    // and optimize the grid performance slightly by avoiding unnecessary type inference
    cellDataType: _cellDataType(column),
    hide: column.hideFromView,
    valueFormatter:
      dataType === DataCubeColumnDataType.NUMBER
        ? (params) => {
            const value = params.value as number | null | undefined;
            if (
              isNullable(value) ||
              (value as unknown as string) ===
                INTERNAL__GRID_CLIENT_MISSING_VALUE
            ) {
              return (
                column.missingValueDisplayText ??
                DEFAULT_MISSING_VALUE_DISPLAY_TEXT
              );
            }
            const showNegativeNumberInParens =
              column.negativeNumberInParens && value < 0;
            // 1. apply the number scale
            const scaledNumber = scaleNumber(value, column.numberScale);
            // 2. apply the number formatter
            const formattedValue = (
              showNegativeNumberInParens
                ? Math.abs(scaledNumber.value)
                : scaledNumber.value
            ).toLocaleString(undefined, {
              useGrouping: column.displayCommas,
              ...(column.decimals !== undefined
                ? {
                    minimumFractionDigits: column.decimals,
                    maximumFractionDigits: column.decimals,
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
        : (params) =>
            params.value === INTERNAL__GRID_CLIENT_MISSING_VALUE
              ? (column.missingValueDisplayText ??
                DEFAULT_MISSING_VALUE_DISPLAY_TEXT)
              : params.value,
    loadingCellRenderer: DataCubeGridLoadingCellRenderer,
    cellClassRules: {
      [generateFontFamilyUtilityClassName(fontFamily)]: () => true,
      [generateFontSizeUtilityClassName(fontSize)]: () => true,
      [INTERNAL__GridClientUtilityCssClassName.FONT_BOLD]: () => fontBold,
      [INTERNAL__GridClientUtilityCssClassName.FONT_ITALIC]: () => fontItalic,
      [INTERNAL__GridClientUtilityCssClassName.FONT_STRIKETHROUGH]: () =>
        fontStrikethrough,
      [generateFontUnderlineUtilityClassName(fontUnderline)]: () =>
        Boolean(fontUnderline),
      [generateFontCaseUtilityClassName(fontCase)]: (params) =>
        dataType === DataCubeColumnDataType.TEXT && Boolean(fontCase),
      [generateTextAlignUtilityClassName(textAlign)]: () => true,
      [generateTextColorUtilityClassName(normalForegroundColor, 'normal')]:
        () => true,
      [generateBackgroundColorUtilityClassName(
        normalBackgroundColor,
        'normal',
      )]: () => true,
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
      [INTERNAL__GridClientUtilityCssClassName.BLUR]: () => column.blur,
    },
    cellRenderer: cellRenderer,
    pinned:
      column.pinned !== undefined
        ? column.pinned === DataCubeColumnPinPlacement.RIGHT
          ? GridClientPinnedAlignement.RIGHT
          : GridClientPinnedAlignement.LEFT
        : null,
    tooltipValueGetter: (params) =>
      isNonNullable(params.value) &&
      params.value !== INTERNAL__GRID_CLIENT_MISSING_VALUE
        ? `Value = ${params.value === '' ? "''" : params.value === true ? 'TRUE' : params.value === false ? 'FALSE' : params.value}`
        : `Missing Value`,
  } as ColDef;
}

function _sizeSpec(columnData: ColumnData) {
  const { column } = columnData;
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
    resizable: column.fixedWidth === undefined,
    // suppressAutoSize: columnConfiguration.fixedWidth !== undefined,
    width: column.fixedWidth,
    minWidth: Math.max(
      column.minWidth ?? INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
      INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
    ),
    maxWidth: column.maxWidth,
  } as ColDef;
}

function _sortSpec(columnData: ColumnData) {
  const { snapshot, column } = columnData;
  const sortColumns = snapshot.data.sortColumns;
  const sortCol = _findCol(sortColumns, column.name);
  return {
    sortable: true, // if this is pivot column, no sorting is supported yet
    sort: sortCol
      ? sortCol.operation === DataCubeQuerySortOperator.ASCENDING
        ? GridClientSortDirection.ASCENDING
        : GridClientSortDirection.DESCENDING
      : null,
    sortIndex: sortCol ? sortColumns.indexOf(sortCol) : null,
  } as ColDef;
}

function _rowGroupSpec(columnData: ColumnData) {
  const { snapshot, column } = columnData;
  const data = snapshot.data;
  const groupByCol = _findCol(data.groupBy?.columns, column.name);
  return {
    enableRowGroup: column.kind === DataCubeColumnKind.DIMENSION,
    enableValue: column.kind === DataCubeColumnKind.MEASURE,
    rowGroup: Boolean(groupByCol),
    rowGroupIndex: groupByCol
      ? (data.groupBy?.columns.indexOf(groupByCol) ?? null)
      : null,
    // NOTE: we don't quite care about populating these accurately
    // since ag-grid aggregation does not support parameters, so
    // its set of supported aggregators will never match that specified
    // in the editor.
    // But we need to set this to make sure sorting works when row grouping
    // is used, so we use a dummy value here.
    aggFunc: 'sum',
    allowedAggFuncs: [],
  } satisfies ColDef;
}

// --------------------------------- MAIN ---------------------------------

export function generateBaseGridOptions(dataCube: DataCubeState): GridOptions {
  const grid = dataCube.grid;

  return {
    // -------------------------------------- README --------------------------------------
    // NOTE: we observe performance degradataion when configuring the grid via React component
    // props when the options is non-static, i.e. changed when the query configuration changes.
    // As such, we must ONLY ADD STATIC CONFIGURATION HERE, and dynamic configuration should be
    // programatically updated when the query is modified.
    //
    //
    // -------------------------------------- ROW GROUPING --------------------------------------
    rowGroupPanelShow: 'always',
    groupDisplayType: 'custom', // keeps the column set stable even when row grouping is used
    suppressRowGroupHidesColumns: true, // keeps the column set stable even when row grouping is used
    suppressAggFuncInHeader: true, //  keeps the columns stable when aggregation is used
    // purgeClosedRowNodes: true, // remove closed row nodes from the cache to allow reloading failed rows? - or should we have declarative action to retry?
    getChildCount: (data) =>
      data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID],
    // -------------------------------------- PIVOT --------------------------------------
    // pivotPanelShow: "always"
    // pivotMode:true, // TODO: need to make sure we don't hide away any columns when this is enabled
    // -------------------------------------- SORT --------------------------------------
    // Force multi-sorting since this is what the query supports anyway
    alwaysMultiSort: true,
    // -------------------------------------- DISPLAY --------------------------------------
    rowHeight: INTERNAL__GRID_CLIENT_ROW_HEIGHT,
    headerHeight: INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
    suppressBrowserResizeObserver: true,
    noRowsOverlayComponent: () => (
      <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-medium text-neutral-400">
        <div>
          <DataCubeIcon.WarningCircle className="mr-1 stroke-2 text-lg" />
        </div>
        0 rows
      </div>
    ),
    loadingOverlayComponent: () => (
      <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-medium text-neutral-400">
        <div>
          <DataCubeIcon.Loader className="mr-1 animate-spin stroke-2 text-lg" />
        </div>
        Loading...
      </div>
    ),
    // Show cursor position when scrolling
    onBodyScroll: (event) => {
      const rowCount = event.api.getDisplayedRowCount();
      const range = event.api.getVerticalPixelRange();
      const start = Math.max(
        1,
        Math.ceil(range.top / INTERNAL__GRID_CLIENT_ROW_HEIGHT) + 1,
      );
      const end = Math.min(
        rowCount,
        Math.floor(range.bottom / INTERNAL__GRID_CLIENT_ROW_HEIGHT),
      );
      grid.setScrollHintText(`${start}-${end}/${rowCount}`);
      event.api.hidePopupMenu(); // hide context-menu while scrolling
    },
    onBodyScrollEnd: () => grid.setScrollHintText(undefined),
    scrollbarWidth: 10,
    // -------------------------------------- CONTEXT MENU --------------------------------------
    preventDefaultOnContextMenu: true, // prevent showing the browser's context menu
    columnMenu: 'new', // ensure context menu works on header
    // NOTE: dynamically generate the content of the context menu to make sure the items are not stale
    getContextMenuItems: (params) =>
      grid.controller.menuBuilder?.(params) ?? [],
    getMainMenuItems: (params) => grid.controller.menuBuilder?.(params) ?? [],
    // -------------------------------------- COLUMN SIZING --------------------------------------
    autoSizePadding: INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING,
    autoSizeStrategy: {
      // resize to fit content initially
      type: 'fitCellContents',
    },
    // -------------------------------------- TOOLTIP --------------------------------------
    tooltipShowDelay: INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY,
    tooltipInteraction: true,
    // -------------------------------------- COLUMN MOVING --------------------------------------
    suppressDragLeaveHidesColumns: true, // disable this since it's quite easy to accidentally hide columns while moving
    // -------------------------------------- SERVER SIDE ROW MODEL --------------------------------------
    suppressScrollOnNewData: true,
    suppressServerSideFullWidthLoadingRow: true, // make sure each column has its own loading indicator instead of the whole row
    // -------------------------------------- SELECTION --------------------------------------
    enableRangeSelection: true,
    // -------------------------------------- SIDEBAR --------------------------------------
    sideBar: {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          minWidth: INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH,
          width: INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH,
          toolPanelParams: {
            suppressValues: true,
            // TODO: enable when we support pivot
            suppressPivotMode: true,
            suppressPivots: true,
          },
        },
      ],
      position: 'right',
    },
    allowDragFromColumnsToolPanel: true,
    // -------------------------------------- PERFORMANCE --------------------------------------
    animateRows: false, // improve performance
    suppressColumnMoveAnimation: true, // improve performance
  };
}

export function generateGridOptionsFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  dataCube: DataCubeState,
): GridOptions {
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
          [INTERNAL__GridClientUtilityCssClassName.HIGHLIGHT_ROW]: (params) =>
            params.rowIndex % (configuration.alternateRowsCount * 2) >=
            configuration.alternateRowsCount,
        }
      : null,
    rowBuffer: DEFAULT_ROW_BUFFER,

    // -------------------------------------- EVENT HANDLERS --------------------------------------

    onColumnPinned: (event) => {
      if (event.column) {
        const column = event.column;
        const pinned = column.getPinned();
        dataCube.grid.controller.pinColumn(
          column.getColId(),
          pinned === null
            ? undefined
            : pinned === GridClientPinnedAlignement.LEFT
              ? DataCubeColumnPinPlacement.LEFT
              : DataCubeColumnPinPlacement.RIGHT,
        );
      }
    },

    onColumnMoved: (event) => {
      // make sure the move event is finished before syncing the changes
      if (event.column && event.finished) {
        dataCube.grid.controller.rearrangeColumns(
          (event.api.getColumnDefs() ?? [])
            .filter((col): col is ColDef => !('children' in col))
            .map((col) => col.colId ?? ''),
        );
      }
    },

    onColumnVisible: (event) => {
      if (event.column) {
        const column = event.column;
        const isVisible = column.isVisible();
        dataCube.grid.controller.showColumn(column.getColId(), isVisible);
      }
    },

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
        pinned: GridClientPinnedAlignement.LEFT,
        cellStyle: {
          flex: 1,
          justifyContent: 'space-between',
          display: 'flex',
        },
        // TODO: display: coloring, text, etc.
        // TODO: pinning (should we pin this left by default?)
        // TODO: tooltip
        loadingCellRenderer: DataCubeGridLoadingCellRenderer,
        // TODO: @akphi - we can support this in the configuration (support sorting by tree-column?)
        // sortable: false,
      } satisfies ColDef,
      // NOTE: Internal column used for programatically trigger data fetch when filter is modified
      {
        colId: INTERNAL__GRID_CLIENT_FILTER_TRIGGER_COLUMN_ID,
        hide: true,
        enableValue: false,
        enablePivot: false,
        enableRowGroup: false,
        filter: 'agTextColumnFilter',
        suppressColumnsToolPanel: true,
      },
      // TODO: handle pivot and column grouping
      ...configuration.columns.map((column) => {
        const columnData = {
          snapshot,
          column,
          configuration,
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
