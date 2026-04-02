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

import { describe, test, expect, beforeEach } from '@jest/globals';
import { type TDSResultCellData } from '@finos/legend-graph';

// ---------------------------------------------------------------------------
// Minimal standalone tests for the cell-selection MobX state logic.
// These tests exercise addSelectedCell (deduplication) and setSelectedCells
// without needing a full QueryBuilderState — we test the pure logic directly.
// ---------------------------------------------------------------------------

/** Minimal in-memory replica of the relevant QueryBuilderResultState fields. */
class MinimalSelectionState {
  selectedCells: TDSResultCellData[] = [];

  addSelectedCell(val: TDSResultCellData): void {
    // Mirrors the deduplication logic in QueryBuilderResultState.addSelectedCell
    const alreadyPresent = this.selectedCells.some(
      (c) =>
        c.coordinates.rowIndex === val.coordinates.rowIndex &&
        c.coordinates.colIndex === val.coordinates.colIndex,
    );
    if (!alreadyPresent) {
      this.selectedCells.push(val);
    }
  }

  setSelectedCells(val: TDSResultCellData[]): void {
    this.selectedCells = val;
  }
}

const makeCell = (
  value: string | number | null,
  columnName: string,
  rowIndex: number,
  colIndex: number,
): TDSResultCellData => ({
  value,
  columnName,
  coordinates: { rowIndex, colIndex },
});

// ---------------------------------------------------------------------------

describe('QueryBuilderResultState — cell selection', () => {
  let state: MinimalSelectionState;

  beforeEach(() => {
    state = new MinimalSelectionState();
  });

  // --- setSelectedCells ---

  test('setSelectedCells replaces the entire selection', () => {
    state.addSelectedCell(makeCell('a', 'Name', 0, 0));
    const newCells = [makeCell('x', 'Name', 1, 0), makeCell('y', 'Name', 2, 0)];
    state.setSelectedCells(newCells);
    expect(state.selectedCells).toHaveLength(2);
    const [first, second] = state.selectedCells;
    expect(first?.value).toBe('x');
    expect(second?.value).toBe('y');
  });

  test('setSelectedCells with empty array clears selection', () => {
    state.addSelectedCell(makeCell('a', 'Name', 0, 0));
    state.setSelectedCells([]);
    expect(state.selectedCells).toHaveLength(0);
  });

  // --- addSelectedCell: basic behaviour ---

  test('addSelectedCell adds a cell to an empty selection', () => {
    state.addSelectedCell(makeCell(1, 'Score', 0, 0));
    expect(state.selectedCells).toHaveLength(1);
    expect(state.selectedCells[0]?.value).toBe(1);
  });

  test('addSelectedCell adds multiple distinct cells', () => {
    state.addSelectedCell(makeCell('a', 'Name', 0, 0));
    state.addSelectedCell(makeCell('b', 'Name', 1, 0));
    state.addSelectedCell(makeCell('c', 'Name', 2, 0));
    expect(state.selectedCells).toHaveLength(3);
  });

  test('addSelectedCell adds cells in different columns on the same row', () => {
    state.addSelectedCell(makeCell('Alice', 'Name', 0, 0));
    state.addSelectedCell(makeCell(42, 'Age', 0, 1));
    expect(state.selectedCells).toHaveLength(2);
  });

  // --- addSelectedCell: deduplication ---

  test('addSelectedCell does not add a cell with the same coordinates twice', () => {
    state.addSelectedCell(makeCell('a', 'Name', 0, 0));
    state.addSelectedCell(makeCell('a', 'Name', 0, 0)); // exact duplicate
    expect(state.selectedCells).toHaveLength(1);
  });

  test('addSelectedCell deduplicates even when value differs (coordinates are the key)', () => {
    // Same position, different value — should still deduplicate
    state.addSelectedCell(makeCell('original', 'Name', 3, 1));
    state.addSelectedCell(makeCell('updated', 'Name', 3, 1));
    expect(state.selectedCells).toHaveLength(1);
    expect(state.selectedCells[0]?.value).toBe('original');
  });

  test('addSelectedCell does not deduplicate cells that share rowIndex but differ by colIndex', () => {
    state.addSelectedCell(makeCell('a', 'ColA', 0, 0));
    state.addSelectedCell(makeCell('b', 'ColB', 0, 1)); // same row, different col
    expect(state.selectedCells).toHaveLength(2);
  });

  test('addSelectedCell does not deduplicate cells that share colIndex but differ by rowIndex', () => {
    state.addSelectedCell(makeCell(10, 'Score', 0, 0));
    state.addSelectedCell(makeCell(20, 'Score', 1, 0)); // same col, different row
    expect(state.selectedCells).toHaveLength(2);
  });

  test('adding the same cell repeatedly via Ctrl+click produces exactly one entry', () => {
    const cell = makeCell(99, 'Amount', 5, 2);
    // Simulate user Ctrl+clicking the same cell 5 times
    for (let i = 0; i < 5; i++) {
      state.addSelectedCell({ ...cell });
    }
    expect(state.selectedCells).toHaveLength(1);
  });

  test('stats count is correct after ctrl-clicking already-selected cells', () => {
    // Select 3 distinct cells
    state.addSelectedCell(makeCell(10, 'Score', 0, 0));
    state.addSelectedCell(makeCell(20, 'Score', 1, 0));
    state.addSelectedCell(makeCell(30, 'Score', 2, 0));
    // Ctrl+click the first two again
    state.addSelectedCell(makeCell(10, 'Score', 0, 0));
    state.addSelectedCell(makeCell(20, 'Score', 1, 0));
    // Should still be 3, not 5
    expect(state.selectedCells).toHaveLength(3);
    const total = state.selectedCells.reduce(
      (s, c) => s + (c.value as number),
      0,
    );
    expect(total).toBe(60); // 10+20+30, not 10+20+30+10+20
  });

  test('setSelectedCells then addSelectedCell with duplicate coordinates does not re-add', () => {
    state.setSelectedCells([
      makeCell('x', 'Col', 0, 0),
      makeCell('y', 'Col', 1, 0),
    ]);
    state.addSelectedCell(makeCell('z', 'Col', 0, 0)); // duplicate of row=0,col=0
    expect(state.selectedCells).toHaveLength(2);
  });

  // --- null values ---

  test('addSelectedCell handles null values correctly', () => {
    state.addSelectedCell(makeCell(null, 'Name', 0, 0));
    state.addSelectedCell(makeCell(null, 'Name', 1, 0));
    expect(state.selectedCells).toHaveLength(2);
  });

  test('addSelectedCell deduplicates null-valued cells at the same coordinates', () => {
    state.addSelectedCell(makeCell(null, 'Name', 0, 0));
    state.addSelectedCell(makeCell(null, 'Name', 0, 0));
    expect(state.selectedCells).toHaveLength(1);
  });
});
