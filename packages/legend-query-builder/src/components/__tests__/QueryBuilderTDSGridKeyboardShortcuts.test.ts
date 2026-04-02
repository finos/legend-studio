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

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type {
  DataGridApi,
  DataGridCellKeyDownEvent,
  DataGridCellRange,
  DataGridColumn,
} from '@finos/legend-lego/data-grid';
import type { TDSRowDataType } from '@finos/legend-graph';
import { handleGridKeyboardShortcut } from '../../components/result/tds/QueryBuilderTDSGridKeyboardShortcuts.js';

// ---------------------------------------------------------------------------
// Helpers — minimal AG Grid API mock
// ---------------------------------------------------------------------------

const makeColumn = (colId: string): DataGridColumn =>
  ({ getColId: () => colId }) as unknown as DataGridColumn;

const makeRange = (
  startRow: number,
  endRow: number,
  colIds: string[],
): DataGridCellRange =>
  ({
    startRow: { rowIndex: startRow },
    endRow: { rowIndex: endRow },
    columns: colIds.map(makeColumn),
  }) as unknown as DataGridCellRange;

interface MockApi {
  getDisplayedRowCount: ReturnType<typeof jest.fn>;
  getColumns: ReturnType<typeof jest.fn>;
  getCellRanges: ReturnType<typeof jest.fn>;
  deselectAll: ReturnType<typeof jest.fn>;
  clearCellSelection: ReturnType<typeof jest.fn>;
  addCellRange: ReturnType<typeof jest.fn>;
  getFirstDisplayedRowIndex: ReturnType<typeof jest.fn>;
  getLastDisplayedRowIndex: ReturnType<typeof jest.fn>;
}

/**
 * Default viewport: rows 0–19 visible → getViewportPageSize returns
 * max(1, 19 - 0) = 19.  Tests that care about page size pass explicit
 * firstVisible/lastVisible values.
 */
const DEFAULT_FIRST_VISIBLE = 0;
const DEFAULT_LAST_VISIBLE = 19;
/** Page size produced by the default viewport mock (last - first = 19). */
export const MOCK_PAGE_SIZE = DEFAULT_LAST_VISIBLE - DEFAULT_FIRST_VISIBLE; // 19

const makeMockApi = (
  rowCount = 5,
  colIds = ['A', 'B', 'C'],
  ranges: DataGridCellRange[] = [],
  firstVisible = DEFAULT_FIRST_VISIBLE,
  lastVisible = DEFAULT_LAST_VISIBLE,
): MockApi => ({
  getDisplayedRowCount: jest.fn(() => rowCount),
  getColumns: jest.fn(() => colIds.map(makeColumn)),
  getCellRanges: jest.fn(() => ranges),
  deselectAll: jest.fn(),
  clearCellSelection: jest.fn(),
  addCellRange: jest.fn(),
  getFirstDisplayedRowIndex: jest.fn(() => firstVisible),
  getLastDisplayedRowIndex: jest.fn(() => lastVisible),
});

const makeEvent = (
  keyCode: string,
  opts: { ctrlKey?: boolean; shiftKey?: boolean },
  api: MockApi,
  column: DataGridColumn,
  rowIndex: number | null = 2,
): DataGridCellKeyDownEvent<TDSRowDataType> => {
  const keyEvent = {
    code: keyCode,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    preventDefault: jest.fn(),
  } as unknown as KeyboardEvent;
  return {
    event: keyEvent,
    api: api as unknown as DataGridApi<TDSRowDataType>,
    column,
    rowIndex,
  } as unknown as DataGridCellKeyDownEvent<TDSRowDataType>;
};

function expectFirstCallArg(
  mockFn: ReturnType<typeof jest.fn>,
  matcher: Record<string, unknown>,
): void {
  const arg = (mockFn.mock.calls as unknown[][])[0]?.[0];
  expect(arg).toMatchObject(matcher);
}

function firstCallColumnCount(mockFn: ReturnType<typeof jest.fn>): number {
  const arg = (mockFn.mock.calls as unknown[][])[0]?.[0] as
    | { columns?: unknown[] }
    | undefined;
  return arg?.columns?.length ?? 0;
}

function firstCallFirstColumnId(mockFn: ReturnType<typeof jest.fn>): string {
  const arg = (mockFn.mock.calls as unknown[][])[0]?.[0] as
    | { columns?: Array<{ getColId: () => string }> }
    | undefined;
  return arg?.columns?.[0]?.getColId() ?? '';
}

