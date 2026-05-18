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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  DataGridDefaultMenuItem,
  DataGridGetContextMenuItemsParams,
  DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import type {
  TDSResultCellData,
  TDSResultCellDataType,
  TDSRowDataType,
} from '@finos/legend-graph';
import { QueryBuilderTDSState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { filterByOrOutValues } from './QueryBuilderTDSResultShared.js';
import type { QueryBuilderResultState } from '../../../stores/QueryBuilderResultState.js';

/**
 * Sync AG Grid's current cell-range selection into
 * `resultState.selectedCells` so that `filterByOrOutValues` can iterate
 * over them.  Falls back to the single right-clicked cell when no range
 * is active.
 */
const syncSelectedCellsFromGrid = (
  params: DataGridGetContextMenuItemsParams<TDSRowDataType>,
  resultState: QueryBuilderResultState,
): void => {
  const cells: TDSResultCellData[] = [];
  const ranges = params.api.getCellRanges() ?? [];
  for (const range of ranges) {
    const startRow = Math.min(
      range.startRow?.rowIndex ?? 0,
      range.endRow?.rowIndex ?? 0,
    );
    const endRow = Math.max(
      range.startRow?.rowIndex ?? 0,
      range.endRow?.rowIndex ?? 0,
    );
    for (let r = startRow; r <= endRow; r++) {
      const node = params.api.getDisplayedRowAtIndex(r);
      range.columns.forEach((col, ci) => {
        const colId = col.getColId();
        const rawValue = (node?.data as Record<string, unknown> | undefined)?.[
          colId
        ];
        cells.push({
          value: (rawValue ?? null) as TDSResultCellDataType,
          columnName: colId,
          coordinates: { rowIndex: r, colIndex: ci },
        });
      });
    }
  }
  // Fallback: use the right-clicked cell itself
  if (cells.length === 0 && params.node && params.column) {
    const colId = params.column.getColId();
    cells.push({
      value: (params.value ?? null) as TDSResultCellDataType,
      columnName: colId,
      coordinates: { rowIndex: params.node.rowIndex ?? 0, colIndex: 0 },
    });
  }
  resultState.setSelectedCells(cells);
  if (cells.length > 0) {
    resultState.setMouseOverCell(cells[0] ?? null);
  }
};

/**
 * Build the shared context-menu items used by both the enterprise and
 * simple TDS grid components:
 *   Filter By | Filter Out | Copy | Copy with Headers | Copy Row Value
 */
export const buildTDSGridContextMenuItems = (
  params: DataGridGetContextMenuItemsParams<TDSRowDataType>,
  applicationStore: GenericLegendApplicationStore,
  resultState: QueryBuilderResultState,
  onError: (error: Error) => void,
): (DataGridDefaultMenuItem | DataGridMenuItemDef)[] => {
  const fetchStructureImplementation =
    resultState.queryBuilderState.fetchStructureState.implementation;
  if (fetchStructureImplementation instanceof QueryBuilderTDSState) {
    syncSelectedCellsFromGrid(params, resultState);
    return [
      {
        name: 'Filter By',
        action: () => {
          filterByOrOutValues(
            applicationStore,
            resultState.mousedOverCell,
            true,
            fetchStructureImplementation,
          ).catch(onError);
        },
      },
      {
        name: 'Filter Out',
        action: () => {
          filterByOrOutValues(
            applicationStore,
            resultState.mousedOverCell,
            false,
            fetchStructureImplementation,
          ).catch(onError);
        },
      },
      'copy',
      'copyWithHeaders',
      {
        name: 'Copy Row Value',
        action: () => {
          params.api.copySelectedRowsToClipboard();
        },
      },
    ];
  }
  return [];
};
