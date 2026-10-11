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
import type { Presentation, TypeFamily } from '@finos/legend-cube';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridGetContextMenuItemsParams,
  type DataGridServerSideDatasource,
  type DataGridServerSideGetRowsParams,
} from '@finos/legend-lego/data-grid';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { NULL_CELL_TEXT } from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeExecutionResult } from '../../stores/CubeExecutionState.js';
import type {
  CubeGridRowData,
  CubeGridSortRequest,
} from '../../stores/CubeGridState.js';
import { formatCellValue } from './CubeGridValues.js';
import {
  buildCubeColumnDefs,
  CUBE_EXCEL_STYLES,
  getCubeGridContextMenuItems,
  keepCubeColumnWidths,
} from './CubeResultGrid.js';

/** A group's key in the groups' column, as its level's column shows a value */
const CubeGroupKey: React.FC<
  DataGridCellRendererParams<CubeGridRowData> & {
    families: readonly TypeFamily[];
  }
> = (props) => {
  const { data, families } = props;
  if (!data?.isGroup) {
    return null;
  }
  const key = data.keys.at(-1) ?? null;
  const family = families[data.keys.length - 1];
  if (key === null || family === undefined) {
    return (
      <span className="text-[var(--color-text-muted)]">{NULL_CELL_TEXT}</span>
    );
  }
  return <>{formatCellValue(key, family)}</>;
};

/**
 * The rows of a run in server-side mode (spec §12.1, PLAN §11.10): ag-grid's
 * server-side row model asks for each level as it is shown, sorted by its
 * headers, and the grid's state answers from the run on screen. With a
 * drill-down, the levels are groups of the run's rows, each expandable down
 * to the rows, shown in a column of their own with each group's count.
 * Every level is answered whole, cut at the run's row limit, and ag-grid's
 * blocks are taken from it.
 */
export const CubeServerSideGrid = memo(
  (props: {
    editorState: CubeEditorState;
    result: CubeExecutionResult;
    /** The drill-down's levels, as the run names them: the grid is built anew when they change */
    levels: readonly string[];
    presentation: Presentation;
    darkMode: boolean;
  }) => {
    const { editorState, result, levels, presentation, darkMode } = props;
    const { grid } = editorState;
    // a new grid for each run and drill-down (its key), whose levels say anew
    useEffect(() => {
      grid.resetLevels();
    }, [grid]);
    const { drilldown } = grid;
    const getContextMenuItems = useCallback(
      (params: DataGridGetContextMenuItemsParams<CubeGridRowData>) =>
        getCubeGridContextMenuItems(editorState, params),
      [editorState],
    );
    const columnDefs = useMemo(
      (): DataGridColumnDefinition<CubeGridRowData>[] =>
        buildCubeColumnDefs<CubeGridRowData>(
          result,
          (row, position) => row?.cells[position],
          presentation,
          drilldown,
        ),
      [result, presentation, drilldown],
    );
    const families = useMemo(
      () =>
        levels.map(
          (level) => result.schema.lookup(level)?.type.family as TypeFamily,
        ),
      [result, levels],
    );
    const datasource = useMemo(
      (): DataGridServerSideDatasource<CubeGridRowData> => ({
        getRows: (params: DataGridServerSideGetRowsParams<CubeGridRowData>) => {
          const keys = params.parentNode.data?.keys ?? [];
          const { startRow = 0, endRow, sortModel } = params.request;
          grid
            .loadRows(result, keys, sortModel as readonly CubeGridSortRequest[])
            .then((rows) => {
              // rows the grid no longer shows are left alone
              if (rows) {
                params.success({
                  rowData: rows.slice(startRow, endRow ?? rows.length),
                  rowCount: rows.length,
                });
              }
            })
            // the grid region shows the error
            .catch(() => params.fail());
        },
      }),
      [grid, result],
    );
    const hasLevels = levels.length > 0;
    return (
      <div
        className={clsx('h-full w-full', {
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
        data-testid={LEGEND_CUBE_TEST_ID.RESULT_GRID}
      >
        <DataGrid<CubeGridRowData>
          rowModelType="serverSide"
          serverSideDatasource={datasource}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          suppressFieldDotNotation={true}
          tooltipShowDelay={500}
          getContextMenuItems={getContextMenuItems}
          serverSideSortAllLevels={true}
          excelStyles={CUBE_EXCEL_STYLES}
          onColumnResized={(event) =>
            keepCubeColumnWidths(editorState, result, event)
          }
          {...(hasLevels
            ? {
                treeData: true,
                isServerSideGroup: (data: CubeGridRowData) => data.isGroup,
                getServerSideGroupKey: (data: CubeGridRowData) => data.id,
                getChildCount: (data: CubeGridRowData) => data.count ?? 0,
                autoGroupColumnDef: {
                  headerName: levels.join(' › '),
                  headerTooltip: `The groups, by ${levels.join(', then ')}`,
                  minWidth: 200,
                  sortable: true,
                  cellRendererParams: {
                    innerRenderer: CubeGroupKey,
                    innerRendererParams: { families },
                  },
                },
              }
            : {})}
        />
      </div>
    );
  },
);
CubeServerSideGrid.displayName = 'CubeServerSideGrid';
