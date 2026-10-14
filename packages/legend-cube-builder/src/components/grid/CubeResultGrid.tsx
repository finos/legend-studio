/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import {
  AggregationFunction,
  type CheckedDrilldown,
  type ColumnFormat,
  DEFAULT_PRESENTATION,
  foldColumnName,
  getColumnFormat,
  type Presentation,
  type TypeFamily,
} from '@finos/legend-cube';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumn,
  type DataGridColumnDefinition,
  type DataGridDefaultMenuItem,
  type DataGridGetContextMenuItemsParams,
  type DataGridIAggFuncParams,
  type DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import { flowResult } from 'mobx';
import { memo, useCallback, useMemo } from 'react';
import {
  CUBE_FORMAT_NOT_A_NUMBER,
  NULL_CELL_TEXT,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeExecutionResult } from '../../stores/CubeExecutionState.js';
import { getCubeExportFileName } from '../../stores/CubeExportState.js';
import {
  CubeGridCellKind,
  getCubeGridQuickActions,
} from '../../stores/CubeGridQuickActions.js';
import {
  CUBE_GRID_COLUMN_ID_PREFIX,
  type CubeGridRowData,
} from '../../stores/CubeGridState.js';
import {
  compareCellValues,
  formatCellValue,
  formatColumnValue,
  formatGroupRowValue,
  getTypeScale,
  isNumericFamily,
} from './CubeGridValues.js';

type CubeRow = readonly CubeResultValue[];

/** A row of either mode: a run's row in local mode, a level's row in server-side mode */
export type CubeAnyRow = CubeRow | CubeGridRowData;

const COLUMN_ID_PREFIX = CUBE_GRID_COLUMN_ID_PREFIX;

/**
 * A cell of a row, and what it holds: a run row's value; on a group row, its
 * key in a group column, else its aggregation, or nothing
 */
const cellOf = (
  editorState: CubeEditorState,
  row: CubeAnyRow | undefined,
  position: number,
): [CubeResultValue, CubeGridCellKind] => {
  if (!row || Array.isArray(row)) {
    return [
      (row as CubeRow | undefined)?.[position] ?? null,
      CubeGridCellKind.VALUE,
    ];
  }
  const data = row as CubeGridRowData;
  const value = data.cells[position];
  if (!data.isGroup) {
    return [value ?? null, CubeGridCellKind.VALUE];
  }
  const name = editorState.execution.result?.schema.columns[position]?.name;
  const keys = editorState.grid.drilldown?.columns.slice(0, data.keys.length);
  return name !== undefined && keys?.includes(name)
    ? [value ?? null, CubeGridCellKind.VALUE]
    : value === undefined
      ? [null, CubeGridCellKind.EMPTY]
      : [value, CubeGridCellKind.AGGREGATE];
};

/**
 * The menu's Export (spec §12.5, PLAN §11.10), in place of ag-grid's export of
 * the fetched rows: CSV of the whole query, run on the engine with no row
 * limit and sorted as the grid is; Excel of the rows the grid shows
 */
const getCubeExportItem = <Row extends CubeAnyRow>(
  editorState: CubeEditorState,
  params: DataGridGetContextMenuItemsParams<Row>,
): DataGridMenuItemDef<Row> => {
  const { result } = editorState.execution;
  const { isExporting } = editorState.export;
  return {
    name: 'Export',
    subMenu: [
      {
        name: 'CSV (whole query)',
        disabled: !result || isExporting,
        tooltip:
          'Runs the whole query on the engine, with no row limit, sorted as the grid is',
        action: () => {
          if (result) {
            const sortModel = params.api
              .getColumnState()
              .filter((column) => column.sort)
              .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
              .map((column) => ({
                colId: column.colId,
                sort: column.sort as 'asc' | 'desc',
              }));
            const depth = editorState.grid.drilldown?.columns.length ?? 0;
            flowResult(
              editorState.export.exportCsv(
                result,
                editorState.grid.toSorts(result, sortModel, depth),
              ),
            ).catch(editorState.host.applicationStore.alertUnhandledError);
          }
        },
      },
      {
        name: 'Excel (rows shown)',
        tooltip:
          'The rows the grid has loaded, expanded groups included, as the grid shows them',
        action: () =>
          params.api.exportDataAsExcel({
            fileName: getCubeExportFileName(editorState.document.name, 'xlsx'),
            // a group row's key as the grid shows it, not ag-grid's ' -> key'
            processRowGroupCallback: ({ node }) => {
              const data = node.data as CubeAnyRow | undefined;
              if (data && !Array.isArray(data)) {
                const key = (data as CubeGridRowData).keys.at(-1) ?? null;
                return key === null ? NULL_CELL_TEXT : String(key);
              }
              return node.key ?? NULL_CELL_TEXT;
            },
          }),
      },
    ],
  };
};

