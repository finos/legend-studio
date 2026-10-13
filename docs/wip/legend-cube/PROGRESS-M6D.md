# Legend Cube — M6d Progress Log

> **What this file is:** the "where are we" ledger for M6d, the operations cleanup (PLAN §11.3 and §11.14). It is
> kept apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.14 holds what M6d settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| Branch | `cube-ops-cleanup`, stacked on `cube-pivot` (#5674), from `cube-dev` (`4a0bfe3e0`)        |
| Engine | Local legend-engine on `localhost:6300`                                                   |
| Step   | M6d.4 done: on the engine; next M6d.5, the guides and changeset                           |
| Tests  | 2971 core, 1768 builder (core group); engine suites 951 of 954, 3 skipped on H2 by design |

## Steps

See PLAN §11.14 for each step's deliverable and when it is done.

- [x] **M6d.1** The settled decisions (PLAN §11.14), this file, ISSUES.md
- [x] **M6d.2** Core: names, a Join's shared columns in any case, the aggregations, the pattern rules
- [x] **M6d.3** Builder: the row limit, the grid's Filter by on a float, refusals shown once, the function lists
- [x] **M6d.4** On the engine
- [ ] **M6d.5** Guides, READMEs, testing.md and the changeset
- [ ] **M6d.6** Verification and the browser rehearsal
- [ ] **M6d.7** A demo video (PLAN §11.3)
- [ ] **M6d.8** Fold PLAN §11.14's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                              |
| ----- | ----------- | ---------------------------------------------------- |
| M6d.1 | `4dc165228` | docs: settle Legend Cube M6d (operations cleanup)    |
| M6d.2 | `120c55365` | feat: clean up Legend Cube's core operations (M6d)   |
| M6d.3 | `56e3e4d85` | fix: clean up Legend Cube's grid and editors (M6d)   |
| M6d.4 | `6e482a9c2` | test: run Legend Cube's M6d operations on the engine |

## Notes

- **M6d.1** (2026-10-13). Asked what was left in operations after M6c, the user took the recommended cleanup and asked
  for it in parallel with M8 (on another computer; its section is PLAN §11.13). Two answers, both on the
  recommendation: the grid's Filter by on a float writes `In [shown, 32-bit]`, and a `startsWith`, `endsWith` or
  `contains` given a non-literal pattern is refused unless the database is Snowflake, in Filter by Expression and
  Extend. Four probes (`cleanup-requirements/`): `c1` a column pattern on DuckDB (the column's SQL written as the
  pattern's text: nothing found) and H2 (its `%` and `_` matched as wildcards); `c2` the same planned on the 20
  types, right only on Snowflake; `c3` Min and Max on a String and a Boolean, run in a groupBy, an aggregate, a window
  and a pivot on H2 and DuckDB; `c4` a Boolean column's Min and Max written `max(b)` on SQL Server, Sybase and
  Postgres. Earlier the same day, at the user's word, `cube-dev` was reset to master (`4a0bfe3e0`, #5669 had
  brought its three commits in) and `cube-pivot` rebased onto it, its tree unchanged.
- **M6d.2** (2026-10-13). `isValidColumnName` refuses a backtick, so every name Cube gives a column does;
  `isPivotValueText` is gone. `getDuplicateJoinColumns` compares names folded through `getCollidingJoinColumns`: a
  same-named key is exempt only when exact, and Difference's compared columns, which it renames on both sides, are
  left out of the check; the autofix renames each side's own name (`ID_1`, `id_2`), in the Left names' order, keeps a
  merged key's name, and adds no Rename to a side with nothing to rename. `getAvailableAggregations`: dates, strings and
  Booleans the distinct ones then Min and Max (`ORDERED`), Min and Max on strings and Booleans typed as the column;
  StrictTime and enumerations the distinct ones. The pattern helpers moved to `LikeFunctions.ts`, with
  `findLikeFunctionWithNonLiteralPattern`; `CubeDialects` reads a Filter by Expression's condition and an Extend's
  columns alike (`findInLambdas`): `getNonLiteralPatternProblem` (refused unless Snowflake, none known included),
  `givesNonLiteralPattern` in `dependsOnDatabaseType`, `getEmitPatternProblem` the emitters' backstop for both nodes
  (only once the type is known: typing passes none). Extend refuses a backslash in a `LIKE` literal. ISSUES.md: the
  Join and backtick entries removed. Tests: the aggregation table, the Join and autofix in any case, the pattern rules
  per database, the Extend's backslash, a backtick name; the three editors' function lists.
- **M6d.3** (2026-10-13). The row limit is read with `parseWholeNumberText` (`getRowLimitError` takes the number):
  `0x10`, `1e3`, `0b11` and `1.0` are refused. The grid's Filter by builds its rule with `buildDrilldownKeyRule`, so a
  float that differs from its 32-bit value gives `In [shown, 32-bit]`, as a drill-down key; the floating-point hint
  shows on Equal and In, not Is Empty. A condition Cube refuses before the engine is marked `refused` and left out of
  the status under the code, so it shows once, in the panel's problems; the draft loads the outline before deciding
  whenever the condition depends on the database (`dependsOnDatabaseType`), so a pattern that isn't a literal is
  judged with the cube's database. ISSUES.md: the row limit and REAL entries removed. Tests: the row limit's texts,
  the float filter (In, Equal), a refusal shown once, a non-literal pattern on H2, DuckDB and Snowflake in the draft,
  and in a Filter by Expression and an Extend through the editor's database rule (a refused one runs nothing).
- **M6d.4** (2026-10-13). `CubeOperationsCleanup.engine-roundtrip-test.ts`, on H2 and DuckDB direct
  connections: a String's and a Boolean's Min and Max in a Group (`Zed` before `fig` on both) and a window; a
  String's Max in a Pivot (DuckDB); the grid's float rule finding a `REAL` value (DuckDB: on H2 a direct connection's
  `REAL` is explored as `Other` and left out, now in ISSUES.md, and DuckDB's Equal finds it too, comparing in 32
  bits; Northwind's `REAL` on H2 is CubeDrilldown's test); a Join of `ID` and `id` reported and its fix run (DuckDB,
  which keeps a quoted name's case). `LegendCubeDialects`: a column pattern written `contains(a, b)` on Snowflake,
  with `concat('%%', …)` on H2, and as the column's own SQL in the text on the 18 others, where Cube's emitter
  refuses it (a canary). The conformance suite's every-function cases now type ALLTYPES' `VC` and `B` Min and Max
  too. Engine suites: 951 of 954 (3 skipped on H2 by design; the 4 local setup-SQL timeouts passed this run).
