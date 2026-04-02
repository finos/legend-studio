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

import type {
  DataGridApi,
  DataGridCellKeyDownEvent,
  DataGridColumn,
} from '@finos/legend-lego/data-grid';
import type { TDSRowDataType } from '@finos/legend-graph';

/**
 * Handles Excel-compatible keyboard shortcuts:
 *   Ctrl+A         → select all cells
 *   Ctrl+Space     → extend selection to full columns for all columns touched
 *                    by the last selection range (mirrors Excel column-select)
 *   Shift+Space    → extend selection to full rows for all rows touched by the
 *                    last selection range (mirrors Excel row-select)
 *   Shift+PageDown → extend the last selection range one page downward
 *   Shift+PageUp   → extend the last selection range one page upward
 *
 * Should be passed to the `onCellKeyDown` prop of both TDS DataGrid instances.
 */

/** Fallback page size when the viewport row count cannot be determined. */
const FALLBACK_PAGE_SIZE = 25;

/**
 * Returns the number of rows currently visible in the grid viewport by
 * querying AG Grid's first/last displayed row indices.  Falls back to
 * FALLBACK_PAGE_SIZE when the API returns unusable values (e.g. during
 * initial render before the grid has measured its height).
 */
const getViewportPageSize = (api: DataGridApi<TDSRowDataType>): number => {
  try {
    const first = api.getFirstDisplayedRowIndex();
    const last = api.getLastDisplayedRowIndex();
    if (last >= first) {
      return Math.max(1, last - first);
    }
  } catch {
    // API not ready — fall through to default
  }
  return FALLBACK_PAGE_SIZE;
};

// ---------------------------------------------------------------------------
// Shared utility
// ---------------------------------------------------------------------------

/** Get the last cell range from the API, or null if none. */
const getLastRange = (
  api: DataGridApi<TDSRowDataType>,
): {
  startRow?: { rowIndex: number };
  endRow?: { rowIndex: number };
  columns: DataGridColumn<unknown>[];
} | null => {
  const ranges = api.getCellRanges();
  return ranges && ranges.length > 0
    ? (ranges[ranges.length - 1] as ReturnType<typeof getLastRange>)
    : null;
};

// ---------------------------------------------------------------------------
// Individual shortcut handlers
// ---------------------------------------------------------------------------

/** Ctrl+A — select all cells */
const handleCtrlA = (
  keyEvent: KeyboardEvent,
  api: DataGridApi<TDSRowDataType>,
): void => {
  keyEvent.preventDefault();
  const rowCount = api.getDisplayedRowCount();
  const allColumns = api.getColumns();
  if (rowCount === 0 || !allColumns || allColumns.length === 0) {
    return;
  }
  // eslint-disable-next-line no-console
  console.debug(
    `[TDS Grid] Ctrl+A → selecting all: ${rowCount} rows × ${allColumns.length} columns`,
  );
  api.deselectAll();
  api.clearCellSelection();
  api.addCellRange({
    rowStartIndex: 0,
    rowEndIndex: rowCount - 1,
    columns: allColumns,
  });
};

/** Log non-modifier key presses for debugging */
const logKeyDown = (
  keyEvent: KeyboardEvent,
  column: { getColId: () => string },
  rowIndex: number | null,
): void => {
  if (
    !keyEvent.code.startsWith('Control') &&
    !keyEvent.code.startsWith('Shift') &&
    !keyEvent.code.startsWith('Alt') &&
    !keyEvent.code.startsWith('Meta')
  ) {
    // eslint-disable-next-line no-console
    console.debug(
      `[TDS Grid] onCellKeyDown: key=${keyEvent.code} ctrl=${keyEvent.ctrlKey} shift=${keyEvent.shiftKey} col=${column.getColId()} row=${rowIndex}`,
    );
  }
};

