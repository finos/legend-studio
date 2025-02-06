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
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotPivot,
} from '../../core/DataCubeQuerySnapshot.js';
import {
  _findCol,
  _toCol,
  type DataCubeColumn,
} from '../../core/model/DataCubeColumn.js';
import type {
  ColDef,
  ColGroupDef,
  GridOptions,
  ICellRendererParams,
} from 'ag-grid-community';
import {
  DataCubeGridClientSortDirection,
  INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
  INTERNAL__GridClientUtilityCssClassName,
  generateFontFamilyUtilityClassName,
  generateFontSizeUtilityClassName,
  generateFontUnderlineUtilityClassName,
  generateTextAlignUtilityClassName,
  generateTextColorUtilityClassName,
  generateBackgroundColorUtilityClassName,
  generateFontCaseUtilityClassName,
  DataCubeGridClientPinnedAlignement,
  INTERNAL__GRID_CLIENT_ROW_HEIGHT,
  INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING,
  INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
  INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY,
  INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH,
  INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
  INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID,
  INTERNAL__GRID_CLIENT_PIVOT_COLUMN_GROUP_COLOR_ROTATION_SIZE,
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
  INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import {
  at,
  getQueryParameters,
  getQueryParameterValue,
  isNonNullable,
  isNullable,
  isNumber,
  isValidUrl,
  assertTrue,
} from '@finos/legend-shared';
import type {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../../core/model/DataCubeConfiguration.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnPinPlacement,
  DataCubeNumberScale,
  DEFAULT_URL_LABEL_QUERY_PARAM,
  getDataType,
  DataCubeQuerySortDirection,
  DataCubeColumnKind,
  DEFAULT_MISSING_VALUE_DISPLAY_TEXT,
  PIVOT_COLUMN_NAME_VALUE_SEPARATOR,
  isPivotResultColumnName,
  TREE_COLUMN_VALUE_SEPARATOR,
  DEFAULT_ROOT_AGGREGATION_COLUMN_VALUE,
} from '../../core/DataCubeQueryEngine.js';
import type { CustomLoadingCellRendererProps } from 'ag-grid-react';
import { DataCubeIcon } from '@finos/legend-art';
import type { DataCubeViewState } from '../DataCubeViewState.js';

// --------------------------------- UTILITIES ---------------------------------

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
  name: string;
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
  const { name, snapshot, column, configuration } = columnData;
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
  return {
    // disabling cell data type inference can grid performance
    // especially when this information is only necessary for cell value editor
    cellDataType: false,
    hide:
      column.hideFromView ||
      !column.isSelected ||
      (Boolean(
        snapshot.data.pivot && !_findCol(snapshot.data.pivot.castColumns, name),
      ) &&
        !_findCol(snapshot.data.groupExtendedColumns, name)),
    lockVisible:
      !column.isSelected ||
      (Boolean(
        snapshot.data.pivot && !_findCol(snapshot.data.pivot.castColumns, name),
      ) &&
        !_findCol(snapshot.data.groupExtendedColumns, name)),
    pinned:
      column.pinned !== undefined
        ? column.pinned === DataCubeColumnPinPlacement.RIGHT
          ? DataCubeGridClientPinnedAlignement.RIGHT
          : DataCubeGridClientPinnedAlignement.LEFT
        : null,
    headerClass: isPivotResultColumnName(name)
      ? 'pl-1 border border-neutral-300'
      : 'pl-1 border border-neutral-200',
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
      ) => Boolean(params.node.failedLoad),
      [generateBackgroundColorUtilityClassName(errorBackgroundColor, 'error')]:
        (params) => Boolean(params.node.failedLoad),
      [INTERNAL__GridClientUtilityCssClassName.BLUR]: () => column.blur,
    },
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
            // 3. add the parentheses, scale unit, unit, etc.
            let displayValue =
              (showNegativeNumberInParens
                ? `(${formattedValue})`
                : formattedValue) +
              (scaledNumber.unit ? ` ${scaledNumber.unit}` : '');
            if (column.unit) {
              displayValue = !column.unit.startsWith('_')
                ? `${displayValue}${column.unit}`
                : `${column.unit.substring(1)}${displayValue}`;
            }
            return displayValue;
          }
        : (params) =>
            params.value === INTERNAL__GRID_CLIENT_MISSING_VALUE
              ? (column.missingValueDisplayText ??
                DEFAULT_MISSING_VALUE_DISPLAY_TEXT)
              : params.value,
    tooltipValueGetter: (params) =>
      isNonNullable(params.value) &&
      params.value !== INTERNAL__GRID_CLIENT_MISSING_VALUE
        ? `Value = ${params.value === '' ? "''" : params.value === true ? 'TRUE' : params.value === false ? 'FALSE' : params.value}`
        : `Missing Value`,
    cellRenderer: getCellRenderer(columnData),
  } satisfies ColDef;
}

