# Legend Cube — M2 Progress Log

> **What this file is:** the "where are we" ledger for M2, the simple unary operations (PLAN §11.3 and §11.4). It is
> kept apart from [PROGRESS.md](PROGRESS.md), which covers M1, so the two lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.4 holds what M2 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                        |
| ------ | -------------------------------------------------------------------------------------------- |
| Branch | `cube-ops`, from `cubeV1` at `b9923ed28` (the base for the rebase after #5634, PLAN §11.4)   |
| Rebase | Not yet: waits for the M1.9 follow-up PR (#5634) to be squash-merged                         |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                            |
| Step   | M2.1 done (the settled decisions and this file); M2.2 next                                   |
| Tests  | 1419 core, 538 builder (core group), 236 Query, 63 builder engine-roundtrip (the base, M2.1) |

## Steps

See PLAN §11.4 for each step's deliverable.

- [x] **M2.1** The settled decisions (PLAN §11.4) and this file
- [ ] **M2.2** Limit in the core: node, codec, emitter
- [ ] **M2.3** Limit in the builder, and registered
- [ ] **M2.4** Limit on the engine and in the browser: the contract proven
- [ ] **M2.5** Drop (native)
- [ ] **M2.6** Slice (native)
- [ ] **M2.7** Distinct
- [ ] **M2.8** Restrict
- [ ] **M2.9** Rename, with the column-name rule and the collision fix
- [ ] **M2.10** Join rename autofix
- [ ] **M2.11** Sort, the row-order module, and the ORDER BY where the order is used
- [ ] **M2.12** The Sort warning
- [ ] **M2.13** Database workarounds (row numbers for Drop and Slice, padded Distinct on SQL Server)
- [ ] **M2.14** Grid quick actions: Sort by and Filter by
- [ ] **M2.15** Docs, sample typing on the engine, changeset text
- [ ] **M2.16** Verification and the browser rehearsal
- [ ] **M2.17** Rebase onto master after #5634, fold PLAN §11.4's supersessions in, PR when the user asks

## Step notes

**M2.1 (2026-10-08).** Requirements `m2-requirements`: 140 checklist items, a 17-step build order and 5 questions
(the full result is kept in the local evidence folder). The user answered all five on the recommendation (PLAN §11.4):
re-point `cube-ops` at `cubeV1`, Limit first, Sort's ORDER BY where the order is used, database workarounds detected
from the runtime, and Slice's "(20 excluded)" wording. `cube-ops` had no commits of its own, so it was reset to
`cubeV1` (`b9923ed28`). Gates on the base: `check:ci` and `lint:ci` green; 1419 core, 538 builder (core group), 236
Query and 63 builder engine-roundtrip tests.

## Open items

| Item                         | Notes                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rebase after #5634           | `git fetch origin && git rebase --onto origin/master b9923ed28 cube-ops`, then every gate again, and the hashes here marked "after the rebase"     |
| Changeset check before #5634 | `check:changeset` can't see a missing M2 changeset while M1.9's lists both Cube packages; check `git diff --name-only origin/master -- .changeset` |
| Supersessions                | PLAN §11.4's list is applied to the sections it names in one docs commit after the rebase (M2.17)                                                  |

## Known local failures

Seen only in a repo-wide `yarn test`, not in the per-workspace gates: legend-dev-utils `TypescriptConfigUtils.test.js`
(the checkout's path has a space) and legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts` (the local engine
writes empty arrays that Studio's serializer leaves out).