/** Shift+PageDown / Shift+PageUp — extend selection by one viewport page */
const handleShiftPage = (
  keyEvent: KeyboardEvent,
  api: DataGridApi<TDSRowDataType>,
  column: { getColId: () => string },
  rowIndex: number,
): void => {
  keyEvent.preventDefault();
  const rowCount = api.getDisplayedRowCount();
  if (rowCount === 0) {
    return;
  }
  const lastRange = getLastRange(api);

  const rangeStartRow = lastRange?.startRow?.rowIndex ?? rowIndex;
  const rangeEndRow = lastRange?.endRow?.rowIndex ?? rowIndex;
  const rangeCols = lastRange
    ? lastRange.columns
    : [column as DataGridColumn<unknown>];

  const delta =
    keyEvent.code === 'PageDown'
      ? getViewportPageSize(api)
      : -getViewportPageSize(api);
  const newEndRow = Math.max(0, Math.min(rowCount - 1, rangeEndRow + delta));

  // eslint-disable-next-line no-console
  console.debug(
    `[TDS Grid] Shift+${keyEvent.code} → extending range rows ${rangeStartRow}–${newEndRow}`,
  );

  api.deselectAll();
  api.clearCellSelection();
  api.addCellRange({
    rowStartIndex: Math.min(rangeStartRow, newEndRow),
    rowEndIndex: Math.max(rangeStartRow, newEndRow),
    columns: rangeCols,
  });
};

/** Ctrl+Space — select entire columns for all columns in the last range */
const handleCtrlSpace = (
  keyEvent: KeyboardEvent,
  api: DataGridApi<TDSRowDataType>,
  column: { getColId: () => string },
): void => {
  keyEvent.preventDefault();
  const rowCount = api.getDisplayedRowCount();
  if (rowCount === 0) {
    return;
  }
  const lastRange = getLastRange(api);
  const targetColumns = lastRange
    ? lastRange.columns
    : [column as DataGridColumn<unknown>];
  // eslint-disable-next-line no-console
  console.debug(
    `[TDS Grid] Ctrl+Space → selecting ${targetColumns.length} column(s), ${rowCount} rows`,
  );
  api.deselectAll();
  api.clearCellSelection();
  api.addCellRange({
    rowStartIndex: 0,
    rowEndIndex: rowCount - 1,
    columns: targetColumns,
  });
};

/** Shift+Space — select entire rows for all rows in the last range */
const handleShiftSpace = (
  keyEvent: KeyboardEvent,
  api: DataGridApi<TDSRowDataType>,
  column: { getColId: () => string },
  rowIndex: number,
): void => {
  keyEvent.preventDefault();
  const allColumns = api.getColumns();
  if (!allColumns || allColumns.length === 0) {
    return;
  }
  const lastRange = getLastRange(api);
  let startRow = rowIndex;
  let endRow = rowIndex;
  if (lastRange) {
    const a = lastRange.startRow?.rowIndex ?? rowIndex;
    const b = lastRange.endRow?.rowIndex ?? rowIndex;
    startRow = Math.min(a, b);
    endRow = Math.max(a, b);
  }
  // eslint-disable-next-line no-console
  console.debug(
    `[TDS Grid] Shift+Space → selecting rows ${startRow}–${endRow}, ${allColumns.length} columns`,
  );
  api.deselectAll();
  api.clearCellSelection();
  api.addCellRange({
    rowStartIndex: startRow,
    rowEndIndex: endRow,
    columns: allColumns,
  });
};

// ---------------------------------------------------------------------------
// Main handler (exported)
// ---------------------------------------------------------------------------

export const handleGridKeyboardShortcut = (
  event: DataGridCellKeyDownEvent<TDSRowDataType>,
): void => {
  const keyEvent = event.event as KeyboardEvent | undefined;
  if (!keyEvent) {
    return;
  }

  const api: DataGridApi<TDSRowDataType> = event.api;

  if (keyEvent.ctrlKey && keyEvent.code === 'KeyA') {
    handleCtrlA(keyEvent, api);
    return;
  }

  const column = event.column;
  const rowIndex = event.rowIndex;

  logKeyDown(keyEvent, column, rowIndex);

  if (rowIndex === null) {
    return;
  }

  if (
    keyEvent.shiftKey &&
    (keyEvent.code === 'PageDown' || keyEvent.code === 'PageUp')
  ) {
    handleShiftPage(keyEvent, api, column, rowIndex);
    return;
  }

  if (keyEvent.ctrlKey && keyEvent.code === 'Space') {
    handleCtrlSpace(keyEvent, api, column);
    return;
  }

  if (keyEvent.shiftKey && keyEvent.code === 'Space') {
    handleShiftSpace(keyEvent, api, column, rowIndex);
  }
};