function _groupDisplaySpec(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
) {
  // TODO?: we can technically alternate the styling based on the column at various drilldown level
  // but for now,we will simply use the same styling as the (default) grid styling
  const fontFamily = configuration.fontFamily;
  const fontSize = configuration.fontSize;
  const fontBold = configuration.fontBold;
  const fontItalic = configuration.fontItalic;
  const fontStrikethrough = configuration.fontStrikethrough;
  const fontUnderline = configuration.fontUnderline;
  const fontCase = configuration.fontCase;
  const textAlign = configuration.textAlign;
  const normalForegroundColor = configuration.normalForegroundColor;
  const normalBackgroundColor = configuration.normalBackgroundColor;

  return {
    cellDataType: false, // no point in specifying a type here since it can be of multiple types
    hide: !snapshot.data.groupBy,
    lockPosition: true,
    lockPinned: true,
    pinned: DataCubeGridClientPinnedAlignement.LEFT,
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
        Boolean(fontCase),
      [generateTextAlignUtilityClassName(textAlign)]: () => true,
      [generateTextColorUtilityClassName(normalForegroundColor, 'normal')]:
        () => true,
      [generateBackgroundColorUtilityClassName(
        normalBackgroundColor,
        'normal',
      )]: () => true,
    },
    tooltipValueGetter: (params) => {
      if (
        isNonNullable(params.value) &&
        params.value !== INTERNAL__GRID_CLIENT_MISSING_VALUE
      ) {
        return (
          `Group Value = ${params.value === '' ? "''" : params.value === true ? 'TRUE' : params.value === false ? 'FALSE' : params.value}` +
          `${params.data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID] !== undefined ? ` (${params.data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID]})` : ''}`
        );
      }
      return null;
    },
  } satisfies ColDef;
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
    suppressAutoSize: column.fixedWidth !== undefined,
    suppressSizeToFit: column.fixedWidth !== undefined,
    width: column.fixedWidth,
    minWidth: Math.max(
      column.minWidth ?? INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
      INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
    ),
    maxWidth: column.maxWidth,
  } as ColDef;
}

function _sortSpec(columnData: ColumnData) {
  const { name, snapshot } = columnData;
  const sortColumns = snapshot.data.sortColumns;
  const sortCol = _findCol(sortColumns, name);
  return {
    sortable: true, // if this is pivot column, no sorting is supported yet
    sort: sortCol
      ? sortCol.direction === DataCubeQuerySortDirection.ASCENDING
        ? DataCubeGridClientSortDirection.ASCENDING
        : DataCubeGridClientSortDirection.DESCENDING
      : null,
    sortIndex: sortCol ? sortColumns.indexOf(sortCol) : null,
  } satisfies ColDef;
}