/** ag-grid's own items the menu keeps (spec §12.4), after the cell's */
const CUBE_GRID_MENU_ITEMS: readonly DataGridDefaultMenuItem[] = [
  'autoSizeAll',
  'resetColumns',
  'separator',
  'copy',
  'copyWithHeaders',
];

/**
 * The grid's context menu (spec §12.4, PLAN §11.10), curated: on a cell,
 * 'Drilldown by' its column and the quick actions, then a separator; then,
 * anywhere, sizing and resetting the columns, copying, and Cube's Export. Not
 * ag-grid's cut, paste or client export, which would export the fetched rows
 * only. Read when the menu opens, so it reflects the cube and the run as they
 * are then.
 */
export const getCubeGridContextMenuItems = <Row extends CubeAnyRow>(
  editorState: CubeEditorState,
  params: DataGridGetContextMenuItemsParams<Row>,
): (DataGridDefaultMenuItem | DataGridMenuItemDef<Row>)[] => {
  const common: (DataGridDefaultMenuItem | DataGridMenuItemDef<Row>)[] = [
    ...CUBE_GRID_MENU_ITEMS,
    getCubeExportItem(editorState, params),
  ];
  const colId = params.column?.getColId();
  if (!colId?.startsWith(COLUMN_ID_PREFIX)) {
    return common;
  }
  const position = Number(colId.slice(COLUMN_ID_PREFIX.length));
  // local mode's group rows hold ag-grid's totals, not a row (review of M7)
  const [cell, kind] =
    params.node?.group && !params.node.data
      ? [null, CubeGridCellKind.EMPTY]
      : cellOf(editorState, params.node?.data, position);
  const actions = getCubeGridQuickActions(editorState, position, cell, kind);
  const column = editorState.execution.result?.schema.columns[position];
  if (!actions.length || !column) {
    return common;
  }
  const drilldownBlocker = editorState.grid.getAddLevelBlocker(column.name);
  // only number columns are formatted (spec §13.1)
  const formatBlocker = editorState.readOnly
    ? READ_ONLY_CUBE_TITLE
    : isNumericFamily(column.type.family)
      ? undefined
      : CUBE_FORMAT_NOT_A_NUMBER;
  return [
    {
      name: `Drilldown by "${column.name}"`,
      disabled: drilldownBlocker !== undefined,
      ...(drilldownBlocker === undefined ? {} : { tooltip: drilldownBlocker }),
      action: () => editorState.grid.addLevel(column.name),
    },
    ...actions.map((quickAction): DataGridMenuItemDef<Row> => {
      const tooltip = quickAction.disabledReason ?? quickAction.hint;
      return {
        name: quickAction.label,
        disabled: quickAction.disabledReason !== undefined,
        ...(tooltip === undefined ? {} : { tooltip }),
        action: () => quickAction.apply(),
      };
    }),
    'separator',
    {
      name: 'Format Column…',
      disabled: formatBlocker !== undefined,
      ...(formatBlocker === undefined ? {} : { tooltip: formatBlocker }),
      action: () => editorState.grid.openFormat(column.name),
    },
    ...common,
  ];
};

/**
 * A cell: its value as the column's family shows it (`formatCellValue`), with
 * the exact value on hover when the two differ; nothing for a group row's
 * column with no aggregation (`undefined`)
 */
export const CubeCell: React.FC<
  DataGridCellRendererParams<CubeAnyRow, CubeResultValue | undefined> & {
    family: TypeFamily;
    /** The column's format (PLAN §11.10), on a number column that has one */
    format?: ColumnFormat | undefined;
    /**
     * A group row shows a count in this column, which is never formatted (a
     * count is not money, spec §13.1), but where the column is the group's key
     */
    countOnGroupRows?: boolean | undefined;
    /** The column's name and the drill-down's levels, to tell a group row's key */
    columnName?: string | undefined;
    levels?: readonly string[] | undefined;
    /** The digits after the point the column's type keeps, e.g. 4 for `Numeric(14,4)`; none for a type without */
    scale?: number | undefined;
  }
