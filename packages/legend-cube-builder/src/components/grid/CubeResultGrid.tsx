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
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { memo, useMemo } from 'react';
import { NULL_CELL_TEXT } from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';
import type { CubeExecutionResult } from '../../stores/CubeExecutionState.js';
import { compareCellValues, isNumericFamily } from './CubeGridValues.js';

type CubeRow = readonly CubeResultValue[];

const CubeCell: React.FC<
  DataGridCellRendererParams<CubeRow, CubeResultValue>
> = (props) =>
  props.value === null || props.value === undefined ? (
    <span className="text-[var(--color-text-muted)]">{NULL_CELL_TEXT}</span>
  ) : (
    <>{String(props.value)}</>
  );

/**
 * The rows of a run (PLAN §9): columns from Cube's own schema of the capture
 * node, by position, so any column name works. Numbers are right-aligned and
 * shown and sorted exactly as the engine wrote them.
 */
export const CubeResultGrid = memo(
  (props: { result: CubeExecutionResult; darkMode: boolean }) => {
    const { result, darkMode } = props;
    const columnDefs = useMemo(
      (): DataGridColumnDefinition<CubeRow, CubeResultValue>[] =>
        result.schema.columns.map((column, position) => {
          const numeric = isNumericFamily(column.type.family);
          return {
            colId: `c${position}`,
            headerName: column.name,
            headerTooltip: `${column.type.displayName}${column.nullable ? '?' : ''} (${column.type.fullName})`,
            valueGetter: (params) => params.data?.[position] ?? null,
            cellRenderer: CubeCell,
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
        />
      </div>
    );
  },
);
CubeResultGrid.displayName = 'CubeResultGrid';