function firstCallColumnIds(mockFn: ReturnType<typeof jest.fn>): string[] {
  const arg = (mockFn.mock.calls as unknown[][])[0]?.[0] as
    | { columns?: Array<{ getColId: () => string }> }
    | undefined;
  return arg?.columns?.map((c) => c.getColId()) ?? [];
}

// ---------------------------------------------------------------------------

describe('handleGridKeyboardShortcut', () => {
  let api: MockApi;
  let col: DataGridColumn;

  beforeEach(() => {
    api = makeMockApi(5, ['ColA', 'ColB', 'ColC']);
    col = makeColumn('ColA');
  });

  // --- no-op cases ---

  test('does nothing when event.event is undefined', () => {
    const event = {
      event: undefined,
      api: api as unknown as DataGridApi<TDSRowDataType>,
      column: col,
      rowIndex: 0,
    } as unknown as DataGridCellKeyDownEvent<TDSRowDataType>;
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('does nothing for an unrelated key (e.g. ArrowDown)', () => {
    const event = makeEvent('ArrowDown', {}, api, col);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('does nothing for Ctrl+B (unrelated shortcut)', () => {
    const event = makeEvent('KeyB', { ctrlKey: true }, api, col);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('does nothing for plain Space (no modifier)', () => {
    const event = makeEvent('Space', {}, api, col);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  // --- Ctrl+A ---

  test('Ctrl+A selects all cells (0 to rowCount-1, all columns)', () => {
    const event = makeEvent('KeyA', { ctrlKey: true }, api, col);
    handleGridKeyboardShortcut(event);
    expect(api.deselectAll).toHaveBeenCalledTimes(1);
    expect(api.clearCellSelection).toHaveBeenCalledTimes(1);
    expect(api.addCellRange).toHaveBeenCalledTimes(1);
    expect(api.addCellRange).toHaveBeenCalledWith({
      rowStartIndex: 0,
      rowEndIndex: 4,
      columns: expect.arrayContaining([
        expect.objectContaining({ getColId: expect.any(Function) }),
      ]),
    });
    expect(firstCallColumnCount(api.addCellRange)).toBe(3);
  });

  test('Ctrl+A calls preventDefault', () => {
    const event = makeEvent('KeyA', { ctrlKey: true }, api, col);
    handleGridKeyboardShortcut(event);
    const keyEvent = event.event as unknown as { preventDefault: jest.Mock };
    expect(keyEvent.preventDefault).toHaveBeenCalled();
  });

  test('Ctrl+A does nothing when grid has 0 rows', () => {
    api = makeMockApi(0, ['ColA']);
    const event = makeEvent('KeyA', { ctrlKey: true }, api, col);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Ctrl+A does nothing when grid has no columns', () => {
    api = makeMockApi(5, []);
    const event = makeEvent('KeyA', { ctrlKey: true }, api, makeColumn('X'));
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Ctrl+A with 1 row selects rowStartIndex=0 rowEndIndex=0', () => {
    api = makeMockApi(1, ['ColA', 'ColB']);
    const event = makeEvent('KeyA', { ctrlKey: true }, api, makeColumn('ColA'));
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 0, rowEndIndex: 0 });
  });

  // --- Ctrl+Space: no prior selection → falls back to focused column ---

  test('Ctrl+Space with no prior range selects entire focused column', () => {
    api = makeMockApi(5, ['ColA', 'ColB', 'ColC'], []);
    const event = makeEvent(
      'Space',
      { ctrlKey: true },
      api,
      makeColumn('ColA'),
      2,
    );
    handleGridKeyboardShortcut(event);
    expect(api.deselectAll).toHaveBeenCalledTimes(1);
    expect(api.clearCellSelection).toHaveBeenCalledTimes(1);
    expect(api.addCellRange).toHaveBeenCalledTimes(1);
    expect(api.addCellRange).toHaveBeenCalledWith({
      rowStartIndex: 0,
      rowEndIndex: 4,
      columns: expect.any(Array),
    });
    expect(firstCallColumnCount(api.addCellRange)).toBe(1);
    expect(firstCallFirstColumnId(api.addCellRange)).toBe('ColA');
  });

  // --- Ctrl+Space: expands from last range's columns (Excel behaviour) ---

  test('Ctrl+Space with multi-column range selects all those columns full-height', () => {
    const range = makeRange(1, 3, ['ColA', 'ColC']); // 2 columns selected
    api = makeMockApi(5, ['ColA', 'ColB', 'ColC'], [range]);
    const event = makeEvent(
      'Space',
      { ctrlKey: true },
      api,
      makeColumn('ColA'),
      1,
    );
    handleGridKeyboardShortcut(event);
    expect(firstCallColumnCount(api.addCellRange)).toBe(2);
    const ids = firstCallColumnIds(api.addCellRange);
    expect(ids).toContain('ColA');
    expect(ids).toContain('ColC');
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 0, rowEndIndex: 4 });
  });

  test('Ctrl+Space uses the LAST range when multiple ranges exist', () => {
    const range1 = makeRange(0, 0, ['ColA']);
    const range2 = makeRange(2, 2, ['ColB', 'ColC']); // last range
    api = makeMockApi(5, ['ColA', 'ColB', 'ColC'], [range1, range2]);
    const event = makeEvent(
      'Space',
      { ctrlKey: true },
      api,
      makeColumn('ColA'),
      2,
    );
    handleGridKeyboardShortcut(event);
    const ids = firstCallColumnIds(api.addCellRange);
    expect(ids).toContain('ColB');
    expect(ids).toContain('ColC');
    expect(ids).not.toContain('ColA');
  });

  test('Ctrl+Space calls preventDefault', () => {
    const event = makeEvent('Space', { ctrlKey: true }, api, col, 2);
    handleGridKeyboardShortcut(event);
    const keyEvent = event.event as unknown as { preventDefault: jest.Mock };
    expect(keyEvent.preventDefault).toHaveBeenCalled();
  });

  test('Ctrl+Space does nothing when rowIndex is null', () => {
    const event = makeEvent('Space', { ctrlKey: true }, api, col, null);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Ctrl+Space does nothing when grid has 0 rows', () => {
    api = makeMockApi(0, ['ColA'], []);
    const event = makeEvent(
      'Space',
      { ctrlKey: true },
      api,
      makeColumn('ColA'),
      0,
    );
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  // --- Shift+Space: no prior selection → falls back to focused row ---

  test('Shift+Space with no prior range selects entire focused row', () => {
    api = makeMockApi(5, ['ColA', 'ColB', 'ColC'], []);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('ColA'),
      2,
    );
    handleGridKeyboardShortcut(event);
    expect(api.deselectAll).toHaveBeenCalledTimes(1);
    expect(api.clearCellSelection).toHaveBeenCalledTimes(1);
    expect(api.addCellRange).toHaveBeenCalledTimes(1);
    expectFirstCallArg(api.addCellRange, {
      rowStartIndex: 2,
      rowEndIndex: 2,
    });
    expect(firstCallColumnCount(api.addCellRange)).toBe(3); // all columns
  });

  // --- Shift+Space: expands from last range's rows (Excel behaviour) ---

  test('Shift+Space with multi-row range selects all those rows full-width', () => {
    const range = makeRange(1, 4, ['ColB']); // rows 1-4 in last range
    api = makeMockApi(6, ['ColA', 'ColB', 'ColC'], [range]);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('ColB'),
      1,
    );
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 1, rowEndIndex: 4 });
    expect(firstCallColumnCount(api.addCellRange)).toBe(3); // all columns
  });

  test('Shift+Space normalises inverted range (endRow < startRow)', () => {
    // Drag upward produces startRow > endRow
    const range = makeRange(4, 1, ['ColA']); // startRow=4, endRow=1
    api = makeMockApi(6, ['ColA', 'ColB'], [range]);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('ColA'),
      4,
    );
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 1, rowEndIndex: 4 });
  });

  test('Shift+Space uses the LAST range when multiple ranges exist', () => {
    const range1 = makeRange(0, 0, ['ColA']);
    const range2 = makeRange(3, 5, ['ColA']); // last range rows 3-5
    api = makeMockApi(7, ['ColA', 'ColB'], [range1, range2]);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('ColA'),
      3,
    );
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 3, rowEndIndex: 5 });
  });

  test('Shift+Space calls preventDefault', () => {
    const event = makeEvent('Space', { shiftKey: true }, api, col, 2);
    handleGridKeyboardShortcut(event);
    const keyEvent = event.event as unknown as { preventDefault: jest.Mock };
    expect(keyEvent.preventDefault).toHaveBeenCalled();
  });

  test('Shift+Space does nothing when rowIndex is null', () => {
    const event = makeEvent('Space', { shiftKey: true }, api, col, null);
    handleGridKeyboardShortcut(event);
    expect(api.clearCellSelection).not.toHaveBeenCalled();
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Shift+Space does nothing when grid has no columns', () => {
    api = makeMockApi(5, [], []);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('X'),
      1,
    );
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Shift+Space selects correct row when focused cell is on the last row', () => {
    api = makeMockApi(10, ['A', 'B'], []);
    const event = makeEvent(
      'Space',
      { shiftKey: true },
      api,
      makeColumn('A'),
      9,
    );
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 9, rowEndIndex: 9 });
  });

  // --- Shift+Space calls deselectAll then clearCellSelection then addCellRange in order ---

  test('Shift+Space clears existing selection before adding new range', () => {
    const callOrder: string[] = [];
    api.deselectAll.mockImplementation(() => callOrder.push('deselect'));
    api.clearCellSelection.mockImplementation(() => callOrder.push('clear'));
    api.addCellRange.mockImplementation(() => callOrder.push('add'));
    const event = makeEvent('Space', { shiftKey: true }, api, col, 0);
    handleGridKeyboardShortcut(event);
    expect(callOrder).toEqual(['deselect', 'clear', 'add']);
  });

  // --- Shift+PageDown ---

  test('Shift+PageDown with no prior range extends one viewport-page down from focused row', () => {
    api = makeMockApi(100, ['A', 'B'], []);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      5,
    );
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).toHaveBeenCalledTimes(1);
    // page size = MOCK_PAGE_SIZE (19), new end = 5 + 19 = 24
    expectFirstCallArg(api.addCellRange, {
      rowStartIndex: 5,
      rowEndIndex: 5 + MOCK_PAGE_SIZE,
    });
  });

  test('Shift+PageDown extends last range end downward by one viewport-page', () => {
    const range = makeRange(2, 8, ['A']);
    api = makeMockApi(100, ['A', 'B'], [range]);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      8,
    );
    handleGridKeyboardShortcut(event);
    // page size = 19, new end = 8 + 19 = 27
    expectFirstCallArg(api.addCellRange, {
      rowStartIndex: 2,
      rowEndIndex: 8 + MOCK_PAGE_SIZE,
    });
  });

  test('Shift+PageDown clamps to last row', () => {
    const range = makeRange(0, 90, ['A']);
    api = makeMockApi(100, ['A'], [range]);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      90,
    );
    handleGridKeyboardShortcut(event);
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 0, rowEndIndex: 99 });
  });

  test('Shift+PageDown uses actual viewport size not a hardcoded constant', () => {
    // viewport shows rows 10–29 → page size = 19
    api = makeMockApi(200, ['A'], [], 10, 29);
    const range = makeRange(5, 15, ['A']);
    api.getCellRanges.mockReturnValue([range]);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      15,
    );
    handleGridKeyboardShortcut(event);
    // page size = 29 - 10 = 19, new end = 15 + 19 = 34
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 5, rowEndIndex: 34 });
  });

  test('Shift+PageDown falls back to 25 when viewport API throws', () => {
    api = makeMockApi(200, ['A'], []);
    api.getFirstDisplayedRowIndex.mockImplementation(() => {
      throw new Error('not ready');
    });
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      5,
    );
    handleGridKeyboardShortcut(event);
    // fallback = 25, new end = 5 + 25 = 30
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 5, rowEndIndex: 30 });
  });

  test('Shift+PageDown preserves the columns from the last range', () => {
    const range = makeRange(0, 2, ['A', 'B']);
    api = makeMockApi(50, ['A', 'B', 'C'], [range]);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      2,
    );
    handleGridKeyboardShortcut(event);
    expect(firstCallColumnCount(api.addCellRange)).toBe(2);
  });

  test('Shift+PageDown calls preventDefault', () => {
    const event = makeEvent('PageDown', { shiftKey: true }, api, col, 2);
    handleGridKeyboardShortcut(event);
    const keyEvent = event.event as unknown as { preventDefault: jest.Mock };
    expect(keyEvent.preventDefault).toHaveBeenCalled();
  });

  test('Shift+PageDown does nothing when rowIndex is null', () => {
    const event = makeEvent('PageDown', { shiftKey: true }, api, col, null);
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('Shift+PageDown does nothing when grid has 0 rows', () => {
    api = makeMockApi(0, ['A'], []);
    const event = makeEvent(
      'PageDown',
      { shiftKey: true },
      api,
      makeColumn('A'),
      0,
    );
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  // --- Shift+PageUp ---

  test('Shift+PageUp with no prior range extends one viewport-page up from focused row', () => {
    api = makeMockApi(100, ['A', 'B'], []);
    const event = makeEvent(
      'PageUp',
      { shiftKey: true },
      api,
      makeColumn('A'),
      30,
    );
    handleGridKeyboardShortcut(event);
    // page size = 19, new end = 30 - 19 = 11
    expectFirstCallArg(api.addCellRange, {
      rowStartIndex: 11,
      rowEndIndex: 30,
    });
  });

  test('Shift+PageUp extends last range end upward by one viewport-page', () => {
    const range = makeRange(10, 20, ['A']);
    api = makeMockApi(100, ['A', 'B'], [range]);
    const event = makeEvent(
      'PageUp',
      { shiftKey: true },
      api,
      makeColumn('A'),
      20,
    );
    handleGridKeyboardShortcut(event);
    // page size = 19, new end = 20 - 19 = 1, start = min(10, 1) = 1
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 1, rowEndIndex: 10 });
  });

  test('Shift+PageUp clamps to first row (row 0)', () => {
    const range = makeRange(0, 5, ['A']);
    api = makeMockApi(100, ['A'], [range]);
    const event = makeEvent(
      'PageUp',
      { shiftKey: true },
      api,
      makeColumn('A'),
      5,
    );
    handleGridKeyboardShortcut(event);
    // page size = 19, new end = 5 - 19 = -14 → clamped to 0
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 0, rowEndIndex: 0 });
  });

  test('Shift+PageUp uses actual viewport size not a hardcoded constant', () => {
    api = makeMockApi(200, ['A'], [], 50, 69); // viewport rows 50-69 → page size = 19
    const range = makeRange(40, 60, ['A']);
    api.getCellRanges.mockReturnValue([range]);
    const event = makeEvent(
      'PageUp',
      { shiftKey: true },
      api,
      makeColumn('A'),
      60,
    );
    handleGridKeyboardShortcut(event);
    // page size = 19, new end = 60 - 19 = 41, start = min(40, 41) = 40
    expectFirstCallArg(api.addCellRange, {
      rowStartIndex: 40,
      rowEndIndex: 41,
    });
  });

  test('Shift+PageUp falls back to 25 when viewport API throws', () => {
    api = makeMockApi(200, ['A'], []);
    api.getLastDisplayedRowIndex.mockImplementation(() => {
      throw new Error('not ready');
    });
    const event = makeEvent(
      'PageUp',
      { shiftKey: true },
      api,
      makeColumn('A'),
      30,
    );
    handleGridKeyboardShortcut(event);
    // fallback = 25, new end = 30 - 25 = 5
    expectFirstCallArg(api.addCellRange, { rowStartIndex: 5, rowEndIndex: 30 });
  });

  test('Shift+PageUp calls preventDefault', () => {
    const event = makeEvent('PageUp', { shiftKey: true }, api, col, 30);
    handleGridKeyboardShortcut(event);
    const keyEvent = event.event as unknown as { preventDefault: jest.Mock };
    expect(keyEvent.preventDefault).toHaveBeenCalled();
  });

  test('Shift+PageUp does nothing when rowIndex is null', () => {
    const event = makeEvent('PageUp', { shiftKey: true }, api, col, null);
    handleGridKeyboardShortcut(event);
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  // --- deselectAll + clearCellSelection order ---

  test('Ctrl+A calls deselectAll then clearCellSelection then addCellRange in order', () => {
    const callOrder: string[] = [];
    api.deselectAll.mockImplementation(() => callOrder.push('deselect'));
    api.clearCellSelection.mockImplementation(() => callOrder.push('clear'));
    api.addCellRange.mockImplementation(() => callOrder.push('add'));
    const event = makeEvent('KeyA', { ctrlKey: true }, api, col);
    handleGridKeyboardShortcut(event);
    expect(callOrder).toEqual(['deselect', 'clear', 'add']);
  });

  test('Ctrl+Space calls deselectAll then clearCellSelection then addCellRange in order', () => {
    const callOrder: string[] = [];
    api.deselectAll.mockImplementation(() => callOrder.push('deselect'));
    api.clearCellSelection.mockImplementation(() => callOrder.push('clear'));
    api.addCellRange.mockImplementation(() => callOrder.push('add'));
    const event = makeEvent('Space', { ctrlKey: true }, api, col, 0);
    handleGridKeyboardShortcut(event);
    expect(callOrder).toEqual(['deselect', 'clear', 'add']);
  });

  test('Shift+Space calls deselectAll then clearCellSelection then addCellRange in order', () => {
    const callOrder: string[] = [];
    api.deselectAll.mockImplementation(() => callOrder.push('deselect'));
    api.clearCellSelection.mockImplementation(() => callOrder.push('clear'));
    api.addCellRange.mockImplementation(() => callOrder.push('add'));
    const event = makeEvent('Space', { shiftKey: true }, api, col, 0);
    handleGridKeyboardShortcut(event);
    expect(callOrder).toEqual(['deselect', 'clear', 'add']);
  });
});
