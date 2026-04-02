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

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import {
  PRIMITIVE_TYPE,
  type TDSResultCellData,
  type TDSRowDataType,
} from '@finos/legend-graph';
import {
  useAsyncCellSelectionStats,
  type AsyncCellSelectionStatsResult,
} from '../result/tds/QueryBuilderTDSAsyncCellSelectionStats.js';
import type React from 'react';
import type {
  DataGridApi,
  DataGridCellRange,
} from '@finos/legend-lego/data-grid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCell = (
  value: string | number | null,
  columnName: string,
  rowIndex = 0,
  colIndex = 0,
): TDSResultCellData => ({
  value,
  columnName,
  coordinates: { rowIndex, colIndex },
});

const strTypeMap = new Map<string, string | undefined>([
  ['col', PRIMITIVE_TYPE.STRING],
]);

/** A null gridApiRef — forces the hook to use fallbackCells. */
const nullGridApiRef = {
  current: null,
} as React.RefObject<null>;

// ---------------------------------------------------------------------------
// Mock AG Grid API helpers
// ---------------------------------------------------------------------------

/** Builds a minimal mock AG Grid API that `fastCellCount` and `readSelectedCells` can use. */
const buildMockGridApi = (
  rows: Record<string, unknown>[],
  ranges: {
    startRow: number;
    endRow: number;
    colIds: string[];
  }[],
  columnDefs?: { colId: string }[],
): DataGridApi<TDSRowDataType> => {
  // Derive colIds from columnDefs or from the first range
  const allColIds = columnDefs
    ? columnDefs.map((c) => c.colId)
    : ranges.length > 0
      ? (ranges[0]?.colIds ?? [])
      : [];

  const mockRanges: DataGridCellRange[] = ranges.map((r) => ({
    startRow: { rowIndex: r.startRow, rowPinned: null },
    endRow: { rowIndex: r.endRow, rowPinned: null },
    columns: r.colIds.map(
      (id) =>
        ({
          getColId: () => id,
        }) as unknown as DataGridCellRange['columns'][number],
    ),
  })) as unknown as DataGridCellRange[];

  return {
    getCellRanges: () => mockRanges,
    forEachNode: (
      callback: (node: { rowIndex: number | null; data: unknown }) => void,
    ) => {
      rows.forEach((row, i) => {
        callback({ rowIndex: i, data: row });
      });
    },
    getColumns: () =>
      (columnDefs ?? allColIds.map((id) => ({ colId: id }))).map((c) => ({
        getColId: () => c.colId,
      })),
  } as unknown as DataGridApi<TDSRowDataType>;
};

