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

import { type RefObject, useEffect, useRef, useState } from 'react';
import type { TDSResultCellData, TDSRowDataType } from '@finos/legend-graph';
import type { DataGridApi } from '@finos/legend-lego/data-grid';
import {
  computeCellSelectionStats,
  type CellSelectionStats,
} from './QueryBuilderTDSCellSelectionStats.js';

/**
 * Return type for useAsyncCellSelectionStats.
 *
 * When the hook returns non-undefined, the stats bar should be shown.
 *
 * - `cellCount` is 0 until Phase 1 (50 ms) resolves, then the actual count.
 * - `countReady` is false while the count is still being debounced.
 * - `stats` is undefined until Phase 2 (200 ms + rAF) resolves.
 */
export interface AsyncCellSelectionStatsResult {
  /** Total selected cell count — 0 while Phase 1 debounce is pending. */
  cellCount: number;
  /** True once the 50 ms debounce has resolved and cellCount is accurate. */
  countReady: boolean;
  /** Fully-computed stats, or undefined while Phase 2 is pending. */
  stats: CellSelectionStats | undefined;
}

/**
 * Three-tier debounced stats hook for AG Grid enterprise cell-range selections.
 *
 * The hook is deliberately decoupled from the MobX `selectedCells` array.
 * Instead it takes a lightweight `selectionVersion` counter that is
 * incremented by `onCellSelectionChanged` (O(1)) and reads cell data lazily
 * from the grid API only when the debounce timers fire.
 *
 * Immediate — when quickCount ≥ 2:
 *   The bar is shown immediately with spinner placeholders for everything
 *   (including the count).
 *
 * Phase 1 — COUNT_DEBOUNCE_MS (50 ms):
 *   Reads `getCellRanges()` to get the cell count in O(ranges) time.
 *   The count spinner is replaced with the actual number.
 *
 * Phase 2 — STATS_DEBOUNCE_MS (200 ms) + rAF paint guarantee:
 *   Reads all cell values from the grid and calls `computeCellSelectionStats`.
 *   The remaining spinners are replaced with computed values.
 *
 * Hiding is immediate: when selectionVersion changes and the count drops
 * below 2, the panel is hidden synchronously.
 */
const COUNT_DEBOUNCE_MS = 50;
const STATS_DEBOUNCE_MS = 200;

/**
 * Fast O(ranges) cell count — just sums rows×cols per range.
 * May overcount with overlapping ranges but that's acceptable for the
 * show-debounce decision (exact count comes later in readSelectedCells).
 */
const fastCellCount = (api: DataGridApi<TDSRowDataType>): number => {
  try {
    const ranges = api.getCellRanges();
    if (!ranges || ranges.length === 0) {
      return 0;
    }
    let total = 0;
    for (const range of ranges) {
      const start = range.startRow?.rowIndex ?? 0;
      const end = range.endRow?.rowIndex ?? 0;
      const rows = Math.abs(end - start) + 1;
      total += rows * range.columns.length;
    }
    return total;
  } catch {
    return 0;
  }
};

/**
 * Reads all selected cell values from the grid API — called lazily at stats
 * time (Tier 2).  Complexity: O(rows) for the node map + O(cells) for the
 * range iteration.
 */
