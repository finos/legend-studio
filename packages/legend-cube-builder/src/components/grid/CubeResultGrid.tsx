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
import type { TypeFamily } from '@finos/legend-cube';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridDefaultMenuItem,
  type DataGridGetContextMenuItemsParams,
  type DataGridIAggFuncParams,
  type DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import { flowResult } from 'mobx';
import { memo, useCallback, useMemo } from 'react';
import { NULL_CELL_TEXT } from '../../__lib__/LegendCubeLabels.js';
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
 * The grid's context menu (spec §12.4): on a cell, 'Drilldown by' its column
 * (PLAN §11.10), then its quick actions, then ag-grid's own items, which M7
 * curates; elsewhere ag-grid's only. Read when the menu opens, so it reflects
 * the cube and the run as they are then.
 */
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
          }),
      },
    ],
  };
};

export const getCubeGridContextMenuItems = <Row extends CubeAnyRow>(
  editorState: CubeEditorState,
  params: DataGridGetContextMenuItemsParams<Row>,
): (DataGridDefaultMenuItem | DataGridMenuItemDef<Row>)[] => {
  const defaultItems = (params.defaultItems ?? []).map(
    (item): DataGridDefaultMenuItem | DataGridMenuItemDef<Row> =>
      item === 'export' ? getCubeExportItem(editorState, params) : item,
  );
  const colId = params.column?.getColId();
  if (!colId?.startsWith(COLUMN_ID_PREFIX)) {
    return defaultItems;
  }
  const position = Number(colId.slice(COLUMN_ID_PREFIX.length));
  const [cell, kind] = cellOf(editorState, params.node?.data, position);
  const actions = getCubeGridQuickActions(editorState, position, cell, kind);
  const column = editorState.execution.result?.schema.columns[position];
  if (!actions.length || !column) {
    return defaultItems;
  }
  const drilldownBlocker = editorState.grid.getAddLevelBlocker(column.name);
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
    ...defaultItems,
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
  const shown = formatCellValue(props.value, props.family);
  return shown === exact ? <>{exact}</> : <span title={exact}>{shown}</span>;
};

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
): DataGridColumnDefinition<Row, CubeResultValue | undefined>[] =>
  result.schema.columns.map((column, position) => {
    const numeric = isNumericFamily(column.type.family);
    return {
      colId: `${COLUMN_ID_PREFIX}${position}`,
      headerName: column.name,
      headerTooltip: `${column.type.displayName}${column.nullable ? '?' : ''} (${column.type.fullName})`,
      valueGetter: (params) => valueAt(params.data, position),
      cellRenderer: CubeCell,
      cellRendererParams: { family: column.type.family },
      ...(numeric
        ? { type: 'rightAligned', comparator: compareCellValues }
        : {}),
    };
  });

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
const LOCAL_AGGREGATIONS = {
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
    darkMode: boolean;
  }) => {
    const { editorState, result, darkMode } = props;
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
      [result],
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
        />
      </div>
    );
  },
);
CubeResultGrid.displayName = 'CubeResultGrid';
