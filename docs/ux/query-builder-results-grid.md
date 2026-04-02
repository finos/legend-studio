# Query Builder — Results Grid UX

This document describes the user-facing behaviour of the TDS (Tabular Data Set) results grid in the Query Builder.

---

## Grid Variants

The results grid has two modes, selected automatically based on configuration:

| Mode                | Component                         | When used                                                                                                  |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Enterprise grid** | `QueryBuilderTDSGridResult`       | When `TEMPORARY__enableGridEnterpriseMode` is `true` and a valid AG Grid Enterprise license key is present |
| **Simple grid**     | `QueryBuilderTDSSimpleGridResult` | Default — no license required                                                                              |

Both modes expose similar cell selection, keyboard shortcuts, context menu, and statistics bar behaviour described below — although some features (notably `Shift+Arrow`, `Shift+PageUp/Down`) are only available in the enterprise grid.

---

## Cell Selection

### Mouse selection

- **Single click** — selects a single cell. The cell gets a highlighted border.
- **Click and drag** — selects a rectangular range of cells.
- **Ctrl+click** — adds individual cells or ranges to an existing selection (sparse / non-contiguous selection). N.B. Ctrl+clicking a cell that is **already selected** has no effect (each cell is counted exactly once in the statistics bar regardless of how many times it is Ctrl+clicked).
- **Shift+click** — extends the current selection to include all cells between the previously selected cell and the clicked cell.

### Keyboard shortcuts

These shortcuts follow Excel conventions and operate on the **currently focused cell** and **last selection range**.

| Shortcut           | Enterprise grid | Simple grid | Action                                                                                                                                                                                 |
| ------------------ | --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ctrl+A`           | ✅              | ✅          | Select **all** cells in the grid                                                                                                                                                       |
| `Ctrl+Space`       | ✅              | ✅          | Select the **entire columns** spanned by the last selection range. Falls back to the focused cell's column if there is no prior selection.                                             |
| `Shift+Space`      | ✅              | ✅          | Select the **entire rows** spanned by the last selection range. Falls back to the focused cell's row if there is no prior selection.                                                   |
| `Arrow keys`       | ✅              | ✅          | Move the focused cell (built-in AG Grid navigation)                                                                                                                                    |
| `Shift+Arrow keys` | ✅              | ❌          | Extend the selection one cell in the arrow direction (enterprise only)                                                                                                                 |
| `Shift+PageDown`   | ✅              | ❌          | Extend the last selection range **one viewport-page downward**, preserving the selected columns. The page size is the number of rows visible in the grid viewport, falling back to 25. |
| `Shift+PageUp`     | ✅              | ❌          | Extend the last selection range **one viewport-page upward**, preserving the selected columns.                                                                                         |

> **Note:** Keyboard shortcuts only activate when the grid has focus. Click any cell first to give the grid focus; subsequent key presses then act on the clicked cell.

> **Excel parity:** `Ctrl+Space` and `Shift+Space` mirror Excel's column-select and row-select behaviour. When a rectangular block of cells is selected, `Ctrl+Space` extends the selection to the full height of the grid for all columns in that block, and `Shift+Space` extends the selection to the full width of the grid for all rows in that block.

### Focus behaviour

- Clicking a cell moves **browser DOM focus** into the AG Grid element (native browser focus-on-click).
- AG Grid's internal keyboard focus cursor is explicitly set to the clicked cell via `setFocusedCell`, ensuring that shortcut keys (`Ctrl+Space` etc.) always act on the most recently clicked cell — not a stale position from before the grid lost focus.
- Keyboard shortcuts that fire a synthetic click event (e.g. `Ctrl+Space`) are ignored by the click handler so they cannot accidentally reset the selection they just created.

---

## Context Menu (right-click)

Right-clicking a cell opens a context menu with the following actions:

| Item                  | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Copy**              | Copies the selected cell(s) to the clipboard                                       |
| **Copy with Headers** | Copies the selected cell(s) with column header row to the clipboard                |
| **Copy Row Value**    | Copies all values in the row of the right-clicked cell to the clipboard            |
| **Filter By**         | Adds a filter to the query to show only rows matching the right-clicked cell value |
| **Filter Out**        | Adds a filter to the query to exclude rows matching the right-clicked cell value   |

> **Filter By / Filter Out** are only available when the query is in TDS fetch-structure mode.

---

## Selection Statistics Bar

When **2 or more cells** are selected, a statistics bar appears below the grid. The bar renders in three phases to keep the UI responsive even for very large selections:

### Configuration

The statistics bar is **enabled by default**. It can be disabled per grid instance by passing `showSummaryStats={false}` to the `QueryBuilderTDSGridResult` or `QueryBuilderTDSSimpleGridResult` component:

```tsx
<QueryBuilderTDSGridResult
  executionResult={result}
  queryBuilderState={state}
  showSummaryStats={false} // hides the statistics bar