const readSelectedCells = (
  api: DataGridApi<TDSRowDataType>,
): TDSResultCellData[] => {
  const ranges = api.getCellRanges();
  if (!ranges || ranges.length === 0) {
    return [];
  }
  // Build a rowIndex → node map once in O(rows), then look up in O(1) per cell.
  const nodeByRowIndex = new Map<number, TDSRowDataType>();
  api.forEachNode((node) => {
    if (node.rowIndex !== null && node.data) {
      nodeByRowIndex.set(node.rowIndex, node.data);
    }
  });
  // Build a colId → column-index map once in O(columns) instead of calling
  // findIndex inside the inner loop (which would be O(cols) per cell).
  // Uses getColumns() (runtime column state) rather than getColumnDefs() (input config).
  const allColumns = api.getColumns() ?? [];
  const colIndexByColId = new Map<string, number>();
  allColumns.forEach((col, i) => {
    colIndexByColId.set(col.getColId(), i);
  });
  const seen = new Map<string, TDSResultCellData>();
  for (const range of ranges) {
    const start = range.startRow?.rowIndex ?? 0;
    const end = range.endRow?.rowIndex ?? 0;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let r = lo; r <= hi; r++) {
      const rowData = nodeByRowIndex.get(r);
      if (!rowData) {
        continue;
      }
      for (const col of range.columns) {
        const colId = col.getColId();
        const key = `${r}|${colId}`;
        if (!seen.has(key)) {
          seen.set(key, {
            value: (rowData as Record<string, unknown>)[colId],
            columnName: colId,
            coordinates: {
              rowIndex: r,
              colIndex: colIndexByColId.get(colId) ?? -1,
            },
          } as TDSResultCellData);
        }
      }
    }
  }
  return Array.from(seen.values());
};

export const useAsyncCellSelectionStats = (
  /** Incremented O(1) on every onCellSelectionChanged — never the full cell array. */
  selectionVersion: number,
  columnTypes: Map<string, string | undefined>,
  gridApiRef: RefObject<DataGridApi<TDSRowDataType> | null>,
  /** Fallback cell array used when gridApiRef.current is null (simple grid). */
  fallbackCells?: TDSResultCellData[],
): AsyncCellSelectionStatsResult | undefined => {
  const [visible, setVisible] = useState(false);
  const [cellCount, setCellCount] = useState(0);
  const [countReady, setCountReady] = useState(false);
  const [stats, setStats] = useState<CellSelectionStats | undefined>(undefined);

  const columnTypesRef = useRef(columnTypes);
  useEffect(() => {
    columnTypesRef.current = columnTypes;
  });

  const fallbackCellsRef = useRef(fallbackCells);
  useEffect(() => {
    fallbackCellsRef.current = fallbackCells;
  });

  useEffect(() => {
    const api = gridApiRef.current;

    // Immediate check — O(ranges) or O(1) for fallback
    const quickCount = api
      ? fastCellCount(api)
      : (fallbackCellsRef.current?.length ?? 0);

    if (quickCount < 2) {
      setVisible(false);
      setCellCount(0);
      setCountReady(false);
      setStats(undefined);
      return undefined;
    }

    // Immediate: show bar with all spinners (count included)
    setVisible(true);
    setCellCount(0);
    setCountReady(false);
    setStats(undefined);

    let cancelled = false;

    // Phase 1: resolve count after 50 ms debounce
    const countId = globalThis.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const currentApi = gridApiRef.current;
      const count = currentApi
        ? fastCellCount(currentApi)
        : (fallbackCellsRef.current?.length ?? 0);
      if (count >= 2) {
        setCellCount(count);
        setCountReady(true);
      } else {
        // Selection shrunk below 2 during debounce — hide
        setVisible(false);
        setCellCount(0);
        setCountReady(false);
      }
    }, COUNT_DEBOUNCE_MS);

    // Phase 2: read cells + compute stats after 200 ms, deferred past a paint
    let rafId = 0;
    const statsId = globalThis.setTimeout(() => {
      if (cancelled) {
        return;
      }
      rafId = requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        const currentApi = gridApiRef.current;
        const cells = currentApi
          ? readSelectedCells(currentApi)
          : (fallbackCellsRef.current ?? []);
        const result = computeCellSelectionStats(cells, columnTypesRef.current);
        // Also ensure count is accurate from the actual cell read
        setCellCount(cells.length);
        setCountReady(true);
        setStats(result);
      });
    }, STATS_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(countId);
      globalThis.clearTimeout(statsId);
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [selectionVersion, gridApiRef]);

  if (!visible) {
    return undefined;
  }

  return { cellCount, countReady, stats };
};