function _aggregationSpec(columnData: ColumnData) {
  const { name, snapshot, column, configuration } = columnData;
  const data = snapshot.data;
  const pivotCol = _findCol(data.pivot?.columns, name);
  const groupByCol = _findCol(data.groupBy?.columns, name);
  const isGroupExtendedColumn = Boolean(
    _findCol(data.groupExtendedColumns, name),
  );
  const rowGroupIndex =
    !isGroupExtendedColumn && groupByCol
      ? (data.groupBy?.columns.indexOf(groupByCol) ?? null)
      : null;
  return {
    enableRowGroup:
      !isGroupExtendedColumn && column.kind === DataCubeColumnKind.DIMENSION,
    rowGroup: !isGroupExtendedColumn && Boolean(groupByCol),
    rowGroupIndex:
      rowGroupIndex !== null
        ? configuration.showRootAggregation
          ? rowGroupIndex + 1
          : rowGroupIndex
        : null,
    enablePivot:
      !isGroupExtendedColumn && column.kind === DataCubeColumnKind.DIMENSION,
    pivot: !isGroupExtendedColumn && Boolean(pivotCol),
    pivotIndex:
      !isGroupExtendedColumn && pivotCol
        ? (data.pivot?.columns.indexOf(pivotCol) ?? null)
        : null,
    // NOTE: we don't quite care about populating these accurately
    // since ag-grid aggregation does not support parameters, so
    // its set of supported aggregators will never match that specified
    // in the editor. But we MUST set this to make sure sorting works
    // when row grouping is used, so we need to set a non-null value here.
    aggFunc: !isGroupExtendedColumn ? column.aggregateOperator : null,
    enableValue: false, // disable GUI interactions to modify this column's aggregate function
    allowedAggFuncs: [], // disable GUI for options of the agg functions
  } satisfies ColDef;
}

// --------------------------------- MAIN ---------------------------------

export function generateBaseGridOptions(view: DataCubeViewState): GridOptions {
  const grid = view.grid;

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
    // use the auto-generated group column to make it work with pivot mode
    // See https://github.com/ag-grid/ag-grid/issues/8088
    groupDisplayType: 'singleColumn',
    suppressGroupChangesColumnVisibility: true, // keeps the column set stable when row grouping is used
    suppressAggFuncInHeader: true, //  keeps the columns stable when aggregation is used
    getChildCount: (data) =>
      data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID],
    // -------------------------------------- PIVOT --------------------------------------
    // NOTE: when enabled, pivot mode will show the pivot panel (allowing drag and drop)
    // and pivot section in column tools panel, but it comes with many restrictions/opinionated
    // behaviors on column grouping: i.e. it disallow full control of column definitions, so we
    // couldn't display dimension columns which are not part of pivot while pivoting.
    //
    // Even setting flag pivotSuppressAutoColumn=true does not seem to remove the column
    // auto-grouping behavior
    //
    // As such, we will just make use of column pivot settings to trigger server-side row
    // model data-fetching when pivot changes, and would opt out from all GUI features
    // that pivot mode offers by disabling pivot mode and will re-assess its usage in the future.
    //
    // pivotMode: Boolean(snapshot.data.pivot),
    // pivotPanelShow: 'always',
    // pivotSuppressAutoColumn: true,
    // -------------------------------------- SORT --------------------------------------
    // Force multi-sorting since this is what the query supports anyway
    alwaysMultiSort: true,
    // -------------------------------------- DISPLAY --------------------------------------
    rowHeight: INTERNAL__GRID_CLIENT_ROW_HEIGHT,
    headerHeight: INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
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
    // -------------------------------------- CONTEXT MENU --------------------------------------
    preventDefaultOnContextMenu: true, // prevent showing the browser's context menu
    columnMenu: 'new', // ensure context menu works on header
    // NOTE: dynamically generate the content of the context menu to make sure the items are not stale
    getContextMenuItems: (params) =>
      grid.controller.menuBuilder?.(params, false) ?? [],
    getMainMenuItems: (params) =>
      grid.controller.menuBuilder?.(params, true) ?? [],
    // NOTE: when right-clicking empty space in the header, a menu will show up
    // with 2 default options: 'Choose Columns` and `Reset Columns`, which is not
    // a desired behavior, so we hide the popup menu immediately
    onColumnMenuVisibleChanged: (event) => {
      if (!event.column) {
        const menuElement = document.querySelector(
          `.${INTERNAL__GridClientUtilityCssClassName.ROOT} .ag-popup .ag-menu`,
        ) as HTMLElement | undefined;
        if (menuElement) {
          menuElement.style.display = 'none';
        }
        event.api.hidePopupMenu();
      }
    },
    // -------------------------------------- COLUMN SIZING --------------------------------------
    autoSizePadding: INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING,
    autoSizeStrategy: {
      type: 'fitCellContents',
    },
    // -------------------------------------- TOOLTIP --------------------------------------
    tooltipShowDelay: INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY,
    // though this is a nice behavior to have enabled, ag-grid not dismissing tooltip
    // when context-menu is triggered makes it an undesirable interaction.
    tooltipInteraction: false,
    // -------------------------------------- COLUMN MOVING --------------------------------------
    suppressDragLeaveHidesColumns: true, // disable this since it's quite easy to accidentally hide columns while moving
    // -------------------------------------- SERVER SIDE ROW MODEL --------------------------------------
    suppressScrollOnNewData: true,
    // NOTE: use row loader instead of showing loader in each cell to improve performance
    // otherwise, when we have many columns (i.e. when pivoting), the app could freeze.
    //
    // This would render the loading cell as the full-width row, which, in combination with
    // fit cell content auto-sizing strategy creates an unwanted row flashing effect while loading.
    // To compensate for that, we modify the styling to make sure the full-width row has a blank background
    loadingCellRenderer: DataCubeGridLoadingCellRenderer,
    // By default, when row-grouping is active, ag-grid's caching mechanism causes sort
    // to not work properly for pivot result columns, so we must disable this mechanism.
    serverSideSortAllLevels: true,
    // -------------------------------------- SELECTION --------------------------------------
    cellSelection: true,
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
            suppressPivotMode: true,
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

