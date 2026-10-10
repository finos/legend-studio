# Legend Cube — M5b Progress Log

> **What this file is:** the "where are we" ledger for M5b, more window functions (PLAN §11.3 and §11.8). It is kept
> apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.8 holds what M5b settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                |
| ------ | ------------------------------------------------------------------------------------ |
| Branch | `cube-m5b`, stacked on `cube-m6` (#5662, not merged yet); a draft PR into `cube-dev` |
| Engine | Local legend-engine on `localhost:6300`                                              |
| Step   | M5b.1: The plan and this file                                                        |
| Tests  | As M6's: 2820 core, 1413 builder (core group)                                        |

## Steps

See PLAN §11.8 for each step's deliverable and when it is done.

- [x] **M5b.1** The settled decisions (PLAN §11.8) and this file
- [x] **M5b.2** The core
- [x] **M5b.3** The builder
- [x] **M5b.4** On the engine, around the databases, and in the composition and conformance suites
- [x] **M5b.5** Guides, testing.md and the changeset
- [ ] **M5b.6** Verification and the browser rehearsal
- [ ] **M5b.7** A demo video of the new functions (PLAN §11.3)
- [ ] **M5b.8** Fold PLAN §11.8's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                                                                                 |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------- |
| M5b.1 | `0b4bfb89e` | docs: settle Legend Cube M5b (more window functions)                                                    |
| M5b.2 | `dfc86d46b` | feat: add Lag, Lead, NTile, Percent Rank, Cumulative Distribution, First and Last to Legend Cube's core |
| M5b.3 | (this one)  | feat: offer the new window functions in Legend Cube's Partition editor                                  |

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
