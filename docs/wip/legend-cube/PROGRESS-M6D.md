# Legend Cube — M6d Progress Log

> **What this file is:** the "where are we" ledger for M6d, the operations cleanup (PLAN §11.3 and §11.14). It is
> kept apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.14 holds what M6d settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| Branch | `cube-ops-cleanup`, stacked on `cube-pivot` (#5674), from `cube-dev` (`4a0bfe3e0`) |
| Engine | Local legend-engine on `localhost:6300`                                            |
| Step   | M6d.1 done: the plan; next M6d.2, the core                                         |
| Tests  | 2964 core, 1756 builder (core group); engine suites 920 of 924 (as M6c)            |

## Steps

See PLAN §11.14 for each step's deliverable and when it is done.

- [x] **M6d.1** The settled decisions (PLAN §11.14), this file, ISSUES.md
- [ ] **M6d.2** Core: names, a Join's shared columns in any case, the aggregations, the pattern rules
- [ ] **M6d.3** Builder: the row limit, the grid's Filter by on a float, refusals shown once, the function lists
- [ ] **M6d.4** On the engine
- [ ] **M6d.5** Guides, READMEs, testing.md and the changeset
- [ ] **M6d.6** Verification and the browser rehearsal
- [ ] **M6d.7** A demo video (PLAN §11.3)
- [ ] **M6d.8** Fold PLAN §11.14's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit | Subject |
| ---- | ------ | ------- |

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