function generatePivotResultColumnHeaderTooltip(
  id: string,
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
) {
  const values = id.split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR);
  if (
    !snapshot.data.pivot ||
    values.length > snapshot.data.pivot.columns.length + 1
  ) {
    return values.join(' / ');
  }
  if (values.length === snapshot.data.pivot.columns.length + 1) {
    const baseColumnName = at(values, values.length - 1);
    const columnConfiguration = _findCol(configuration.columns, baseColumnName);
    return `Column = ${
      columnConfiguration
        ? columnConfiguration.displayName
          ? `${columnConfiguration.displayName} (${columnConfiguration.name})`
          : columnConfiguration.name
        : baseColumnName
    } ~ [ ${snapshot.data.pivot.columns.map((col, i) => `${_findCol(configuration.columns, col.name)?.displayName ?? col.name} = ${values[i]}`).join(', ')} ]`;
  }
  return `[ ${snapshot.data.pivot.columns
    .slice(0, values.length)
    .map(
      (col, i) =>
        `${_findCol(configuration.columns, col.name)?.displayName ?? col.name} = ${values[i]}`,
    )
    .join(', ')} ]`;
}

function generateDefinitionForPivotResultColumns(
  pivotResultColumns: DataCubeColumn[],
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
) {
  const columns = pivotResultColumns
    .map((col) => ({
      ...col,
      values: col.name.split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR),
    }))
    .filter((col) => col.values.length > 1);

  const columnDefs: ColGroupDef[] = [];

  columns.forEach((col) => {
    const groups: ColGroupDef[] = [];
    let leaf: ColDef | undefined = undefined;
    let id = '';
    for (let i = 0; i < col.values.length; i++) {
      const value = at(col.values, i);
      id =
        id === ''
          ? at(col.values, i)
          : `${id}${PIVOT_COLUMN_NAME_VALUE_SEPARATOR}${value}`;

      if (i !== col.values.length - 1) {
        groups.push({
          groupId: id,
          children: [],
          suppressColumnsToolPanel: true,
          headerName: value,
          headerTooltip: generatePivotResultColumnHeaderTooltip(
            id,
            snapshot,
            configuration,
          ),
        } satisfies ColGroupDef);
      } else {
        const column = _findCol(configuration.columns, value);
        if (column) {
          const columnData = {
            name: col.name,
            snapshot,
            column,
            configuration,
          };
          leaf = {
            headerName: column.displayName ?? column.name,
            colId: col.name,
            field: col.name,
            menuTabs: [],

            ..._displaySpec(columnData),
            ..._sortSpec(columnData),
            ..._sizeSpec(columnData),

            // disallow pinning and moving pivot result columns
            pinned: false,
            lockPinned: true,
            lockPosition: true,
            suppressColumnsToolPanel: true, // hide from column tool panel
            headerTooltip: generatePivotResultColumnHeaderTooltip(
              id,
              snapshot,
              configuration,
            ),
          } satisfies ColDef;
        }
      }
    }

    let currentCollection: (ColDef | ColGroupDef)[] = columnDefs;
    groups.forEach((group) => {
      const existingGroup = currentCollection.find(
        (collection) =>
          'groupId' in collection && collection.groupId === group.groupId,
      );
      if (existingGroup) {
        currentCollection = (existingGroup as ColGroupDef).children;
      } else {
        const newGroup = {
          ...group,
          headerClass: `${INTERNAL__GridClientUtilityCssClassName.PIVOT_COLUMN_GROUP} ${INTERNAL__GridClientUtilityCssClassName.PIVOT_COLUMN_GROUP_PREFIX}${currentCollection.length % INTERNAL__GRID_CLIENT_PIVOT_COLUMN_GROUP_COLOR_ROTATION_SIZE}`,
        } satisfies ColGroupDef;
        currentCollection.push(newGroup);
        currentCollection = newGroup.children;
      }
    });

    if (leaf) {
      currentCollection.push(leaf);

      // sort the leaf level columns based on the order of selected/configuration columns
      (currentCollection as ColDef[]).sort((a, b) => {
        const colAName = (
          a.colId?.split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR) ?? []
        ).at(-1);
        const colAConf = colAName
          ? _findCol(configuration.columns, colAName)
          : undefined;
        const colBName = (
          b.colId?.split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR) ?? []
        ).at(-1);
        const colBConf = colBName
          ? _findCol(configuration.columns, colBName)
          : undefined;
        return (
          (colAConf
            ? configuration.columns.indexOf(colAConf)
            : Number.MAX_VALUE) -
          (colBConf
            ? configuration.columns.indexOf(colBConf)
            : Number.MAX_VALUE)
        );
      });
    }
  });

  return columnDefs;
}

