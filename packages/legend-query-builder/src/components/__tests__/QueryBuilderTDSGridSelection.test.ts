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

import { describe, test, expect } from '@jest/globals';
import type {
  DataGridApi,
  DataGridCellRange,
  DataGridColumnDefinition,
  DataGridIRowNode,
} from '@finos/legend-lego/data-grid';
import type { TDSResultCellData, TDSRowDataType } from '@finos/legend-graph';

// ---------------------------------------------------------------------------
// Standalone copy of the cell-range deduplication algorithm.
// The original getSelectedCells function was removed from
// QueryBuilderTDSGridResult.tsx and replaced by readSelectedCells in
// QueryBuilderTDSAsyncCellSelectionStats.ts, but the core deduplication
// logic (seen-map keyed by `${row}|${colId}`) is identical.
// These tests validate that deduplication independently of the React hook.
// ---------------------------------------------------------------------------

function getSelectedCells(
  api: DataGridApi<TDSRowDataType>,
): TDSResultCellData[] {
  const selectedRanges = api.getCellRanges();
  const nodes: DataGridIRowNode<TDSRowDataType>[] = [];
  api.forEachNode((node) => nodes.push(node));
  const columns = api.getColumnDefs() as DataGridColumnDefinition[];
  const seen = new Map<string, TDSResultCellData>();
  if (selectedRanges) {
    for (const selectedRange of selectedRanges) {
      const rangeStart: number = selectedRange.startRow?.rowIndex ?? 0;
      const rangeEnd: number = selectedRange.endRow?.rowIndex ?? 0;
      const startRow = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const endRow = rangeStart < rangeEnd ? rangeEnd : rangeStart;
      const selectedColumns: string[] = selectedRange.columns.map((col) =>
        col.getColId(),
      );
      for (let x = startRow; x <= endRow; x++) {
        const curRowData = nodes.find(
          (n) => (n as DataGridIRowNode).rowIndex === x,
        )?.data;
        if (curRowData) {
          for (const colId of selectedColumns) {
            const key = `${x}|${colId}`;
            if (!seen.has(key)) {
              seen.set(key, {
                value: Object.entries(curRowData)
                  .find((rData) => rData[0] === colId)
                  ?.at(1),
                columnName: colId,
                coordinates: {
                  rowIndex: x,
                  colIndex: columns.findIndex((c) => c.colId === colId),
                },
              } as TDSResultCellData);
            }
          }
        }
      }
    }
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const makeColObj = (colId: string) => ({ getColId: () => colId });

/** Build a minimal row-data entry from a plain object. */
const makeNode = (
  rowIndex: number,
  data: Record<string, unknown>,
): DataGridIRowNode<TDSRowDataType> =>
  ({ rowIndex, data }) as unknown as DataGridIRowNode<TDSRowDataType>;

/** Build a range descriptor. Ranges are always ordered lo→hi internally. */
const makeRange = (
  startRow: number,
  endRow: number,
  colIds: string[],
): DataGridCellRange =>
  ({
    startRow: { rowIndex: startRow },
    endRow: { rowIndex: endRow },
    columns: colIds.map(makeColObj),
  }) as unknown as DataGridCellRange;

/** Build a mock DataGridApi with the given ranges and row-data. */
const makeMockApi = (
  ranges: DataGridCellRange[],
  nodes: DataGridIRowNode<TDSRowDataType>[],
  colDefs: DataGridColumnDefinition[],
): DataGridApi<TDSRowDataType> =>
  ({
    getCellRanges: () => ranges,
    forEachNode: (cb: (node: DataGridIRowNode<TDSRowDataType>) => void) =>
      nodes.forEach(cb),
    getColumnDefs: () => colDefs,
  }) as unknown as DataGridApi<TDSRowDataType>;

const colDefs = (ids: string[]): DataGridColumnDefinition[] =>
  ids.map((id) => ({ colId: id }) as unknown as DataGridColumnDefinition);

// ---------------------------------------------------------------------------

describe('getSelectedCells (enterprise grid deduplication)', () => {
  // --- basic single range ---

  test('returns correct cells for a single-cell selection', () => {
    const nodes = [makeNode(0, { Name: 'Alice', Age: 30 })];
    const ranges = [makeRange(0, 0, ['Name'])];
    const api = makeMockApi(ranges, nodes, colDefs(['Name', 'Age']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe('Alice');
    expect(result[0]?.columnName).toBe('Name');
    expect(result[0]?.coordinates.rowIndex).toBe(0);
  });

  test('returns correct cells for a multi-row single-column range', () => {
    const nodes = [
      makeNode(0, { Score: 10 }),
      makeNode(1, { Score: 20 }),
      makeNode(2, { Score: 30 }),
    ];
    const ranges = [makeRange(0, 2, ['Score'])];
    const api = makeMockApi(ranges, nodes, colDefs(['Score']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.value)).toEqual([10, 20, 30]);
  });

  test('returns correct cells for a multi-column single-row range', () => {
    const nodes = [makeNode(0, { A: 1, B: 2, C: 3 })];
    const ranges = [makeRange(0, 0, ['A', 'B', 'C'])];
    const api = makeMockApi(ranges, nodes, colDefs(['A', 'B', 'C']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(3);
    const vals = result.map((c) => c.value);
    expect(vals).toContain(1);
    expect(vals).toContain(2);
    expect(vals).toContain(3);
  });

  test('handles reversed range (endRow < startRow) correctly', () => {
    // Drag upwards produces startRow > endRow
    const nodes = [
      makeNode(0, { Val: 'a' }),
      makeNode(1, { Val: 'b' }),
      makeNode(2, { Val: 'c' }),
    ];
    const range = {
      startRow: { rowIndex: 2 },
      endRow: { rowIndex: 0 },
      columns: [makeColObj('Val')],
    } as unknown as DataGridCellRange;
    const api = makeMockApi([range], nodes, colDefs(['Val']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(3);
  });

  // --- deduplication: overlapping ranges from Ctrl+click ---

  test('deduplicates cells when two ranges cover the same cell', () => {
    // Range 1: rows 0-2, col A
    // Range 2: row 1, col A  ← overlaps row 1
    const nodes = [
      makeNode(0, { A: 'x' }),
      makeNode(1, { A: 'y' }),
      makeNode(2, { A: 'z' }),
    ];
    const ranges = [makeRange(0, 2, ['A']), makeRange(1, 1, ['A'])];
    const api = makeMockApi(ranges, nodes, colDefs(['A']));

    const result = getSelectedCells(api);
    // Should be 3 unique cells, not 4 (row1/A would be double-counted without dedup)
    expect(result).toHaveLength(3);
  });

  test('deduplicates cells when three ranges all cover the same single cell', () => {
    const nodes = [makeNode(0, { Score: 42 })];
    // Simulate Ctrl+clicking the same cell 3 times → 3 overlapping ranges
    const ranges = [
      makeRange(0, 0, ['Score']),
      makeRange(0, 0, ['Score']),
      makeRange(0, 0, ['Score']),
    ];
    const api = makeMockApi(ranges, nodes, colDefs(['Score']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe(42);
  });

  test('does not deduplicate cells with same column but different rows', () => {
    const nodes = [makeNode(0, { A: 1 }), makeNode(1, { A: 2 })];
    const ranges = [makeRange(0, 0, ['A']), makeRange(1, 1, ['A'])];
    const api = makeMockApi(ranges, nodes, colDefs(['A']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(2);
  });

  test('does not deduplicate cells with same row but different columns', () => {
    const nodes = [makeNode(0, { A: 1, B: 2 })];
    const ranges = [makeRange(0, 0, ['A']), makeRange(0, 0, ['B'])];
    const api = makeMockApi(ranges, nodes, colDefs(['A', 'B']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(2);
  });

  test('count is correct after ctrl-clicking multiple cells with overlaps', () => {
    // 3 distinct cells across 2 ranges, one cell in common
    const nodes = [
      makeNode(0, { Val: 10 }),
      makeNode(1, { Val: 20 }),
      makeNode(2, { Val: 30 }),
    ];
    // Range 1: rows 0-1 ; Range 2: rows 1-2 → row 1 is in both
    const ranges = [makeRange(0, 1, ['Val']), makeRange(1, 2, ['Val'])];
    const api = makeMockApi(ranges, nodes, colDefs(['Val']));

    const result = getSelectedCells(api);
    expect(result).toHaveLength(3); // not 4
    const total = result.reduce((s, c) => s + (c.value as number), 0);
    expect(total).toBe(60); // 10+20+30, not 10+20+20+30
  });

  // --- null row data ---

  test('skips rows with no matching node data', () => {
    // Node only covers row 0; range asks for rows 0 and 1
    const nodes = [makeNode(0, { X: 'a' })];
    const ranges = [makeRange(0, 1, ['X'])];
    const api = makeMockApi(ranges, nodes, colDefs(['X']));

    const result = getSelectedCells(api);
    // Row 1 has no node → only row 0 returned
    expect(result).toHaveLength(1);
    expect(result[0]?.coordinates.rowIndex).toBe(0);
  });

  test('returns empty array when no ranges are selected', () => {
    const nodes = [makeNode(0, { A: 1 })];
    const api = makeMockApi([], nodes, colDefs(['A']));
    expect(getSelectedCells(api)).toHaveLength(0);
  });

  test('returns empty array when getCellRanges returns null', () => {
    const api = {
      getCellRanges: () => null,
      forEachNode: () => {},
      getColumnDefs: () => [],
    } as unknown as DataGridApi<TDSRowDataType>;
    expect(getSelectedCells(api)).toHaveLength(0);
  });
});
