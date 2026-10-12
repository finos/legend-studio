# Legend Cube — M6c Progress Log

> **What this file is:** the "where are we" ledger for M6c, Pivot (PLAN §11.3 and §11.12). It is kept apart from
> [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly. [PLAN.md](PLAN.md)
> §11.12 holds what M6c settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------- |
| Branch | `cube-pivot`, from `cube-dev` (`c1b40a480`); a draft PR into `cube-dev`                         |
| Engine | Local legend-engine on `localhost:6300`                                                         |
| Step   | M6c.1 done: the plan                                                                            |
| Tests  | 2938 core, 1728 builder (core group); engine suites 892 of 896 (the 4 local setup-SQL timeouts) |

## Steps

See PLAN §11.12 for each step's deliverable and when it is done.

- [x] **M6c.1** The settled decisions (PLAN §11.12), this file, ISSUES.md's Trino and Athena entry
- [ ] **M6c.2** The core
- [ ] **M6c.3** Databases: the one predicate, the guard, the lakehouse runtime table, the outline on open
- [ ] **M6c.4** The editor, registered, and the palette greyed
- [ ] **M6c.5** On the engine, around the databases, and in the conformance suite and the corpus
- [ ] **M6c.6** Guides, READMEs, testing.md and the changeset
- [ ] **M6c.7** Verification and the browser rehearsal
- [ ] **M6c.8** A demo video (PLAN §11.3)
- [ ] **M6c.9** Fold PLAN §11.12's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit | Subject                              |
| ----- | ------ | ------------------------------------ |
| M6c.1 | –      | docs: settle Legend Cube M6c (Pivot) |

## Notes

- **M6c.1** (2026-10-12). Three probes (`pivot-requirements/` in the evidence folder): the engine's `pivot()` on
  H2 and DuckDB and planned on the 20 types (`p1`); what a native pivot needs on DuckDB (`p2`); the static form as
  Cube would write it, on every type, with each aggregation and awkward values (`p3`). The user chose the engine's
  `pivot()`, disabled where the database can't run it, then four questions on the recommendation: the static form,
  values loaded and picked, columns named by the value, greyed in the palette and refused on the node. `p3` found
  that Trino and Athena plan it with no `PIVOT` (ISSUES.md), so four types run it: Snowflake, Databricks, SingleStore
  and DuckDB.