const buildGridApiRef = (
  api: DataGridApi<TDSRowDataType>,
): React.RefObject<DataGridApi<TDSRowDataType>> =>
  ({ current: api }) as React.RefObject<DataGridApi<TDSRowDataType>>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAsyncCellSelectionStats', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock requestAnimationFrame to fire synchronously in tests
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(performance.now());
        return 0;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('returns undefined when fewer than 2 cells are selected', () => {
    const cells = [makeCell('a', 'col', 0, 0)];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );
    expect(result.current).toBeUndefined();
  });

  test('returns undefined when selection is empty', () => {
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(0, strTypeMap, nullGridApiRef, []),
    );
    expect(result.current).toBeUndefined();
  });

  test('immediately shows bar with countReady=false when ≥2 cells', () => {
    const cells = [makeCell('a', 'col', 0, 0), makeCell('b', 'col', 1, 0)];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );
    // Immediate: bar visible, count not ready, stats not ready
    expect(result.current).not.toBeUndefined();
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(false);
    expect(r.cellCount).toBe(0);
    expect(r.stats).toBeUndefined();
  });

  test('Phase 1: count resolves after 50ms debounce', () => {
    const cells = [
      makeCell('a', 'col', 0, 0),
      makeCell('b', 'col', 1, 0),
      makeCell('c', 'col', 2, 0),
    ];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );

    // Before 50ms: countReady is false
    expect(result.current).not.toBeUndefined();
    expect((result.current as AsyncCellSelectionStatsResult).countReady).toBe(
      false,
    );

    // Advance to 50ms
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).not.toBeUndefined();
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(true);
    expect(r.cellCount).toBe(3);
    // Stats still not ready — Phase 2 hasn't fired yet
    expect(r.stats).toBeUndefined();
  });

  test('Phase 2: stats resolve after 200ms debounce + rAF', () => {
    const cells = [
      makeCell('a', 'col', 0, 0),
      makeCell('b', 'col', 1, 0),
      makeCell('a', 'col', 2, 0),
      makeCell(null, 'col', 3, 0),
    ];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );

    // Advance past Phase 2 (200ms timer + rAF)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).not.toBeUndefined();
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(true);
    expect(r.cellCount).toBe(4);
    expect(r.stats).not.toBeUndefined();
    expect(r.stats?.uniqueCount).toBe(2); // alpha, beta
    expect(r.stats?.nullCount).toBe(1);
  });

  test('selection version change cancels previous timers and restarts', () => {
    const cells2 = [makeCell('x', 'col', 0, 0), makeCell('y', 'col', 1, 0)];
    const cells3 = [
      makeCell('x', 'col', 0, 0),
      makeCell('y', 'col', 1, 0),
      makeCell('z', 'col', 2, 0),
    ];

    // Start with version 1, 2 cells
    const { result, rerender } = renderHook(
      ({ version, cells }: { version: number; cells: TDSResultCellData[] }) =>
        useAsyncCellSelectionStats(version, strTypeMap, nullGridApiRef, cells),
      { initialProps: { version: 1, cells: cells2 } },
    );

    // Advance 30ms (not enough for Phase 1)
    act(() => {
      jest.advanceTimersByTime(30);
    });

    // Selection changes — rerender with version 2, 3 cells
    rerender({ version: 2, cells: cells3 });

    // Advance another 50ms (total 80ms from first render, but only 50ms from rerender)
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current).not.toBeUndefined();
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(true);
    // Should show 3 (from cells3), not 2 (from cells2)
    expect(r.cellCount).toBe(3);
  });

  test('hides bar when selection drops below 2', () => {
    const cells2 = [makeCell('a', 'col', 0, 0), makeCell('b', 'col', 1, 0)];
    const cells1 = [makeCell('a', 'col', 0, 0)];

    const { result, rerender } = renderHook(
      ({ version, cells }: { version: number; cells: TDSResultCellData[] }) =>
        useAsyncCellSelectionStats(version, strTypeMap, nullGridApiRef, cells),
      { initialProps: { version: 1, cells: cells2 } },
    );

    // Bar is visible
    expect(result.current).not.toBeUndefined();

    // Selection shrinks to 1 cell
    rerender({ version: 2, cells: cells1 });

    // Bar should be immediately hidden
    expect(result.current).toBeUndefined();
  });

  test('Phase 2 updates cellCount to exact deduplicated count', () => {
    const cells = [makeCell('a', 'col', 0, 0), makeCell('b', 'col', 1, 0)];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );

    // Advance fully past Phase 2
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).not.toBeUndefined();
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.cellCount).toBe(2);
    expect(r.countReady).toBe(true);
    expect(r.stats).not.toBeUndefined();
  });

  test('intermediate Phase 1 fires before Phase 2', () => {
    const cells = [
      makeCell('a', 'col', 0, 0),
      makeCell('b', 'col', 1, 0),
      makeCell('c', 'col', 2, 0),
    ];
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, nullGridApiRef, cells),
    );

    // At 50ms: Phase 1 fires, count resolved, stats not yet
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).not.toBeUndefined();
    let r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(true);
    expect(r.cellCount).toBe(3);
    expect(r.stats).toBeUndefined();

    // At 200ms: Phase 2 fires, stats resolved
    act(() => {
      jest.advanceTimersByTime(150);
    });
    r = result.current as AsyncCellSelectionStatsResult;
    expect(r.stats).not.toBeUndefined();
    expect(r.stats?.uniqueCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Grid API path — exercises fastCellCount and readSelectedCells
  // -------------------------------------------------------------------------

  test('gridApiRef path: immediate show via fastCellCount', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }, { col: 'b' }, { col: 'c' }],
      [{ startRow: 0, endRow: 2, colIds: ['col'] }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    // fastCellCount returns 3 (3 rows × 1 col) → bar shown immediately
    expect(result.current).not.toBeUndefined();
    expect((result.current as AsyncCellSelectionStatsResult).countReady).toBe(
      false,
    );
  });

  test('gridApiRef path: Phase 1 resolves count from fastCellCount', () => {
    const api = buildMockGridApi(
      [{ col: 'x' }, { col: 'y' }],
      [{ startRow: 0, endRow: 1, colIds: ['col'] }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(50);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.countReady).toBe(true);
    expect(r.cellCount).toBe(2);
  });

  test('gridApiRef path: Phase 2 reads cells via readSelectedCells', () => {
    const api = buildMockGridApi(
      [{ col: 'alpha' }, { col: 'beta' }, { col: 'alpha' }],
      [{ startRow: 0, endRow: 2, colIds: ['col'] }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.stats).not.toBeUndefined();
    expect(r.cellCount).toBe(3);
    expect(r.stats?.uniqueCount).toBe(2); // alpha, beta
  });

  test('gridApiRef path: multi-column range', () => {
    const typeMap = new Map<string, string | undefined>([
      ['A', PRIMITIVE_TYPE.STRING],
      ['B', PRIMITIVE_TYPE.STRING],
    ]);
    const api = buildMockGridApi(
      [
        { A: 'a1', B: 'b1' },
        { A: 'a2', B: 'b2' },
      ],
      [{ startRow: 0, endRow: 1, colIds: ['A', 'B'] }],
      [{ colId: 'A' }, { colId: 'B' }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, typeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.cellCount).toBe(4); // 2 rows × 2 cols
    expect(r.stats).not.toBeUndefined();
  });

  test('gridApiRef path: reversed range (endRow < startRow)', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }, { col: 'b' }, { col: 'c' }],
      [{ startRow: 2, endRow: 0, colIds: ['col'] }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.cellCount).toBe(3);
  });

  test('gridApiRef path: overlapping ranges deduplicate cells', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }, { col: 'b' }, { col: 'c' }],
      [
        { startRow: 0, endRow: 2, colIds: ['col'] },
        { startRow: 1, endRow: 2, colIds: ['col'] }, // overlaps rows 1-2
      ],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    // readSelectedCells deduplicates: 3 unique cells, not 5
    expect(r.cellCount).toBe(3);
  });

  test('gridApiRef path: empty ranges returns hidden', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }],
      [], // no ranges
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    // fastCellCount returns 0 → hidden
    expect(result.current).toBeUndefined();
  });

  test('gridApiRef path: single-cell range returns hidden', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }],
      [{ startRow: 0, endRow: 0, colIds: ['col'] }],
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    // fastCellCount returns 1 → hidden
    expect(result.current).toBeUndefined();
  });

  test('gridApiRef path: row with null data is skipped', () => {
    // forEachNode yields a node where data is null for row 1
    const api = {
      getCellRanges: () => [
        {
          startRow: { rowIndex: 0, rowPinned: null },
          endRow: { rowIndex: 2, rowPinned: null },
          columns: [{ getColId: () => 'col' }],
        },
      ],
      forEachNode: (
        cb: (node: { rowIndex: number | null; data: unknown }) => void,
      ) => {
        cb({ rowIndex: 0, data: { col: 'a' } });
        cb({ rowIndex: 1, data: null }); // null data
        cb({ rowIndex: 2, data: { col: 'c' } });
      },
      getColumns: () => [{ getColId: () => 'col' }],
    } as unknown as DataGridApi<TDSRowDataType>;
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    // Row 1 skipped, so only 2 cells read
    expect(r.cellCount).toBe(2);
  });

  test('gridApiRef path: getCellRanges returns null', () => {
    const api = {
      getCellRanges: () => null,
      forEachNode: () => {},
      getColumns: () => [],
    } as unknown as DataGridApi<TDSRowDataType>;
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    expect(result.current).toBeUndefined();
  });

  test('gridApiRef path: getCellRanges throws', () => {
    const api = {
      getCellRanges: () => {
        throw new Error('boom');
      },
      forEachNode: () => {},
      getColumns: () => [],
    } as unknown as DataGridApi<TDSRowDataType>;
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    // fastCellCount catches the error and returns 0 → hidden
    expect(result.current).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Cancellation and debounce edge cases
  // -------------------------------------------------------------------------

  test('Phase 1 hides bar if selection shrinks below 2 during debounce', () => {
    // Start with 3 cells via grid API
    const api3 = buildMockGridApi(
      [{ col: 'a' }, { col: 'b' }, { col: 'c' }],
      [{ startRow: 0, endRow: 2, colIds: ['col'] }],
    );
    const ref = { current: api3 } as React.MutableRefObject<
      DataGridApi<TDSRowDataType>
    >;
    const { result } = renderHook(
      ({ version }: { version: number }) =>
        useAsyncCellSelectionStats(
          version,
          strTypeMap,
          ref as unknown as React.RefObject<DataGridApi<TDSRowDataType>>,
        ),
      { initialProps: { version: 1 } },
    );
    // Bar is visible immediately
    expect(result.current).not.toBeUndefined();

    // Before Phase 1 fires, swap the API to return 1 cell
    const api1 = buildMockGridApi(
      [{ col: 'a' }],
      [{ startRow: 0, endRow: 0, colIds: ['col'] }],
    );
    ref.current = api1;

    // Advance to Phase 1
    act(() => {
      jest.advanceTimersByTime(50);
    });
    // Phase 1 sees count=1 < 2 → hides bar
    expect(result.current).toBeUndefined();
  });

  test('cancellation: Phase 2 does not fire if selection changes before 200ms', () => {
    const cells2 = [makeCell('a', 'col', 0, 0), makeCell('b', 'col', 1, 0)];
    const cells1 = [makeCell('a', 'col', 0, 0)];
    const { result, rerender } = renderHook(
      ({ version, cells }: { version: number; cells: TDSResultCellData[] }) =>
        useAsyncCellSelectionStats(version, strTypeMap, nullGridApiRef, cells),
      { initialProps: { version: 1, cells: cells2 } },
    );

    // Advance 100ms — Phase 1 fired, but Phase 2 hasn't yet
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).not.toBeUndefined();
    expect(
      (result.current as AsyncCellSelectionStatsResult).stats,
    ).toBeUndefined();

    // Selection changes to 1 cell — cancels Phase 2 timer
    rerender({ version: 2, cells: cells1 });
    expect(result.current).toBeUndefined();

    // Advance way past Phase 2 — should NOT resurrect the bar
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBeUndefined();
  });

  test('multiple rapid version changes only compute for the final selection', () => {
    const { result, rerender } = renderHook(
      ({ version, cells }: { version: number; cells: TDSResultCellData[] }) =>
        useAsyncCellSelectionStats(version, strTypeMap, nullGridApiRef, cells),
      {
        initialProps: {
          version: 1,
          cells: [makeCell('a', 'col', 0), makeCell('b', 'col', 1)],
        },
      },
    );

    // Rapid changes every 10ms
    for (let v = 2; v <= 5; v++) {
      act(() => {
        jest.advanceTimersByTime(10);
      });
      rerender({
        version: v,
        cells: [
          makeCell(`v${v}a`, 'col', 0),
          makeCell(`v${v}b`, 'col', 1),
          makeCell(`v${v}c`, 'col', 2),
        ],
      });
    }

    // Advance to let final version complete
    act(() => {
      jest.advanceTimersByTime(200);
    });

    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.stats).not.toBeUndefined();
    // Final version had 3 cells with values v5a, v5b, v5c
    expect(r.cellCount).toBe(3);
    expect(r.stats?.uniqueCount).toBe(3);
  });

  test('gridApiRef path: node with null rowIndex is skipped', () => {
    const api = {
      getCellRanges: () => [
        {
          startRow: { rowIndex: 0, rowPinned: null },
          endRow: { rowIndex: 1, rowPinned: null },
          columns: [{ getColId: () => 'col' }],
        },
      ],
      forEachNode: (
        cb: (node: { rowIndex: number | null; data: unknown }) => void,
      ) => {
        cb({ rowIndex: 0, data: { col: 'a' } });
        cb({ rowIndex: null, data: { col: 'b' } }); // null rowIndex
        cb({ rowIndex: 1, data: { col: 'c' } });
      },
      getColumns: () => [{ getColId: () => 'col' }],
    } as unknown as DataGridApi<TDSRowDataType>;
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    // Node with null rowIndex is skipped from the map, so only rows 0 and 1 are read
    expect(r.cellCount).toBe(2);
  });

  test('gridApiRef path: column without colId in columnDefs is handled', () => {
    const api = buildMockGridApi(
      [{ col: 'a' }, { col: 'b' }],
      [{ startRow: 0, endRow: 1, colIds: ['col'] }],
      [{ colId: 'col' }, { colId: '' }], // empty colId
    );
    const ref = buildGridApiRef(api);
    const { result } = renderHook(() =>
      useAsyncCellSelectionStats(1, strTypeMap, ref),
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const r = result.current as AsyncCellSelectionStatsResult;
    expect(r.cellCount).toBe(2);
  });
});