> = (props) => {
  if (props.value === undefined) {
    return null;
  }
  if (props.value === null) {
    return (
      <span className="text-[var(--color-text-muted)]">{NULL_CELL_TEXT}</span>
    );
  }
  const exact = String(props.value);
  const row = props.data;
  // a value a group row aggregates: local mode's group rows, or a server-side
  // group row's cell in a column that isn't one of the group's keys
  const isGroupRowKey =
    row !== undefined &&
    !Array.isArray(row) &&
    (row as CubeGridRowData).isGroup &&
    (props.levels ?? [])
      .slice(0, (row as CubeGridRowData).keys.length)
      .includes(props.columnName ?? '');
  // never a group's key: year 2024 and id 13 keep no comma
  const isAggregate =
    !isGroupRowKey &&
    (props.node.group === true ||
      (row !== undefined &&
        !Array.isArray(row) &&
        (row as CubeGridRowData).isGroup));
  // local mode's group row totalling the column by ag-grid's own count
  const isLocalCount =
    props.node.group === true && props.column?.getAggFunc() === 'count';
  const isCount =
    isLocalCount ||
    (props.countOnGroupRows === true &&
      row !== undefined &&
      !Array.isArray(row) &&
      (row as CubeGridRowData).isGroup &&
      !(props.levels ?? [])
        .slice(0, (row as CubeGridRowData).keys.length)
        .includes(props.columnName ?? ''));
  const formatted =
    props.format && !isCount
      ? formatColumnValue(props.value, props.format)
      : undefined;
  if (formatted) {
    return (
      <span
        title={exact}
        className={clsx({
          'text-[var(--color-status-error)]':
            props.format?.redIfNegative && formatted.negative,
        })}
      >
        {formatted.text}
      </span>
    );
  }
  const shown = isAggregate
    ? formatGroupRowValue(props.value, props.family, props.scale)
    : formatCellValue(props.value, props.family);
  return shown === exact ? <>{exact}</> : <span title={exact}>{shown}</span>;
};

/** The class of a number column's cells, which Excel exports as numbers (`CUBE_EXCEL_STYLES`) */
const CUBE_EXCEL_NUMBER_CLASS = 'cube-excel-number';

/**
 * The grid's Excel styles: a number column's cells are numbers in the
 * workbook, where ag-grid would write the exact text it holds as text
 */
export const CUBE_EXCEL_STYLES = [
  { id: CUBE_EXCEL_NUMBER_CLASS, dataType: 'Number' as const },
];

/** The group-row aggregations that count, whose cells keep no format */
const COUNT_AGGREGATIONS: readonly AggregationFunction[] = [
  AggregationFunction.COUNT,
  AggregationFunction.DISTINCT_COUNT,
];

/**
 * The grid's columns: the run's, from Cube's own schema of the node that ran,
 * by position, so any column name works, with the type in the header's
 * tooltip; numbers right-aligned and sorted exactly as the engine wrote them
 */
export const buildCubeColumnDefs = <Row extends CubeAnyRow>(
  result: CubeExecutionResult,
  valueAt: (
    row: Row | undefined,
    position: number,
  ) => CubeResultValue | undefined,
  presentation: Presentation = DEFAULT_PRESENTATION,
  drilldown?: CheckedDrilldown | undefined,
): DataGridColumnDefinition<Row, CubeResultValue | undefined>[] =>
  result.schema.columns.map((column, position) => {
    const numeric = isNumericFamily(column.type.family);
    const width = presentation.columnWidths.find(
      (each) => foldColumnName(each.column) === foldColumnName(column.name),
    )?.width;
    return {
      colId: `${COLUMN_ID_PREFIX}${position}`,
      headerName: column.name,
      headerTooltip: `${column.type.displayName}${column.nullable ? '?' : ''} (${column.type.fullName})`,
      valueGetter: (params) => valueAt(params.data, position),
      cellRenderer: CubeCell,
      cellRendererParams: {
        family: column.type.family,
        // only number columns are formatted (spec §13.1)
        format: numeric
          ? getColumnFormat(presentation.columnHints ?? [], column.name)
          : undefined,
        countOnGroupRows: drilldown
          ? COUNT_AGGREGATIONS.includes(
              drilldown.aggregationOf(column.name) as AggregationFunction,
            )
          : false,
        columnName: column.name,
        levels: drilldown?.columns ?? [],
        scale: getTypeScale(column.type),
      },
      ...(width === undefined ? {} : { width }),
      ...(numeric
        ? {
            type: 'rightAligned',
            comparator: compareCellValues,
            // a number in Excel, though it reaches the grid as exact text; a
            // column's own cell class replaces its type's, so the type's is
            // kept too
            cellClass: ['ag-right-aligned-cell', CUBE_EXCEL_NUMBER_CLASS],
          }
        : {}),
    };
  });

/**
 * Keeps a column's width when the user resizes it, by dragging or from the
 * menu (PLAN §11.10): the cube saves it, with no undo step
 */
export const keepCubeColumnWidths = (
  editorState: CubeEditorState,
  result: CubeExecutionResult,
  event: {
    readonly finished: boolean;
    readonly source: string;
    readonly columns?: readonly DataGridColumn[] | null | undefined;
  },
): void => {
  if (
    !event.finished ||
    (event.source !== 'uiColumnResized' && event.source !== 'autosizeColumns')
  ) {
    return;
  }
  (event.columns ?? []).forEach((column) => {
    const colId = column.getColId();
    const name = colId.startsWith(COLUMN_ID_PREFIX)
      ? result.schema.columns[Number(colId.slice(COLUMN_ID_PREFIX.length))]
          ?.name
      : undefined;
    if (name !== undefined) {
      editorState.setColumnWidth(name, column.getActualWidth());
    }
  });
};

