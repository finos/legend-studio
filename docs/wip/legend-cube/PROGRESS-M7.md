# Legend Cube — M7 Progress Log

> **What this file is:** the "where are we" ledger for M7, the grid and presentation (PLAN §11.3 and §11.10). It is
> kept apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.10 holds what M7 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                |
| ------ | -------------------------------------------------------------------- |
| Branch | `cube-m7`, from `cube-dev` (`b10f82d0c`); a draft PR into `cube-dev` |
| Engine | Local legend-engine on `localhost:6300`                              |
| Step   | M7.1–M7.7 done                                                       |
| Tests  | Unchanged from `cube-dev`                                            |

## Steps

See PLAN §11.10 for each step's deliverable, its effort and when it is done.

- [x] **M7.1** The settled decisions (PLAN §11.10) and this file
- [x] **M7.2** Decimal literals sent as strings
- [x] **M7.3** The drill-down in the core
- [x] **M7.4** Query derivation in the core
- [x] **M7.5** The builder's row fetcher
- [x] **M7.6** The grid's server-side row model and the mode toggle
- [x] **M7.7** The drill-down in the UI
- [ ] **M7.8** Export
- [ ] **M7.9** The curated context menu
- [ ] **M7.10** The stats popover
- [ ] **M7.11** Column formatting and widths
- [ ] **M7.12** Around the databases
- [ ] **M7.13** Guides, testing.md and the changeset
- [ ] **M7.14** Verification and the browser rehearsal
- [ ] **M7.15** A demo video of M7 (PLAN §11.3)
- [ ] **M7.16** Fold PLAN §11.10's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit      | Subject                                                                                                  |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------- |
| M7.1 | `026541662` | docs: settle Legend Cube M7 (the grid and presentation)                                                  |
| M7.2 | (this one)  | fix: send Legend Cube's decimal literals as text, so they keep every digit                               |
| M7.3 | `e493765ef` | feat: add the drill-down to Legend Cube's core: the saved levels and aggregations, checked against a run |
| M7.4 | `6bf07c65f` | feat: derive each level of Legend Cube's drill-down as a query of Cube's own nodes                       |
| M7.5 | `f33fe7723` | refactor: run Legend Cube's queries through one path, shared by Execute and the grid's fetches           |
| M7.5 | `dcdcfe2bb` | feat: fetch the levels of Legend Cube's grid from the run on screen, cached, with run stats              |
| M7.5 | `e27cfeb77` | test: check that Legend Cube's grid cache keeps the levels used last                                     |
| M7.6 | `0db3cccd1` | feat: show Legend Cube's results server-side by default, with drill-down levels, and a local mode        |
| M7.7 | (this one)  | feat: drill down Legend Cube's results from a cell, with a levels bar and the group rows' settings       |

## Notes

