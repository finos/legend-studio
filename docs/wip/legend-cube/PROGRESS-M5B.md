# Legend Cube — M5b Progress Log

> **What this file is:** the "where are we" ledger for M5b, more window functions (PLAN §11.3 and §11.8). It is kept
> apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.8 holds what M5b settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                    |
| ------ | ---------------------------------------------------------------------------------------- |
| Branch | `cube-m5b`, stacked on `cube-m6` (#5662, not merged yet); draft PR #5665 into `cube-dev` |
| Engine | Local legend-engine on `localhost:6300`                                                  |
| Step   | M5b.7: the demo video, sent; next M5b.8 (the ClickHouse choice is the user's)            |
| Tests  | 2833 core, 1420 builder (core group)                                                     |

## Steps

See PLAN §11.8 for each step's deliverable and when it is done.

- [x] **M5b.1** The settled decisions (PLAN §11.8) and this file
- [x] **M5b.2** The core
- [x] **M5b.3** The builder
- [x] **M5b.4** On the engine, around the databases, and in the composition and conformance suites
- [x] **M5b.5** Guides, testing.md and the changeset
- [x] **M5b.6** Verification and the browser rehearsal
- [x] **M5b.7** A demo video of the new functions (PLAN §11.3)
- [ ] **M5b.8** Fold PLAN §11.8's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                                                                                 |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------- |
| M5b.1 | `0b4bfb89e` | docs: settle Legend Cube M5b (more window functions)                                                    |
| M5b.2 | `dfc86d46b` | feat: add Lag, Lead, NTile, Percent Rank, Cumulative Distribution, First and Last to Legend Cube's core |
| M5b.3 | `f1622f395` | feat: offer the new window functions in Legend Cube's Partition editor                                  |
| M5b.4 | `3be7bf081` | test: run Legend Cube's new window functions on the engine and every database                           |
| M5b.5 | `1ad274e36` | docs: cover Legend Cube's new window functions in its guides                                            |
| M5b.6 | `99cff424d` | fix: show the error border of Legend Cube's invalid fields under Legend Query's theme                   |
| M5b.6 | `d8a84f1fd` | fix: report Legend Cube's window function problems one at a time, and keep invalid settings             |
| M5b.7 | (this one)  | docs: record Legend Cube M5b's demo video                                                               |

## Notes

- **M5b.1** (2026-10-10). Asked what was next for operations once M6 was done, the user picked more window functions
  over Filter by expression, Pivot and Extend's gaps. Their answers, all on the recommendation: seven functions (Lag,
  Lead, NTile, Percent Rank, Cumulative Distribution, First, Last; not Nth, which needs a whole-partition frame the
  engine writes only with a partition column, and which SQL Server can't run); an offset only for Lag and Lead; Last
  as the partition's last row, written as First over the reversed sort. The probes (`m5b-requirements/` in the
  evidence folder): types and values on H2, what shares an extend, frames, and plans of each function alone and of
  the shape Cube will write on every database type.
- **M5b.2** (2026-10-10). `Aggregation.ts`: NTile, Percent Rank and Cumulative Distribution join `WindowRankFunction`
  (no column, a sort; Integer, Float, Float, never empty); a new `WindowRowFunction` holds Lag, Lead, First and Last (a
  column of any type a window can sort by, its type, nullable; a sort). `needsWindowSort`, `getAggregationSetting` and
  `AGGREGATION_SETTING_DEFAULTS` (offset 1, buckets 4). `ColumnAggregation` gains `offset` and `buckets`, frozen with
  it (`freezeColumnAggregation`, Group's and Partition's). Two messages: a setting that isn't a whole number of at
  least 1, and a setting on a function that takes none. The emitter puts the new rank functions and Lag, Lead and
  First in the ranks' extend (`$p->ntile($r, n)`, `$p->lag($r, n).c`, …, a new `property` IR for a column of a row)
  and Last in a third extend, `first` over the window with every sort direction reversed. The codec reads `offset`
  and `buckets` as finite numbers, a missing one as its default, written back. `operations.cube.json` gains a
  Partition with all seven.
- **M5b.3** (2026-10-10). The aggregation rows hold their settings as typed text (`settings`), parsed by
  `parseWholeNumberText` (Limit's) into the node; picking a function keeps only its own setting, or its default, so a
  saved setting on the wrong function is reported until the function is picked again. The row editor shows an
  `Aggregation offset <n>` or `Aggregation buckets <n>` field before the name and marks a setting's problem on it.
  The Partition editor offers Lag, Lead, First and Last after the column type's functions, on a column a window can
  sort by, and NTile, Percent Rank and Cumulative Distribution after the ranks; its notes explain them.
- **M5b.4** (2026-10-10). On H2 (`LegendCubeOperations`): ALFKI's six orders by date, no tie, with all seven
  functions, the values checked and the engine's typing equal to Cube's. Direct connection (`…DirectConnectionOperations`):
  the six-row orders table on H2 and DuckDB, each country's rows. Plans (`LegendCubeDialects`): a shape with all seven
  joins `WINDOW_SHAPES`; on the 17 window types, `ntile(4)`, `percent_rank()`, `cume_dist()`, `lag(…, 1)`,
  `lead(…, 2)` and First's `first_value` over the window, and Last's over the reversed sort. ClickHouse writes
  `lagInFrame`/`leadInFrame` over a whole-partition frame (the frame check skips those) and DuckDB `first`. A pin shows
  the reversed sort puts empty values at the other end on every type: the engine writes `desc nulls first` where the
  database's default wouldn't. Composition (`CubeWindowComposition`): the reference gains the seven functions (SQL's
  NTile buckets, Percent Rank, Cumulative Distribution with ties, and the placed functions refusing a tie) and three
  graphs (two customers' Lag, Lead, First, Last and places; each country's Last by a ship date that can be empty; the
  newest tenth with NTile over no partition column); breaking Last's reversal in the built lib fails two of them.
  Conformance: one case with all seven, Cube's types exactly the engine's. The corpus types the new sample.
- **M5b.5** (2026-10-10). The core guide: the rank and row functions, a function's setting, and how they are emitted
  (the third extend for Last, the `property` IR). The builder guide: the row editor's setting field. `testing.md`: the
  new pins and the reference's functions. `.changeset/legend-cube-more-window-functions.md`: a patch for both packages.
  `check:ci` passes.
- **M5b.6** (2026-10-10). Review: a workflow of three reviewers (core; builder; tests and docs), then a skeptic per
  finding: 13 findings, 10 confirmed (one reported three times), 3 refuted (Group entries gaining defaults on save, which
  the codec change below makes moot; no test editing only a saved setting, the code being right; Percent Rank's and
  Cumulative Distribution's ties, which the database computes). Fixed:
  - **One problem per row:** the setting check ran before the sort check and beside a failed column check, so a row
    showed two problems and the editor marked the offset where the sort was missing. It now runs after them, lazily.
  - **A missing setting stays missing:** the codec read one as its default, so an invalid setting dropped from a draft
    came back valid after a save; now it is reported, as a Limit's cleared size. The draft keeps a saved setting that
    isn't a whole number (2.5, `1e21`) while its text is as it opened, so it stays reported on its row and an unrelated
    change doesn't drop it.
  - **Column origins:** Lag, Lead, First and Last hold their column's values, so `findColumnOrigins` follows them back
    to it (the Join and Concat editors' "type unknown" warnings depend on it).
  - **The editor's setting mark** matched any message quoting a setting's words; it is anchored to the function's own.
  - **ClickHouse** (from its documentation, not run): First and Last skip NULLs and Lag and Lead give a non-Nullable
    column's default at the edges, so wrong rows. Cube can't correct the SQL; PLAN §11.8, an editor note and an ISSUES
    draft for the engine record it. Refusing the four functions there is the user's choice.
  - **Tests:** the first composition's Last read a column empty on every row it reads (EMPLOYEE_ID now), the emitter's
    Lag check was never reached by its test (now called directly), a first-problem test, an origins test, a
    marking test and a saved-setting test.
  - **Also found while checking the demo's frames:** under Legend Query's theme no Cube text field showed its red error
    border (the theme's `input` rule outranks a utility class), filter values, names and sizes included; a Cube rule
    on `input[aria-invalid='true']` fixes it (`99cff424d`).
  - The browser rehearsal passes 57 of 57.
- **M5b.7** (2026-10-10). The demo video (`legend-cube-m5b-window-functions.webm`, 97 s, in the evidence folder's
  `demo/out-demo-m5b/`; `demo/demo-m5b.mjs` records it from `demo/m5b-specs/m5b-orders.json`): ALFKI's and ANATR's
  orders by date; Lag on FREIGHT, Lead on ORDER_DATE, First and Last on FREIGHT, run, each row checked against the
  orders before and after it; NTile with 2 buckets, Percent Rank and Cumulative Distribution, run and checked; an
  offset of 0 marked on its field; every new function's problem without a sort column; Show Pure's Last as `first` over
  the descending sort. 13 checks pass; each of its 11 frames was read against its caption. Two frames first showed less
  than their captions said (the functions list scrolls past five rows), so the script scrolls it to its end there.
