# Legend Cube — M6b Progress Log

> **What this file is:** the "where are we" ledger for M6b, Filter by expression (PLAN §11.3 and §11.11). It is kept
> apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.11 holds what M6b settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| Branch | `cube-filter-expr`, from `cube-dev` (`be232b8e2`); a draft PR into `cube-dev` |
| Engine | Local legend-engine on `localhost:6300`                                       |
| Step   | M6b.1: the settled decisions                                                  |
| Tests  | As on `cube-dev`                                                              |

## Steps

See PLAN §11.11 for each step's deliverable and when it is done.

- [x] **M6b.1** The settled decisions (PLAN §11.11) and this file
- [ ] **M6b.2** The core
- [ ] **M6b.3** The builder's engine-checked nodes
- [ ] **M6b.4** The editor, registered
- [ ] **M6b.5** On the engine, around the databases, and in the conformance suite and the corpus
- [ ] **M6b.6** Guides, READMEs, testing.md and the changeset
- [ ] **M6b.7** Verification and the browser rehearsal
- [ ] **M6b.8** A demo video (PLAN §11.3)
- [ ] **M6b.9** Fold PLAN §11.11's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit     | Subject                                             |
| ----- | ---------- | --------------------------------------------------- |
| M6b.1 | (this one) | docs: settle Legend Cube M6b (Filter by expression) |

## Notes

- **M6b.1** (2026-10-11). Asked what was left for operations once M6 and M5b were in `cube-dev`, the user picked
  Filter by expression, and asked whether pivot is in the spec or the plan: it isn't, as an operation (the spec names
  pivoting only as an ag-Grid mode, client-side in local mode and refused server-side); the engine has a `pivot()`
  relation function, whose columns come from the data's values, which Cube's offline schema can't know. The user's
  answers, all on the recommendation: its own node, after Filter by Column; one expression per node; a full lambda.
  The probes (`filter-expr-requirements/` in the evidence folder: `p1-filter`, `p2-precedence`, `p3-values`) found
  that a condition that isn't one Boolean fails with no location, so Cube types it alone too; that comparisons bind no
  tighter than `&&`, `||` and `!` in Pure, so a hint asks for parentheses; that compared directly an empty value keeps
  Pure's meaning, and after `->toOne()` SQL's; that a filter on a window column after Cube's `let` runs after the
  window; and that the engine's LIKE escaping gives wrong rows on H2 for `\` (which Cube refuses, as the column Filter
  does) and on DuckDB for `%` and `_`, for the column Filter too (ISSUES.md, new). Built on `cube-dev` after #5667
  (M7) merged, which took PLAN §11.10, so M6b is §11.11.
