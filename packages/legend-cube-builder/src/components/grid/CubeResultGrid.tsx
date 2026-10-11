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
  type DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import { memo, useCallback, useMemo } from 'react';
import { NULL_CELL_TEXT } from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeExecutionResult } from '../../stores/CubeExecutionState.js';
import { getCubeGridQuickActions } from '../../stores/CubeGridQuickActions.js';
import {
  compareCellValues,
  formatCellValue,
  isNumericFamily,
} from './CubeGridValues.js';

type CubeRow = readonly CubeResultValue[];

/** A column's id in the grid: its position, as `c<position>` */
const COLUMN_ID_PREFIX = 'c';

/**
 * The grid's context menu (spec §12.4): on a cell, its quick actions, then
 * ag-grid's own items, which M7 curates; elsewhere ag-grid's only. Read when
 * the menu opens, so it reflects the cube and the run as they are then.
 */
export const getCubeGridContextMenuItems = (
  editorState: CubeEditorState,
  params: DataGridGetContextMenuItemsParams<CubeRow>,
): (DataGridDefaultMenuItem | DataGridMenuItemDef<CubeRow>)[] => {
  const defaultItems = params.defaultItems ?? [];
  const colId = params.column?.getColId();
  if (!colId?.startsWith(COLUMN_ID_PREFIX)) {
    return defaultItems;
  }
  const position = Number(colId.slice(COLUMN_ID_PREFIX.length));
  const cell = params.node?.data?.[position] ?? null;
  const actions = getCubeGridQuickActions(editorState, position, cell);
  if (!actions.length) {
    return defaultItems;
  }
  return [
    ...actions.map((quickAction): DataGridMenuItemDef<CubeRow> => {
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
 * the exact value on hover when the two differ
 */
const CubeCell: React.FC<
  DataGridCellRendererParams<CubeRow, CubeResultValue> & {
    family: TypeFamily;
  }
> = (props) => {
  if (props.value === null || props.value === undefined) {
    return (
      <span className="text-[var(--color-text-muted)]">{NULL_CELL_TEXT}</span>
    );
  }
  const exact = String(props.value);
  const shown = formatCellValue(props.value, props.family);
  return shown === exact ? <>{exact}</> : <span title={exact}>{shown}</span>;
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
      (): DataGridColumnDefinition<CubeRow, CubeResultValue>[] =>
        result.schema.columns.map((column, position) => {
          const numeric = isNumericFamily(column.type.family);
          return {
            colId: `${COLUMN_ID_PREFIX}${position}`,
            headerName: column.name,
            headerTooltip: `${column.type.displayName}${column.nullable ? '?' : ''} (${column.type.fullName})`,
            valueGetter: (params) => params.data?.[position] ?? null,
            cellRenderer: CubeCell,
            cellRendererParams: { family: column.type.family },
            ...(numeric
              ? { type: 'rightAligned', comparator: compareCellValues }
              : {}),
          };
        }),
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
        />
      </div>
    );
  },
);
CubeResultGrid.displayName = 'CubeResultGrid';