/**
 * We tried to push-down to the DB level to ensure a particular order
 * for the pivot result columns, we do so by preceding pivot() with a sort().
 *
 * Implementations of pivot() is highly non-standard across different DBs, so
 * this rearranging needs to be done client-side.
 */
function rearrangePivotResultColumns(
  pivotResultColumns: DataCubeColumn[],
  pivotData: DataCubeQuerySnapshotPivot,
  configuration: DataCubeConfiguration,
) {
  try {
    const columns: (DataCubeColumn & { values: string[] })[] = [];
    for (const pivotResultColumn of pivotResultColumns) {
      const column = {
        ...pivotResultColumn,
        values: pivotResultColumn.name
          .split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR)
          .slice(0, -1), // remove the last entry
      };
      assertTrue(column.values.length === pivotData.columns.length);
      columns.push(column);
    }
    const columnConfigs = pivotData.columns
      .map((col) => configuration.getColumn(col.name))
      .filter(isNonNullable);
    assertTrue(columnConfigs.length === pivotData.columns.length);

    // apply multi dimensional sorts by starting from the last pivot column to the first
    for (let i = pivotData.columns.length - 1; i >= 0; i--) {
      const direction =
        columnConfigs[i]?.pivotSortDirection ??
        DataCubeQuerySortDirection.ASCENDING;
      columns.sort((a, b) =>
        direction === DataCubeQuerySortDirection.ASCENDING
          ? at(a.values, i).localeCompare(at(b.values, i))
          : at(b.values, i).localeCompare(at(a.values, i)),
      );
    }

    return columns.map((col) => _toCol(col));
  } catch {
    return pivotResultColumns;
  }
}

