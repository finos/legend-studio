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
| Step   | M7.1–M7.3 done                                                       |
| Tests  | Unchanged from `cube-dev`                                            |

## Steps

See PLAN §11.10 for each step's deliverable, its effort and when it is done.

- [x] **M7.1** The settled decisions (PLAN §11.10) and this file
- [x] **M7.2** Decimal literals sent as strings
- [x] **M7.3** The drill-down in the core
- [ ] **M7.4** Query derivation in the core
- [ ] **M7.5** The builder's row fetcher
- [ ] **M7.6** The grid's server-side row model and the mode toggle
- [ ] **M7.7** The drill-down in the UI
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
| M7.3 | (this one)  | feat: add the drill-down to Legend Cube's core: the saved levels and aggregations, checked against a run |

## Notes

- **M7.1** (2026-10-11). `cube-dev` had been squash-merged into master (#5659) with everything through #5666; it was
  reset to master (`b10f82d0c`, the same tree as `cube-dev`'s head `8adb7a2c0` plus the release bump) and M7 branches
  from it. The user's four answers, all on the recommendation: server-side mode by default with local mode as a
  toggle; each level fetched whole, bounded by the row limit, not paged; CSV of the whole query through the engine and
  XLSX of the loaded rows; a group row's numeric cells summed, other cells empty, with a `Count Rows` column. The
  probes (`m7-requirements/` in the evidence folder): the drill-down's queries on H2 (null keys, sums, names), the
  engine's CSV, decimal literals as numbers and strings, and whether each key found by a `groupBy` is found again by
  `Equal`. One finding changes M2's code too: a
  REAL (Float4) key isn't found again by `Equal` with the text the engine returns (0 of 25 `FREIGHT` keys), but is at
  its 32-bit value written in full (`Math.fround`), so the shared quick-filter rule will write it that way, which also
  fixes 'Filter by' on a REAL cell.
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