/>
```

When disabled, neither the statistics bar nor the async stats computation hook runs, so there is zero overhead.

### Immediate — Show bar with all spinners

As soon as the selection event fires, a fast O(ranges) check determines whether ≥ 2 cells are selected. If so, the bar appears **immediately** with spinner placeholders for **all** metrics, including the count.

### Phase 1 — Count (≈50 ms after selection stabilises)

After the selection has been stable for 50 ms, `getCellRanges()` is read again to compute the exact count in O(ranges) time. The count spinner is replaced with the actual number. All other metrics remain as spinners.

### Phase 2 — Computed values (≈200 ms after selection stabilises + next browser paint)

After the selection has been stable for 200 ms, cell values are read from the grid and the statistics are computed. A `requestAnimationFrame` call ensures the browser has painted the count bar to screen **before** the synchronous computation begins. Once computed, the remaining spinners are replaced with the actual values.

Both debounce timers are cancelled and restarted whenever the selection changes — only the **final stable selection** triggers computation. If the selection changes while a computation is already in progress, the result is silently discarded.

### Metrics

| Metric     | Description                                          |
| ---------- | ---------------------------------------------------- |
| **Count**  | Total number of selected cells                       |
| **Unique** | Number of distinct non-empty values in the selection |
| **Empty**  | Number of null / empty cells in the selection        |

Additional metrics are shown based on the **data type** of the selected cells (only when all selected cells are from columns of the same type):

#### Numeric columns (`Integer`, `Float`, `Decimal`, `Number`)

| Metric  | Description                                   |
| ------- | --------------------------------------------- |
| **Min** | Minimum numeric value                         |
| **Max** | Maximum numeric value                         |
| **Sum** | Sum of all numeric values                     |
| **Avg** | Mean average (Sum ÷ count of non-null values) |

#### Date / DateTime columns (`Date`, `StrictDate`, `DateTime`)

| Metric  | Description                    |
| ------- | ------------------------------ |
| **Min** | Earliest date in the selection |
| **Max** | Latest date in the selection   |

#### String columns

| Metric         | Description                                          |
| -------------- | ---------------------------------------------------- |
| **Min Length** | Shortest string length (excluding empty/null values) |
| **Max Length** | Longest string length (excluding empty/null values)  |

---

## Distribution Histogram (mini chart)

Each statistics bar entry that has a meaningful numeric range (numeric values, string lengths, or dates) shows a compact inline **frequency-distribution histogram**.

- The chart is small and intended to give a quick visual profile of the data shape, not to convey exact values.
- Bucket count is chosen dynamically using Sturges' rule (`ceil(log₂(n) + 1)`), capped at a maximum of **20 buckets**.
- For integer data with a small range (≤ 20 distinct values), each integer gets its own bucket.
- For string columns, the bucketing is based on **string length**.
- For date columns, the bucketing is based on the numeric timestamp of each date.
- **Hovering** over a bar shows a tooltip describing the bucket, e.g.:
  - _"7 values within the range 110–120"_ (numeric)
  - _"3 values with length 5–8"_ (string length)
  - _"5 values within the range 2024-01-01 – 2024-03-31"_ (date)
- The chart has a subtle border to visually separate it from the surrounding statistics text.

---

## Value Frequency Tooltip

**Hovering** over the **Count** or **Unique** metric in the statistics bar shows a horizontal bar chart of the **top 10 most frequent values** in the selection.

- Each row in the tooltip shows the value label, a proportional bar, and the occurrence count.
- Long labels are truncated to 12 characters with an ellipsis.
- If there are values beyond the top 10, an **(other)** bucket is shown.
- If there are empty/null values, an **(empty)** bucket is shown.
- The tooltip is **viewport-clamped**: it will never overflow the left or right edge of the browser window. If the tooltip would extend beyond the viewport, it is automatically repositioned to stay fully visible.

---

## Enterprise Grid (additional features)

When the enterprise grid is active, the following additional features are available:

### Column and row grouping

- Columns can be dragged to the **Row Groups** panel to group rows.
- Columns can be dragged to the **Column Labels** panel to pivot data.

### Aggregation

- Numeric columns support aggregation functions: `count`, `sum`, `max`, `min`, `avg`.
- **Weighted average** (`wavg`) is also available — selecting it prompts a dialog to choose the weight column.

### Side bar

- A collapsible side bar provides **Columns** and **Filters** panels for managing visible columns and active filters.

### Sorting and filtering

- All columns are sortable by clicking the column header.
- Column filters are available per data type:
  - String columns: text filter
  - Numeric columns: number filter
  - Date columns: date filter
  - Other columns: set filter (default)

---

## Performance Architecture

The statistics bar is designed to remain non-blocking even for very large selections (thousands of cells):

| Stage           | Trigger                                         | Complexity          | What happens                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection event | `onCellSelectionChanged`                        | **O(1)**            | Increments a version counter. No cell data is read.                                                                                                                                                                                                                                 |
| Immediate       | `useEffect` (synchronous)                       | **O(ranges)**       | `getCellRanges()` quick-check confirms ≥ 2 cells. Bar shown with all spinners.                                                                                                                                                                                                      |
| Phase 1         | 50 ms debounce timer                            | **O(ranges)**       | `getCellRanges()` sums `rows × cols` per range to get the count. Count spinner replaced with actual number.                                                                                                                                                                         |
| Phase 2         | 200 ms debounce timer + `requestAnimationFrame` | **O(rows + cells)** | `forEachNode` builds a `rowIndex → node` Map in O(rows). A `colId → index` Map is built in O(columns). Each cell is then read in O(1) via Map lookups. `computeCellSelectionStats` iterates the cells in O(n). The rAF guarantees the count bar is painted before this work begins. |

- Rapid selection changes (e.g. shift-dragging) cancel and restart the timers — intermediate states are never computed.
- The old O(rows²) `getSelectedCells` function (which used `nodes.find()` per row and `columns.findIndex()` per cell) has been removed from the enterprise grid hot path entirely.

---

## Known Limitations / Notes

- The statistics bar only appears for selections of **2 or more cells**. A single selected cell shows no statistics.
- **Row background colour** — The grid uses cell range selection only (`cellSelection: true`). Row-level selection mode is intentionally disabled to prevent rows from retaining a highlighted background after a `Shift+Space` row-select is cleared. All selection state is expressed purely as cell ranges.
- Mixed-type selections (cells from columns of different types) show only the **Count**, **Unique**, and **Empty** metrics — no type-specific stats (Min/Max/Sum/Avg etc.) are shown.
- The distribution histogram and value frequency tooltip are computed client-side from the currently loaded result page only.
- The simple grid uses a custom mouse-driven cell renderer; keyboard shortcut state is tracked via the last clicked cell reference rather than AG Grid's internal focus cursor. `Shift+Arrow` and `Shift+Page` shortcuts are not available in the simple grid.
- Statistics are computed from the **displayed** row order, which may differ from the original query order if the grid has been sorted.
