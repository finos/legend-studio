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
- [ ] **M5b.2** The core
- [ ] **M5b.3** The builder
- [ ] **M5b.4** On the engine, around the databases, and in the composition and conformance suites
- [ ] **M5b.5** Guides, testing.md and the changeset
- [ ] **M5b.6** Verification and the browser rehearsal
- [ ] **M5b.7** A demo video of the new functions (PLAN §11.3)
- [ ] **M5b.8** Fold PLAN §11.8's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit     | Subject                                              |
| ----- | ---------- | ---------------------------------------------------- |
| M5b.1 | (this one) | docs: settle Legend Cube M5b (more window functions) |

## Notes

- **M5b.1** (2026-10-10). Asked what was next for operations once M6 was done, the user picked more window functions
  over Filter by expression, Pivot and Extend's gaps. Their answers, all on the recommendation: seven functions (Lag,
  Lead, NTile, Percent Rank, Cumulative Distribution, First, Last; not Nth, which needs a whole-partition frame the
  engine writes only with a partition column, and which SQL Server can't run); an offset only for Lag and Lead; Last
  as the partition's last row, written as First over the reversed sort. The probes (`m5b-requirements/` in the
  evidence folder): types and values on H2, what shares an extend, frames, and plans of each function alone and of
  the shape Cube will write on every database type.