export function generateColumnDefs(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
) {
  // NOTE: only show columns which are fetched in select() as we
  // can't solely rely on column selection because of certain restrictions
  // from ag-grid, e.g. in the case of row grouping tree column: the columns
  // which are grouped must be present in the column definitions, so even
  // when some of these might not be selected explicitly by the users, they
  // must still be included in the column definitions, and made hidden instead.
  const columns = configuration.columns.filter(
    (col) =>
      _findCol(snapshot.data.selectColumns, col.name) ??
      _findCol(snapshot.data.groupExtendedColumns, col.name),
  );
  let pivotResultColumns: DataCubeColumn[] = [];

  if (snapshot.data.pivot) {
    const castColumns = snapshot.data.pivot.castColumns;
    pivotResultColumns = rearrangePivotResultColumns(
      castColumns.filter((col) => isPivotResultColumnName(col.name)),
      snapshot.data.pivot,
      configuration,
    );
  }

  const columnDefs = [
    // NOTE: Internal column used for programatically trigger data fetch when filter is modified
    {
      colId: INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID,
      hide: true,
      enableValue: false, // disable GUI interactions to modify this column's aggregate function
      allowedAggFuncs: [], // disable GUI for options of the agg functions
      enablePivot: false,
      enableRowGroup: false,
      filter: 'agTextColumnFilter',
      suppressColumnsToolPanel: true,
    },
    ...(configuration.showRootAggregation
      ? [
          {
            colId: INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
            headerName: 'Root',
            field: INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
            hide: true,
            enableValue: false, // disable GUI interactions to modify this column's aggregate function
            allowedAggFuncs: [], // disable GUI for options of the agg functions
            enablePivot: false,
            enableRowGroup: false,

            suppressColumnsToolPanel: true,
            rowGroup: true,
            rowGroupIndex: 0,
          } satisfies ColDef,
        ]
      : []),
    ...generateDefinitionForPivotResultColumns(
      pivotResultColumns,
      snapshot,
      configuration,
    ),
    ...columns.map((column) => {
      const columnData = {
        name: column.name,
        snapshot,
        column,
        configuration,
      };
      return {
        headerName: column.displayName ?? column.name,
        headerTooltip: `Column = ${
          column.displayName
            ? `${column.displayName} (${column.name})`
            : column.name
        }`,
        suppressSpanHeaderHeight: true,
        colId: column.name,
        field: column.name,
        menuTabs: [],

        ..._displaySpec(columnData),
        ..._sizeSpec(columnData),
        ..._sortSpec(columnData),
        ..._aggregationSpec(columnData),
      } satisfies ColDef;
    }),
  ] satisfies (ColDef | ColGroupDef)[];

  return columnDefs;
}

