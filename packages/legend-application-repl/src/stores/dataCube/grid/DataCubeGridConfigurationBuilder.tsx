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
  INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID,
  INTERNAL__GRID_CLIENT_PIVOT_COLUMN_GROUP_COLOR_ROTATION_SIZE,
} from './DataCubeGridClientEngine.js';
import {
  getNonNullableEntry,
  getQueryParameters,
  getQueryParameterValue,
  guaranteeNonNullable,
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
  PIVOT_COLUMN_NAME_VALUE_SEPARATOR,
  isPivotResultColumnName,
} from '../core/DataCubeQueryEngine.js';
import type { CustomLoadingCellRendererProps } from '@ag-grid-community/react';
import { DataCubeIcon } from '@finos/legend-art';
import type { DataCubeState } from '../DataCubeState.js';

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
  const cellRenderer = getCellRenderer(columnData);
  return {
    // disabling cell data type inference can grid performance
    // especially when this information is only necessary for cell value editor
    cellDataType: false,
    hide:
      column.hideFromView ||
      !column.isSelected ||
      (snapshot.data.pivot &&
        !snapshot.data.pivot.castColumns.find((col) => col.name === name)),
    lockVisible:
      !column.isSelected ||
      (snapshot.data.pivot &&
        !snapshot.data.pivot.castColumns.find((col) => col.name === name)),
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
    suppressAutoSize: column.fixedWidth !== undefined,
    suppressSizeToFit: column.fixedWidth !== undefined,
    width: column.fixedWidth,
    minWidth: Math.max(
      column.minWidth ?? INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
      INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH,
    ),
    maxWidth: column.maxWidth,
    // Make sure the column spans the width if possible so when total width
    // is less than grid width, removing/adding one column will cause the other
    // columns to take/give up space
    flex:
      column.fixedWidth === undefined ? 1 : (undefined as unknown as number),
  } as ColDef;
}

function _sortSpec(columnData: ColumnData) {
  const { name, snapshot } = columnData;
  const sortColumns = snapshot.data.sortColumns;
  const sortCol = _findCol(sortColumns, name);
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

function _aggSpec(columnData: ColumnData) {
  const { name, snapshot, column } = columnData;
  const data = snapshot.data;
  const groupByCol = _findCol(data.groupBy?.columns, name);
  const isGroupExtendedColumn = Boolean(
    _findCol(data.groupExtendedColumns, name),
  );
  return {
    enableRowGroup:
      !isGroupExtendedColumn && column.kind === DataCubeColumnKind.DIMENSION,
    rowGroup: !isGroupExtendedColumn && Boolean(groupByCol),
    rowGroupIndex:
      !isGroupExtendedColumn && groupByCol
        ? (data.groupBy?.columns.indexOf(groupByCol) ?? null)
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
    getChildCount: (data) =>
      data[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID],
    // -------------------------------------- PIVOT --------------------------------------
    // NOTE: we opt-out from ag-grid native support for pivot mode as it has a lot of constraints
    // e.g. pivot mode impacts how row-grouping column drilldown is handled: when enabled, one
    // cannot drill down to the leaf level.
    // Another problem is we cannot use custom group column when in pivot mode.
    // See https://github.com/ag-grid/ag-grid/issues/8088
    pivotMode: false,
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
    scrollbarWidth: 10,
    alwaysShowVerticalScroll: true, // this is needed to ensure column resize calculation is accurate
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
    // ensure columns are resized to fit the grid width initially and on window resize
    // NOTE: this has to be used with `alwaysShowVerticalScroll` to ensure accurate sizing
    // otherwise on initial load, the computation will be done when no data is rendered,
    // so when data is rendered and the vertical scrollbar shows up, it will block a part of
    // the last column.
    autoSizeStrategy: {
      type: 'fitGridWidth',
    },
    onGridSizeChanged: (event) => {
      event.api.sizeColumnsToFit();
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
    selection: {
      mode: 'cell',
    },
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
            suppressPivots: true,
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
    const baseColumnName = guaranteeNonNullable(values[values.length - 1]);
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
  pivotResultColumns: DataCubeQuerySnapshotColumn[],
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  dataCube: DataCubeState,
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
      const value = getNonNullableEntry(col.values, i);
      id =
        id === ''
          ? getNonNullableEntry(col.values, i)
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
    }
  });

  return columnDefs;
}

export function generateColumnDefs(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  dataCube: DataCubeState,
) {
  // NOTE: only show columns which are fetched in select() as we
  // can't solely rely on column selection because of certain restrictions
  // from ag-grid, e.g. in the case of row grouping tree column: the columns
  // which are grouped must be present in the column definitions, so even
  // when some of these might not be selected explicitly by the users, they
  // must still be included in the column definitions, and made hidden instead.
  let columns = configuration.columns.filter((col) =>
    snapshot.data.selectColumns.find((column) => column.name === col.name),
  );
  let pivotResultColumns: DataCubeQuerySnapshotColumn[] = [];

  if (snapshot.data.pivot) {
    const castColumns = snapshot.data.pivot.castColumns;
    pivotResultColumns = castColumns.filter((col) =>
      isPivotResultColumnName(col.name),
    );
    // Since fetching cast columns is an expensive operation, we often do this asynchronously
    // so sometimes, the grid column definitions might be generated with incorrect casting
    // information. In order to account for those cases, we include all select() columns
    // to make sure pivoting information is properly propagated to server-side row model datasource.
    columns = [
      ...columns.filter((col) =>
        castColumns.find((column) => column.name === col.name),
      ),
      ...columns.filter(
        (col) => !castColumns.find((column) => column.name === col.name),
      ),
    ];
  }

  return [
    {
      headerName: '',
      colId: INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
      cellRenderer: 'agGroupCellRenderer',
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
      showRowGroup: true,
      hide: !snapshot.data.groupBy,
      lockPinned: true,
      lockPosition: true,
      pinned: GridClientPinnedAlignement.LEFT,
      suppressSpanHeaderHeight: true,
      cellDataType: false,
      minWidth: 200,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      loadingCellRenderer: DataCubeGridLoadingCellRenderer,
      // TODO: we can support this in the configuration (support sorting by tree-column?)
      sortable: true,
    } satisfies ColDef,
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
    ...generateDefinitionForPivotResultColumns(
      pivotResultColumns,
      snapshot,
      configuration,
      dataCube,
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
        ..._aggSpec(columnData),
      } satisfies ColDef;
    }),
  ] satisfies (ColDef | ColGroupDef)[];
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

    columnDefs: generateColumnDefs(snapshot, configuration, dataCube),
  } as GridOptions;

  return gridOptions;
}
