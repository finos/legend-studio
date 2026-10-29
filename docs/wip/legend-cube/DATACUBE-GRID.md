# Legend DataCube as Cube's results grid (plan, 2026-10-27)

The user asked for a deep dive on replacing Cube's results grid with Legend DataCube, and a plan. This document is
that plan: the decisions first, then what each side does today, the earlier study's findings revisited, the engine
facts, the design, the DataCube changes it needs, and the steps. Nothing is built yet.

Markers: ✅ probed on the local engine, 📄 read in the code, 💭 reasoned only. Probes are in the local evidence
folder, under `datacube-grid/` (new) and `m7-requirements/` (M7's).

## 0. Summary

- **What changes:** the region under the canvas stops being Cube's own grid (`CubeResultGrid`, the server-side grid,
  the drill-down, column formats and local mode) and becomes a `<DataCube>` over the result of the node that runs.
  DataCube brings what Cube's grid doesn't have: horizontal pivots with totals, extended columns, a filter editor, a
  properties editor, heatmaps, plots, HTML, PDF and email exports, and one grid shared with Legend Query, Studio and
  the DataCube app.
- **Recommended shape (decision D1):** DataCube is the **view layer**. Its filters, groups, pivots, sorts and formats
  are a view of the run, not cube steps, as M7's server-side mode, `meta.drilldown` and `meta.presentation` are
  today, so DataCube absorbs M7. An explicit **"Add this view as steps"** turns the view into Cube nodes when the
  user wants it to be part of the cube.
- **It composes with Cube's queries:** DataCube's stages appended to a cube's query, the window functions' `let`
  form included, plan and run as **one SQL statement** ✅ (§5).
- **It needs DataCube changes:** five small upstream PRs, flagged in §7 as clearly as the query builder's were. They
  are host items in the cell menu, a source swap that keeps the view, graceful schema drift, a stable order before
  `slice`, and typed group keys. Without the last two, DataCube shows **wrong or missing rows** in cases Cube's
  grid handles today (§5, rows 4-6).
- **It costs some of Cube's choices:** exact numeric display (spec §8.7) is lost unless DataCube becomes lossless
  (D2), and local mode goes (D4). Cube's dark theme waits for DataCube's (D5).