export function generateGridOptionsFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  view: DataCubeViewState,
): GridOptions {
  return {
    isServerSideGroupOpenByDefault: (params) => {
      if (
        configuration.initialExpandLevel !== undefined &&
        configuration.initialExpandLevel > 0 &&
        params.rowNode.level <=
          // root aggregation (if enabled) should not be counted when applying initial expand level
          (configuration.showRootAggregation
            ? configuration.initialExpandLevel + 1
            : configuration.initialExpandLevel) -
            1
      ) {
        return true;
      }

      const routes = params.rowNode.getRoute() ?? [];
      if (!routes.length) {
        return false;
      }

      // when root aggregation is enabled, the root node should be
      // expanded automatically by default
      if (
        configuration.showRootAggregation &&
        routes.length === 1 &&
        routes[0] === DEFAULT_ROOT_AGGREGATION_COLUMN_VALUE
      ) {
        return true;
      }

      // when root aggregation is enabled, the root node should not be removed
      // from path when matching against all expanded paths
      if (configuration.showRootAggregation) {
        routes.shift();
      }
      const path = routes.join(TREE_COLUMN_VALUE_SEPARATOR);
      if (configuration.pivotLayout.expandedPaths.includes(path)) {
        return true;
      }

      return false;
    },

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
      : {},

    // -------------------------------------- EVENT HANDLERS --------------------------------------
    // NOTE: make sure the event source must not be 'api' since these handlers are meant for direct
    // user interaction with the grid. Actions through context menu (i.e. grid controller) or programatic
    // update of the grid options due to change in query snapshot should not trigger these handlers.

    onColumnPinned: (event) => {
      if (event.source !== 'api' && event.column) {
        const column = event.column;
        const pinned = column.getPinned();
        view.grid.controller.pinColumn(
          column.getColId(),
          pinned === null
            ? undefined
            : pinned === DataCubeGridClientPinnedAlignement.LEFT
              ? DataCubeColumnPinPlacement.LEFT
              : DataCubeColumnPinPlacement.RIGHT,
        );
      }
    },

    onColumnMoved: (event) => {
      // make sure the move event is finished before syncing the changes
      if (event.source !== 'api' && event.column && event.finished) {
        view.grid.controller.rearrangeColumns(
          (event.api.getColumnDefs() ?? [])
            .filter((col): col is ColDef => !('children' in col))
            .map((col) => col.colId ?? ''),
        );
      }
    },

    onColumnVisible: (event) => {
      if (event.source !== 'api' && event.column) {
        const column = event.column;
        const isVisible = column.isVisible();
        view.grid.controller.showColumn(column.getColId(), isVisible);
      }
    },

    onRowGroupOpened: (event) => {
      // NOTE: only update the pivot layout expanded paths when the user manually expands/collapses
      // a path. If the path is expanded/collapsed programmatically, such as when tree column initially-
      // expanded-to-level is specified, causing the groups to be automatically drilled down, resultant
      // expanded paths will not be kept for record.
      if (event.event) {
        const routes = event.node.getRoute() ?? [];
        // when root aggregation is enabled, the root node should not be counted
        // when formulating the expanded path
        if (routes.length && configuration.showRootAggregation) {
          routes.shift();
        }
        const path = routes.join(TREE_COLUMN_VALUE_SEPARATOR);
        if (!path) {
          return;
        }
        if (event.expanded) {
          view.grid.controller.expandPath(path);
        } else {
          view.grid.controller.collapsePath(path);
        }
      }
    },

    // Virtual columns when being rendered (as user scrolls horizontally) would get resized
    // to fit their content dynamically. This can potentially cause some performance issues,
    // so we debounce the resize operation.
    onVirtualColumnsChanged: () => {
      view.grid.debouncedAutoResizeColumns?.cancel();
      view.grid.debouncedAutoResizeColumns?.();
    },

    // -------------------------------------- COLUMNS --------------------------------------

    columnDefs: generateColumnDefs(snapshot, configuration),
    autoGroupColumnDef: {
      // NOTE: the column ID here is set for explicitness, but this is not something ag-grid
      // allows setting for auto-group column, for more advanced use cases, we might want to
      // look into custom group columns
      // See https://www.ag-grid.com/react-data-grid/grouping-custom-group-columns/
      colId: INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
      headerName: '',
      cellRendererParams: {
        suppressCount: !configuration.showLeafCount,
      },

      // display
      ..._groupDisplaySpec(snapshot, configuration),

      // size
      minWidth: 200,

      // sorting
      sortable: true,

      // aggregation
      showRowGroup: true,
      suppressSpanHeaderHeight: true,
    } as ColDef,
  } satisfies GridOptions;
}
