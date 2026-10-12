# Legend Cube — M6c Progress Log

> **What this file is:** the "where are we" ledger for M6c, Pivot (PLAN §11.3 and §11.12). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.12 holds what M6c settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| Branch | `cube-pivot`, from `cube-dev` (`c1b40a480`); a draft PR into `cube-dev`       |
| Engine | Local legend-engine on `localhost:6300`                                       |
| Step   | M6c.4 done: the editor; next M6c.5, the engine                                |
| Tests  | 2964 core, 1748 builder (core group); the pivot engine test on DuckDB, 4 of 4 |

## Steps

See PLAN §11.12 for each step's deliverable and when it is done.

- [x] **M6c.1** The settled decisions (PLAN §11.12), this file, ISSUES.md's Trino and Athena entry
- [x] **M6c.2** The core
- [x] **M6c.3** Databases: the one predicate, the guard, the lakehouse runtime table, the outline on open
- [x] **M6c.4** The editor, registered, and the palette greyed
- [ ] **M6c.5** On the engine, around the databases, and in the conformance suite and the corpus
- [ ] **M6c.6** Guides, READMEs, testing.md and the changeset
- [ ] **M6c.7** Verification and the browser rehearsal
- [ ] **M6c.8** A demo video (PLAN §11.3)
- [ ] **M6c.9** Fold PLAN §11.12's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                                          |
| ----- | ----------- | ---------------------------------------------------------------- |
| M6c.1 | `9c02931dc` | docs: settle Legend Cube M6c (Pivot)                             |
| M6c.2 | `25b370c4d` | feat: add Pivot to Legend Cube's core                            |
| M6c.3 | `f341d3892` | feat: refuse Legend Cube's Pivot where its database can't run it |
| M6c.4 | `7c0ab3ad1` | feat: add the Pivot editor to Legend Cube                        |

## Notes

- **M6c.1** (2026-10-12). Three probes (`pivot-requirements/` in the evidence folder): the engine's `pivot()` on
  H2 and DuckDB and planned on the 20 types (`p1`); what a native pivot needs on DuckDB (`p2`); the static form as
  Cube would write it, on every type, with each aggregation and awkward values (`p3`). The user chose the engine's
  `pivot()`, disabled where the database can't run it, then four questions on the recommendation: the static form,
  values loaded and picked, columns named by the value, greyed in the palette and refused on the node. `p3` found
  that Trino and Athena plan it with no `PIVOT` (ISSUES.md), so four types run it: Snowflake, Databricks, SingleStore
  and DuckDB.
- **M6c.2** (2026-10-12). `pivot` freed: the tests' example of a kind Cube doesn't know is now `future` (18 files, the
  newer-version fixture included; saved `meta` keys named `pivot` kept). The core: `Pivot` (`rows`, `column`,
  `values`, `aggregation`), its checks and eight messages, `getPivotColumnNames` (the value's text, `_2`, `_3` when
  taken, compared folded), its schema (the row columns, then a column per value, typed as in a Group); a
  `relationType` IR for the `cast`, printed and serialized as the engine parses `@Relation<(…)>`; `emitPivot`
  (`select`, `pivot`, `cast`, a `rename` per value; a `pivot` emit role); `PIVOT_CODEC`; `PIVOT_DEFINITION`, not in
  the default registry until the editor (M6c.4). Shared with Group: `validateAggregationFunctionAndColumn` (split out
  of `validateColumnAggregation`) and `emitAggregation`; `isLiteralValue` moved from FilterTree to `LiteralValue.ts`.
  `p4-cast.mjs` showed the cast takes Cube's precise types. A first engine test (`CubePivot.engine-roundtrip-test.ts`)
  runs Cube's pivot on a DuckDB direct connection: sums, counts with 0, no row column, string values with a space, a
  quote and a bar, then a Filter and a Sort on the value columns.
- **M6c.3** (2026-10-12). Core: `PIVOT_UNSUPPORTED_DATABASE_TYPES` (the 16 types that refuse it or plan it with no
  PIVOT; a type in neither list, or none, is allowed), `getDatabaseProblems` refusing a Pivot there
  (`Pivot is not supported on H2.`), `getDatabaseProblemOfType` for a node not added yet, the emitter's backstop,
  and one predicate, `dependsOnDatabaseType` (Drop, Slice, Limit, Distinct, Pivot, a pattern given `%` or `_`), which
  `needsDatabaseType` and the editor's rule read. Builder: `CubeLakehouseRuntime.ts`, the one table from a lakehouse
  runtime's kind to its database (`LakehouseRuntime` → Snowflake for now, `LakehouseSingleStoreRuntime` → MemSQL),
  which the data product and ingest models now write their runtime from; data product and ingest cubes report
  Snowflake. The outline loads as a cube with a table opens (and when an import changes its model); outlines are
  kept by the model's content, so a cube imported on the same model loads none, and a load already on its way is
  waited for, not started again (a run while the cube's opening load is out made two). `getAddDatabaseProblem` and
  the add placement grey a node type its database can't run, with the reason, in the palette and the Add menus
  (shown for Pivot once it is registered, M6c.4). Tests that asserted no outline without a Drop now assert it loads
  once, as the cube opens.
- **M6c.4** (2026-10-12). Pivot registered after Group (`createNodeRegistry`; the test registry dropped), with
  `CubePivotDraft` and `CubePivotEditor`: the row columns ticked (the pivot and aggregated columns can't be), the
  pivot column (one that can't be pivoted, or is a row or the aggregated column, shown but disabled, with why),
  Load values (`select`, `distinct`, `sort`, at most 100, through `runCubeQuery`, so written for the cube's database;
  empty values left out; "Only the first 100 values are listed." when there are more; why loading failed), the
  values ticked in the engine's order (All, None; one that can't name a column disabled), and the aggregation (its
  function, never Distinct Value, and its column, or "Every row"). Help text, the `TablePivot` icon, three notes. The
  palette and Add menus grey Pivot with "Pivot is not supported on H2." on an H2 cube; the menu tests now say so.