- **M7.1** (2026-10-11). `cube-dev` had been squash-merged into master (#5659) with everything through #5666; it was
  reset to master (`b10f82d0c`, the same tree as `cube-dev`'s head `8adb7a2c0` plus the release bump) and M7 branches
  from it. The user's four answers, all on the recommendation: server-side mode by default with local mode as a
  toggle; each level fetched whole, bounded by the row limit, not paged; CSV of the whole query through the engine and
  XLSX of the loaded rows; a group row's numeric cells summed, other cells empty, with a `Count Rows` column. The
  probes (`m7-requirements/` in the evidence folder): the drill-down's queries on H2 (null keys, sums, names), the
  engine's CSV, decimal literals as numbers and strings, and whether each key found by a `groupBy` is found again by
  `Equal`. One finding: a 32-bit
  (REAL) key isn't found again by `Equal` with the text the engine returns (0 of 25 `FREIGHT` keys), and Cube can't
  tell a 32-bit column by its type (the engine types `REAL` as Double and `FLOAT` as Float4), so a float key is matched
  by `In` of the value and its 32-bit neighbour (PLAN §11.10).
- **M7.2** (2026-10-11). `V1_CubeLambdaSerializer` writes a decimal literal's value as its text, in a filter and in
  an Extend's expression; integers and floats stay lossless JSON numbers. The engine reads the text as a `BigDecimal`
  in every call Cube makes: rendering, typing and running (`p5-decimal-string.out`). Two engine cases on
  `ALLTYPES.NUM` (`1.2345`) fail before the fix and pass after: `> 1.2344999999999999` gives rows 1 and 2, and `==`
  gives none; as a JSON number the literal was read as `1.2345`. The ISSUES entry is gone; one patch changeset for M7
  is started. Jest reads `@finos/legend-cube` from its `lib/`, which must be rebuilt after a rebase
  (`yarn workspace @finos/legend-cube build`), or the builder's tests fail on code the build lacks.
- **M7.3** (2026-10-11). `drilldown/Drilldown.ts` in the core: `Drilldown {columns, aggregations}` with an
  aggregation per column only where it differs from the default (a number's Sum, nothing for any other column), `null`
  for an empty cell; `checkDrilldown` against the run's schema gives the usable levels (in order, as the schema names
  them, in any case), each column's aggregation, and a message for each level or aggregation left out (not in the
  output, not groupable, listed twice, unknown, incompatible); edits add a level innermost, remove one, and set an
  aggregation. `CubeMeta.drilldown`, saved as `meta.drilldown` (levels required, aggregations left out when none, unknown
  keys kept at both levels), none written for an empty one. A plan correction: Cube's Group refuses an output named as
  an input column, so a level's aggregations keep a Group's names and the derivation maps them back to the grid's
  columns (PLAN §11.10). The forward-compatibility tests used a `drilldown` key as the example of one a newer Cube
  adds; they use `pivot` now.
- **M7.4** (2026-10-11). `drilldown/DrilldownQuery.ts`: `deriveDrilldownLevel` appends, after the run's node, a
  Filter of the expanded keys (And), at a group level a Group by the levels down to it with each other column's
  aggregation under a Group's own name (`FREIGHT Sum`, numbered past a taken name, `cube_value` past the length limit)
  and a Count rows, then a Sort: the grid's on a group column, by the aggregation on another, left out on a column
  with none, by the new level's column when none is left; at the leaf the grid's sort as is. It returns the query,
  the output column of each run column, and the count column. `buildDrilldownKeyRule`: Is Empty for an empty key,
  `In [v, fround(v)]` for a float the two differ on, else the grid's Filter by rule. A first try wrote every `Float4`
  value at 32 bits in the Filter emitter; reverted when the fixture showed the engine types H2's 32-bit `REAL` as
  Double and its 64-bit `FLOAT` as Float4 (`p3c-in-both.out`, PLAN §11.10). Tests: unit tests of every shape (each
  derived query valid by Cube's own checks, its Pure printed), and `CubeDrilldown.engine-roundtrip-test.ts`, which
  runs each level on H2 and compares it with groups counted and summed from the run's rows: countries, France's
  cities, Lyon's orders sorted, the 507 orders with no region, a sort by an aggregation, set aggregations, a sample of
  `FREIGHT` keys each expanded to its rows, and a key of each `ALLTYPES` type. Mutants: float keys by
  Equal only (caught by the unit test and the engine's `FREIGHT` sample), no default sort at a group level (caught by
  the unit test; H2 happens to return groups in key order), grouping by the new level alone (caught).
- **M7.5** (2026-10-11). Asked first (advisor): Execute stays the flat run of the capture node, so its rows, node
  errors, staleness and quick actions are unchanged; the fetcher serves every server-side level, the top one included
  when a drill-down or a header sort is set (PLAN §11.10). `runCubeQuery` (`CubeQueryRun.ts`) is the run path both use:
  outline and database type when needed, emit, engine, column check, truncation; committed alone, the whole builder
  suite green after it. `CubeGridFetcher` derives a level from the run on screen (its query, context, schema and row
  limit, never the live cube's) with the cube's drill-down as it is now, checks it with Cube's own rules before the
  engine sees it, maps each row to the run's column positions (`undefined` where a group row has no aggregation, the
  group's count beside), and caches each level by its whole run lambda, the least recently used dropped past 200,000
  rows (never the one just answered). A purge (a new run, a reset) aborts the fetches in flight and drops their
  answers by a generation number; a failed fetch leaves the cache, so a retry runs again. It refuses a run made in
  another context, since the engine reads the warehouse from the page. `CubeRunStatsState` keeps the 15 latest runs
  (Execute and each fetch, labelled e.g. `Groups by SHIP_COUNTRY, sorted by FREIGHT descending`). Tests: 13 store
  tests on the fake engine; a unit test that the leaf keeps the run's own sort (after the grid's, as a tie-breaker);
  two more engine cases: a Partition run expanded to Lyon keeps France's running sum and row numbers (M5's `let`
  isolation applies), and a Limit run's groups hold its 100 rows.
- **M7.5, mutants** (2026-10-11): no generation check, the live row limit, failed levels kept, no eviction, no LRU
  touch on a hit; the last survived, so a test now uses a level again before the budget is reached (`e27cfeb77`).
- **M7.6** (2026-10-11). `CubeGridState` (`editorState.grid`): the mode, remembered for the user (server-side by
  default); `toSorts` maps ag-grid's sort model to the run's columns (the groups' column to the level's own, nothing at
  the leaf); `loadRows` gives a request its rows: the run's own when nothing is derived, else a fetched level, groups
  with their typed keys (`JSON` ids, so an empty key and the text `null` differ) and counts; a fetch's error and a
  level cut at the row limit are shown above the grid. `CubeServerSideGrid`: ag-grid's server-side row model, tree data
  when the cube has drill-down levels (the groups' column shows each key as its column shows a value, with the count),
  blocks taken from the whole level; rebuilt for each run and drill-down. `CubeResultGrid` is local mode: ag-grid's
  row groups, pivot, filters, side panels, status bar and cell selection, its totals read as numbers. Column defs and
  the context menu are shared; on a group row, Filter by is disabled on an aggregated or empty cell. The toolbar has
  the mode toggle and a "fetching rows" note. Tests: grid state (7), the region in both modes (a header sort on the
  engine, a drill-down's groups and a group expanded to its rows, the browser sorts in local mode); ag-grid's
  server-side model renders in jsdom. Browser on :9004 (with `NonProductionFeatureFlag`): Largest buys sorted by a
  header on the engine; imported with `meta.drilldown` [INSTRUMENT_ID, TRADE_DATE]: groups 5 (4), 12 (6), 13 (10),
  13 expanded by date, a date to its trade; local mode's panels; no console error on a fresh run.
- **M7.7** (2026-10-11). 'Drilldown by "X"' heads a cell's menu (spec §12.4), in both modes: it adds X as the
  innermost level, switching local mode to server-side; disabled on a type that can't be grouped, a column that is a
  level already, or a read-only cube. Drill-down edits (`CubeGridState`: add, remove, an aggregation, clear) are undo
  steps of the cube's meta that run nothing and keep the rows current; the grid is rebuilt for the new drill-down.
  `CubeDrilldownBar` above the server-side grid lists the levels (each removable), what the drill-down can't use and
  why, 'Group rows…' and Clear; the dialog sets, per column that isn't a level, a function its type offers or Nothing,
  the default marked. Tests: the menu (Drilldown by first, its blockers, an undoable add; Filter by on a group row's
  key, never on an aggregate or an empty cell), the grid state's edits as undo steps, the bar and dialog in the
  region (an Average re-fetches). Browser: Largest buys, Drilldown by INSTRUMENT_ID from a cell, TRADE_ID set to
  Nothing and PRICE to Average, 13 expanded to its 10 trades.