/** A value as a JS number, for local mode's filters and totals; `null` for none or text that isn't one */
const toNumber = (value: CubeResultValue | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** The numbers among a group's values, for local mode's totals */
const numbersOf = (params: DataGridIAggFuncParams): number[] =>
  params.values
    .map((value: unknown) => toNumber(value as CubeResultValue))
    .filter((value): value is number => value !== null);

/**
 * Local mode's totals over a group's values, read as JS numbers: the engine
 * writes integers and decimals as exact text, which ag-grid's own would join
 * as text; a total past a double's precision is rounded, as local mode works
 * on the fetched rows in the browser
 */
export const LOCAL_AGGREGATIONS = {
  sum: (params: DataGridIAggFuncParams) =>
    numbersOf(params).reduce((total, value) => total + value, 0),
  avg: (params: DataGridIAggFuncParams) => {
    const numbers = numbersOf(params);
    return numbers.length
      ? numbers.reduce((total, value) => total + value, 0) / numbers.length
      : null;
  },
  min: (params: DataGridIAggFuncParams) => {
    const numbers = numbersOf(params);
    return numbers.length ? Math.min(...numbers) : null;
  },
  max: (params: DataGridIAggFuncParams) => {
    const numbers = numbersOf(params);
    return numbers.length ? Math.max(...numbers) : null;
  },
};

const LOCAL_COLUMN_DEFAULTS: DataGridColumnDefinition<CubeRow> = {
  enableRowGroup: true,
  enablePivot: true,
  enableValue: true,
  filter: 'agTextColumnFilter',
};

const LOCAL_SIDE_BAR = {
  toolPanels: ['columns', 'filters'],
};

const LOCAL_STATUS_BAR = {
  statusPanels: [
    { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
    { statusPanel: 'agAggregationComponent', align: 'right' },
  ],
};

/**
 * The rows of a run (PLAN §9): columns from Cube's own schema of the capture
 * node, by position, so any column name works. Numbers are right-aligned and
 * shown and sorted exactly as the engine wrote them. A cell's context menu
 * offers the quick actions (`getCubeGridContextMenuItems`).
 */
export const CubeResultGrid = memo(
  (props: {
    editorState: CubeEditorState;
    result: CubeExecutionResult;
    presentation: Presentation;
    darkMode: boolean;
  }) => {
    const { editorState, result, presentation, darkMode } = props;
    const getContextMenuItems = useCallback(
      (params: DataGridGetContextMenuItemsParams<CubeRow>) =>
        getCubeGridContextMenuItems(editorState, params),
      [editorState],
    );
    const columnDefs = useMemo(
      () =>
        buildCubeColumnDefs<CubeRow>(
          result,
          (row, position) => row?.[position] ?? null,
          presentation,
        ).map(
          (
            column,
            position,
          ): DataGridColumnDefinition<CubeRow, CubeResultValue | undefined> =>
            isNumericFamily(
              result.schema.columns[position]?.type.family as TypeFamily,
            )
              ? {
                  ...column,
                  filter: 'agNumberColumnFilter',
                  filterValueGetter: (params: { data: CubeRow | undefined }) =>
                    toNumber(params.data?.[position] ?? null),
                  allowedAggFuncs: ['sum', 'avg', 'min', 'max', 'count'],
                }
              : { ...column, allowedAggFuncs: ['count'] },
        ),
      [result, presentation],
    );
    return (
      <div
        className={clsx('h-full w-full', {
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
        data-testid={LEGEND_CUBE_TEST_ID.RESULT_GRID}
      >
        <DataGrid<CubeRow>
          rowData={result.rows as CubeRow[]}
          columnDefs={columnDefs}
          suppressFieldDotNotation={true}
          tooltipShowDelay={500}
          getContextMenuItems={getContextMenuItems}
          // local mode (spec §12.1): ag-grid's own grouping, pivot and
          // filters on the run's rows, with their panels and totals
          defaultColDef={LOCAL_COLUMN_DEFAULTS}
          aggFuncs={LOCAL_AGGREGATIONS}
          rowGroupPanelShow="always"
          sideBar={LOCAL_SIDE_BAR}
          statusBar={LOCAL_STATUS_BAR}
          cellSelection={true}
          excelStyles={CUBE_EXCEL_STYLES}
          onColumnResized={(event) =>
            keepCubeColumnWidths(editorState, result, event)
          }
        />
      </div>
    );
  },
);
CubeResultGrid.displayName = 'CubeResultGrid';