- **Steps:** a spike, the adapter, DataCube in the results region behind a temporary flag, "Add this view as steps",
  the DataCube PRs, then DataCube as the default with saved cubes migrated, then the old grid removed (§8). About
  **10,600 lines** go (grid code, stores, the core's drill-down and their tests); about **2,000** are added 💭.

## 1. Decisions for the user, most decisive first

| #   | Decision                                        | Options                                                                                                                                             | Recommended                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | What DataCube's state is                        | (a) **a view of the run**, with "Add this view as steps"; (b) **two-way**: every DataCube action becomes a Cube node                                | **(a)**. It matches M7 (the drill-down and formats are already view state), needs no hook to start, and keeps the canvas the cube's only source of truth. (b) needs every DataCube action mirrored as a node, and DataCube can't refuse an action Cube can't express (First, Last, Variance, StdDev, Join Strings, §6.3) |
| D2  | Exact numbers (spec §8.7)                       | (a) accept DataCube's JS numbers: a decimal past ~15 significant digits displays rounded; (b) make DataCube lossless (C6, a larger upstream change) | **(a) now, (b) later if users need it.** Cube's engine adapter keeps reading losslessly, so CSV export and "Add this view as steps" keep every digit; only the display rounds                                                                                                                                            |
| D3  | Is the view saved in the cube?                  | (a) not saved: the view resets on reload; (b) saved as DataCube's configuration in `meta`                                                           | **(b), as `meta.dataCube`**, since M7 already saves the drill-down, formats and widths there. Old cubes migrate (§6.6)                                                                                                                                                                                                   |
| D4  | Local mode (ag-grid's grouping on fetched rows) | (a) drop it; (b) DataCube's DuckDB cache later                                                                                                      | **(a)**, with (b) as a follow-up: DataCube's cache (`enableCache`, `initializeCache`) needs DuckDB-WASM, which today lives in the DataCube app, not the library                                                                                                                                                          |
| D5  | Dark mode                                       | (a) wait for DataCube's theming work (classic and modern; dark is deferred there); (b) show a light DataCube in a dark Cube meanwhile               | **Decide with the theming plan.** It isn't part of this plan; a light grid under a dark canvas would be the most visible regression                                                                                                                                                                                      |
| D6  | Upstream DataCube PRs (§7)                      | Who reviews and owns them                                                                                                                           | Needed before DataCube becomes the default (DC.5)                                                                                                                                                                                                                                                                        |
| D7  | Hosts                                           | Order: Analytics, Query, Studio's Create/Edit MatView                                                                                               | **Analytics first**: it's Cube's own app and needs a DataCube dependency anyway; Query and Studio already bundle DataCube                                                                                                                                                                                                |

## 2. Cube's grid today

About 7,100 lines of source, the run path and JSON tooling included (they partly stay), and 5,100 of tests 📄:

| Feature (PLAN §9, §11.10, §11.20)                                                                                              | Code                                                                                                       | Saved                            | Under DataCube                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execute (F9) runs the capture node, the row limit (`limit + 1` to warn), errors on nodes, stale rows                           | `stores/CubeExecutionState.ts` (277), `CubeQueryRun.ts` (172)                                              | the limit, per user              | Kept: Execute builds DataCube's source (§6.2)                                                                                                                     |
| Server-side mode: header sorts and the drill-down re-derive the run's query; each level fetched whole into a bounded LRU cache | `components/grid/CubeServerSideGrid.tsx` (213), `stores/CubeGridFetcher.ts` (303), core `drilldown/` (553) | `meta.drilldown`                 | **Replaced** by DataCube's sorts and vertical pivots (group by), its own server-side row model                                                                    |
| Local mode: ag-grid's grouping, pivot, filters and status bar on the fetched rows                                              | `components/grid/CubeResultGrid.tsx` (698)                                                                 | the mode, per user               | **Dropped** (D4)                                                                                                                                                  |
| Curated cell menu: Drilldown by, Sort by, Group by, Filter by (each adds a Cube node), Format Column, Copy, Export             | `stores/CubeGridQuickActions.ts` (217), `CubeResultGrid.tsx`                                               | —                                | DataCube's menu; Cube's items need C1 (§7) or move to "Add this view as steps"                                                                                    |
| Formats: number, currency (ISO 4217), percent, red or parentheses for negatives                                                | `CubeColumnFormatDialog.tsx` (289), core `presentation/ColumnFormat.ts` (99)                               | `meta.presentation.columnHints`  | DataCube's column properties (decimals, separators, red, parentheses, scale, a free-text unit for currency)                                                       |
| Column widths                                                                                                                  | `CubeGridState.ts` (450)                                                                                   | `meta.presentation.columnWidths` | DataCube's configuration                                                                                                                                          |
| Export: CSV of the whole query through the engine, Excel of the rows shown                                                     | `stores/CubeExportState.ts` (200)                                                                          | —                                | DataCube's Export menu; its CSV through the engine is Cube's `exportCsv` behind the adapter's `exportData`                                                        |
| Runs panel (15 latest runs: SQL, Pure, Copy JSON), Show SQL                                                                    | `CubeRunStatsPanel.tsx` (156), `CubeSqlDialog.tsx` (90), `stores/CubeRunStatsState.ts` (91)                | —                                | **Kept**: the adapter records each DataCube query as a run                                                                                                        |
| Variant cells: one-line JSON, Open JSON, Explore JSON (adds Extend and Explode Array steps), Parse as JSON                     | `CubeJsonViewerDialog.tsx`, `CubeJsonExplorerDialog.tsx`, `stores/variant/` (1,743)                        | —                                | DataCube has View JSON and a JSON fields window, ported from Cube in #5765; adding Cube steps from a cell needs C1. The expression editors keep `stores/variant/` |
| Exact numbers: integers and decimals read and shown as exact text                                                              | `CubeGridValues.ts` (330)                                                                                  | —                                | Display rounds (D2)                                                                                                                                               |

## 3. DataCube, as a host sees it

- **Component:** `<DataCube specification engine options />` (`packages/legend-data-cube/src/components/DataCube.tsx:101`) 📄.
  - The state is created once from the props (`useLocalObservable`, :108). Another source means a remount.
- **The engine is the host's** (`stores/core/DataCubeEngine.tsx:136`) 📄. It:
  - processes a source;
  - parses and prints Pure;
  - types a query and its code;
  - offers typeahead;
  - executes a `V1_Lambda`;
  - optionally exports and caches;
  - logs and sends telemetry.
- **DataCube builds the query** 📄. It appends, in order, its stages to the source's query (`stores/core/DataCubeQueryBuilder.ts`):

  - leaf extended columns, filter, select;
  - pivot, then group by, each with its sort;
  - group-level extended columns, sort, limit;
  - a `slice` per block of rows the grid asks for.

  The host's `buildExecutionContext` adds the `from(…)`.

- **The specification** is `{source, query, configuration}`, the query being Pure text that DataCube parses back through the engine on load 📄.
- **Options** (`stores/DataCubeOptions.ts`) 📄:

  - header menu items and an inner header renderer;
  - layout and task managers;
  - settings, initialization callbacks and the ag-grid licence.

  There is **no hook for the cell menu** (`stores/view/grid/DataCubeGridMenuBuilder.tsx`).

- **Hosts today** 📄:
  - **The query builder**, in a modal: `QueryBuilderDataCubeEngine`, about 330 lines, the closest model for Cube's adapter.
  - **The REPL.**
  - **The DataCube app**: ad hoc, saved Legend query, local file, Lakehouse sources, and the DuckDB cache.
- **Dependencies** 📄:
  - DataCube depends only on library packages.
  - It uses ag-grid 35.0.0, as `legend-lego` does, so the versions are aligned.
  - Query's and Studio's bootstraps already import its stylesheet. Analytics neither depends on it nor imports it. It gets DataCube's code through the query builder, but not the stylesheet.
- **Looks** 📄: DataCube is light only: white rows, ag-grid's quartz theme, the dense "classic" look. Saved specifications hold concrete colours.

## 4. The 2026-10-09 study, revisited

That study (`dataspace-source/README.md`, Part 2) recommended keeping Cube's grid and building M7, with "Open in
DataCube" later (option 2b), and **not** DataCube as the grid (2a). Its findings, now:

| Finding then                                            | Now                                                                               | How this plan handles it                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| DataCube parses results lossily                         | Still true for DataCube's display                                                 | Cube's adapter reads losslessly and hands DataCube numbers; display rounds (D2); CSV and "Add this view as steps" keep every digit |
| It remounts on every Execute                            | Still true                                                                        | Remount by key, carrying the view (DC.2); C2 swaps the source without a remount                                                    |
| It throws on schema drift                               | Still true (`DataCubeSnapshotBuilder.ts`)                                         | C3; until then, the adapter drops the saved view with a notice when a column it names is gone                                      |
| It pages leaf rows with `slice` and no guaranteed order | Still true ✅ (§5 row 3)                                                          | C4: a stable order before `slice`                                                                                                  |
| No LRU cache: every block re-executes                   | Still true                                                                        | Accepted: DataCube's own trade-off; M7's cache goes                                                                                |
| Null group keys are an in-band `__MISSING`              | Still true                                                                        | Accepted with C5's typed keys                                                                                                      |
| Its menu adds DataCube state, not nodes                 | Still true                                                                        | D1 (a): that is the point; Cube's own actions via C1 and "Add this view as steps"                                                  |
| Formats on JS numbers only; currency a free-text unit   | Still true                                                                        | Accepted (D2); `columnHints` currencies migrate to the unit (§6.6)                                                                 |
| It saves Pure text, against PLAN §10.2-10.3             | Still true                                                                        | `meta.dataCube` holds DataCube's configuration as DataCube writes it; Cube never reads its query text (§6.6)                       |
| M7 would be thrown away                                 | **New:** M7 was built since (#5667)                                               | It is: its drill-down, cache and server-side grid go (§9)                                                                          |
| DataCube had no Variant support                         | **Changed:** #5765 ported Cube's JSON viewer, field tree and offers into DataCube | Cube's JSON exploration becomes DataCube's                                                                                         |

## 5. Engine facts

| #   | Fact                                                                                                                                                                                                                                |                     | Evidence                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------ |
| 1   | DataCube's stages (extend, filter, select, group by with its sort, sort, limit, slice) on a cube's plain query, then `from(runtime)`: typed, run, **one SQL statement**                                                             | ✅                  | `datacube-grid/probe-1-stages.out` A                   |
| 2   | The same stages **after Cube's `let` form**, `{\| let w = …window…; $w->filter(…);}->from(runtime)->…`: typed, run, one statement (a `WITH` CTE), the same rows as the single form                                                  | ✅                  | `probe-1-stages.out` B, C                              |
| 3   | `slice` with no sort before it writes no `ORDER BY` (`select top 3 …`). H2 returns a stable order; warehouses don't promise one, so two blocks can repeat or skip rows (PLAN §11.4's row order). With a sort, `ORDER BY` is written | ✅ H2; 💭 elsewhere | `probe-1-stages.out` D, E                              |
| 4   | DataCube expands a group with `Equal` on its key, read with `parseFloat` for Number, Decimal and Float columns                                                                                                                      | 📄                  | `stores/view/grid/DataCubeGridQueryBuilder.ts:258-286` |
| 5   | `Equal` with a 32-bit float key as returned finds **no rows** for 0 of 25 `FREIGHT` keys (M7 matches `In [v, fround(v)]`)                                                                                                           | ✅                  | `m7-requirements/p3-float-keys.out`                    |
| 6   | A decimal key past a double's precision loses digits as a number; `parseFloat` loses them before the engine does (M7.2 sends decimal literals as strings)                                                                           | ✅                  | `m7-requirements/p2-csv-decimal.out`                   |
| 7   | Snowflake, Databricks, Postgres, DuckDB and BigQuery: plan-only checks of the shapes above                                                                                                                                          | not run             | DC.0                                                   |

Rows 4-6 together: expanding a group on a `REAL` column in DataCube shows no rows under it, and on a long decimal
key it can show another group's rows 💭 (the same mechanism as M7's probes; to confirm in the browser in DC.0).

## 6. Design

### 6.1 The adapter, under the builder's `v1/` folder

DataCube's engine API takes `V1_Lambda` and `V1_ValueSpecification`, so the adapter lives under
`packages/legend-cube-builder/src/graph-manager/protocol/pure/v1/` (the V1 rule). It is modelled on
`QueryBuilderDataCubeEngine`, over Cube's own engine port rather than a graph:

- **`CubeDataCubeSource extends DataCubeSource`:**
  - the cube's relation up to the node that runs, as the emitter writes it without `limit`;
  - the cube's context (model, runtime, mapping, database type);
  - its columns from Cube's inferred schema, so no engine call is needed.
  - A query in the `let` form keeps its own `from(…)`, and `buildExecutionContext` returns nothing for it (§5 row 2). Any other query gets `from(mapping?, runtime)` from it, as the query builder's does.
- **Execution through Cube's engine:** `executeQuery` runs through `CubeEngine.execute` with the cube's model context, so every source kind runs as it does today: inline models, project pointers, data products, ingest data sets, direct connections and data spaces.
  - It records a run for the Runs panel, with its SQL, Pure and JSON.
  - It hands DataCube a `TDSExecutionResult` whose numbers are JS numbers (D2).
- **Export:** `exportData` is Cube's `exportCsv`.
- **Pure and typing:** parsing, printing and typing go through Cube's engine calls, and typeahead through Cube's completions (§11.23).
- **Telemetry and logs** go to the host's.

### 6.2 The results region

- **Execute:**
  - It builds the source and remounts DataCube (a new `key`) with the view carried over: DataCube's last configuration, adjusted to the new columns. Until C2/C3 land, a view naming a column that is gone is dropped, with a notice.
  - Editing the cube after Execute leaves DataCube on the last run, marked stale, as the grid is today.
- **The limit:** the row limit becomes DataCube's limit. DataCube re-runs on each view change; Cube's Execute model is unchanged.
- **Toolbar:** Cube's bar stays above DataCube: Execute, Rows, Show SQL and Runs. Server-side/Local goes. DataCube's header holds the view's menus, and Cube adds "Add this view as steps" with `getHeaderMenuItems`.
- **Errors:** an engine error on Cube's part of the query is still shown on the node that caused it, through the origins (`raw` IR, §11.25). One on DataCube's stages shows in DataCube.

### 6.3 "Add this view as steps"

DataCube's snapshot becomes Cube nodes after the node that ran, as one undo step:

| DataCube                     | Cube                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| leaf extended columns        | Extend: Pure, Cube's checked editor                                                                                                            |
| filter tree, `not` included  | Filter (composite, `Not`)                                                                                                                      |
| select                       | Restrict Columns                                                                                                                               |
| group by + aggregations      | Group: Sum, Average, Count, Min, Max map; Unique Value ≈ Distinct Value; **First, Last, Variance, StdDev and Join Strings are refused, named** |
| pivot (+ cast)               | Pivot (§11.12)                                                                                                                                 |
| group-level extended columns | Extend after the Group                                                                                                                         |
| sort                         | Sort                                                                                                                                           |
| limit                        | Take first rows                                                                                                                                |

A view with a refused piece adds what it can, says what it left out, and adds nothing if the user cancels.

### 6.4 What Cube keeps

- Execute and its errors on nodes.
- The Runs panel and Show SQL, now fed by DataCube's queries.
- The row limit.
- `stores/variant/`, for the expression editors' JSON field trees (V.9).

Cube's quick actions on a cell and Explore JSON's "add steps" come back once DataCube has host cell items (C1).
Until then, they reach the cube through "Add this view as steps".

### 6.5 Hosts

- **Analytics:** add `@finos/legend-data-cube` and **import** its stylesheet in the bootstrap. Don't copy it, as the light-mode copy was.
- **Query and Studio:** already import DataCube's stylesheet. Studio's Create/Edit MatView editor shows the grid in a page, so DataCube fits there; it is checked in DC.2.

### 6.6 Saved cubes

| Saved                                    | Migration                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `meta.drilldown {columns, aggregations}` | DataCube vertical pivots on those columns, each aggregation mapped as in §6.3 (Sum, Count; Nothing → no aggregation)                             |
| `meta.presentation.columnHints`          | DataCube column properties: decimals, separators, red, parentheses; a currency becomes the unit; percent becomes a ×100 scale with a `%` unit 💭 |
| `meta.presentation.columnWidths`         | DataCube column widths                                                                                                                           |
| new                                      | `meta.dataCube`: DataCube's configuration as DataCube writes it, kept as is; Cube never parses its query text                                    |

An older Cube keeps the new key in `meta`'s rest (§10.3). A newer Cube reads the old keys once, migrates them, and
writes `meta.dataCube`. The spec stays at version 1.

## 7. DataCube changes, each a small upstream PR

These touch `legend-data-cube`, which the user asked to be told about for the query builder; the same care applies
here. None is drastic; each is opt-in or a fix.

| #   | Change                                                                                                                         | Why                                                                        | Needed by                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------- |
| C1  | `options.getCellMenuItems(context)`: host items on a cell's menu, with the cell's column, value and row                        | Cube's Sort by, Filter by, Group by and Explore JSON add steps to the cube | DC.5 (nice before)                       |
| C2  | `api.updateSource(source)`: a new source keeping the view                                                                      | Execute without a remount                                                  | DC.5                                     |
| C3  | Graceful drift: a saved view naming a column the source no longer has drops what can't apply, and says so, instead of throwing | Re-Execute after an edit that removes a column                             | DC.5                                     |
| C4  | A stable order before `slice` when the view has no sort (e.g. every selected column, or a row number)                          | Repeated or skipped rows on warehouses (§5 row 3)                          | DC.5                                     |
| C5  | Typed group keys: a float key matched `In [v, fround(v)]`, a decimal key as a string literal, a null key by `isEmpty`          | No rows, or another group's rows, under a group (§5 rows 4-6)              | DC.5; also a fix for every DataCube host |
| C6  | Lossless numbers in the grid, optional                                                                                         | D2 (b)                                                                     | later                                    |
| C7  | Dark theme                                                                                                                     | D5; DataCube's theming plan                                                | separate                                 |

## 8. Steps

Each UI step gets a demo video with every caption true on screen, as before. Each step's PR is a draft until the
user says otherwise.

| Step | Deliverable                                                                                                                                                                                                     | Done when                                                      | DataCube PRs |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| DC.0 | Spike: plan-only checks of §5's shapes on every database type; a throwaway DataCube in Analytics' results region on Northwind; group expansion on `FREIGHT` and a long decimal confirmed in the browser         | Facts table complete                                           | —            |
| DC.1 | The adapter and source (§6.1), with fake-engine store tests and engine-backed tests on Northwind, the let form and a data space                                                                                 | Tests pass                                                     | —            |
| DC.2 | DataCube in the results region behind a **temporary** per-user flag ("Grid: classic / DataCube"), Execute and staleness, the carried view, the Runs panel, export, hosts' stylesheets; video                    | Browser rehearsal in Analytics, Query and Studio               | —            |
| DC.3 | "Add this view as steps" (§6.3), with refusals named; video                                                                                                                                                     | Unit tests of every mapping row; rehearsal                     | —            |
| DC.4 | The upstream PRs C1-C5, each with its own tests, reviewed by DataCube's owners                                                                                                                                  | Merged                                                         | C1-C5        |
| DC.5 | DataCube is the only results view: `meta.dataCube`, migration of old cubes (§6.6), C1's cell items for Cube's quick actions and Explore JSON, C2's source swap; video                                           | Migration tests on saved cubes from every milestone; rehearsal | C1-C5        |
| DC.6 | Remove the old grid: components, the server-side grid and fetcher, the core's drill-down, local mode, formats, their tests; update the guided tour's grid steps and the user guide's `results.md` and `json.md` | `yarn check:ci`, every suite, the e2e tests                    | —            |

## 9. What goes and what comes

- **Goes,** about 10,600 lines 📄:
  - grid components (2,973);
  - the grid's state, fetcher, quick actions and export (1,170);
  - the core's drill-down and formats (652);
  - parts of `stores/variant/` that only the grid uses (about 700 💭);
  - their tests: the builder's (4,321) and the core's drill-down and formats (780).
- **Comes,** about 2,000 lines 💭:
  - the adapter and source (about 600);
  - the region (about 300);
  - "Add this view as steps" (about 500);
  - the migration (about 200);
  - their tests (about 400).

## 10. Risks

- **Wrong rows** until C4 and C5 land (§5). DataCube shouldn't be the default before them.
- **Dark mode:** a light grid under Cube's dark canvas (D5).
- **More engine calls:** every DataCube view change re-runs a query, where M7 cached levels. Warehouses bill by query.
- **Looks and density:** DataCube's dense classic look differs from Cube's. Users of the current grid's menu will
  find its items elsewhere.
- **Upstream timing:** five PRs in a package others own.
- **Studio:** the MatView editor's space and theme, checked in DC.2.
