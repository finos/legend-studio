# Legend Cube — M2 Progress Log

> **What this file is:** the "where are we" ledger for M2, the simple unary operations (PLAN §11.3 and §11.4). It is
> kept apart from [PROGRESS.md](PROGRESS.md), which covers M1, so the two lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.4 holds what M2 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------- |
| Branch | `cube-ops`, on master `3260216a6` (#5634, M1.9, merged 2026-10-08)                                   |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                                    |
| Step   | M2.1–M2.3 done (Limit in the core and the builder); M2.4 next (Limit on the engine and in a browser) |
| Tests  | 1475 core, 585 builder (core group), 236 Query, 63 builder engine-roundtrip (after M2.3)             |

## Steps

See PLAN §11.4 for each step's deliverable.

- [x] **M2.1** The settled decisions (PLAN §11.4) and this file
- [x] **M2.2** Limit in the core: node, codec, emitter
- [x] **M2.3** Limit in the builder, and registered
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
- [ ] **M2.17** Rebase on the latest master, fold PLAN §11.4's supersessions in, PR when the user asks

## Step notes

Hashes are after the rebase onto master.

**M2.1 (2026-10-08): `2648b456d`.** Requirements `m2-requirements`: 140 checklist items, a 17-step build order and 5
questions (the full result is kept in the local evidence folder). The user answered all five on the recommendation
(PLAN §11.4): re-point `cube-ops` at `cubeV1`, Limit first, Sort's ORDER BY where the order is used, database
workarounds detected from the runtime, and Slice's "(20 excluded)" wording. `cube-ops` had no commits of its own, so it
was reset to `cubeV1` (`b9923ed28`). Gates on that base: `check:ci` and `lint:ci` green; 1419 core, 538 builder (core
group), 236 Query and 63 builder engine-roundtrip tests.

**Rebase (2026-10-08).** #5634 merged as `3260216a6`, whose tree is `0807adb12`'s, so the base's last commit
(`b9923ed28`, the DuckDB WASM note) was not in it. `git rebase --onto origin/master b9923ed28 cube-ops` replayed the M2
commits with no conflicts; that note stays on `cubeV1`.

**M2.2 and M2.3, Limit (2026-10-08): `5d65d0251`.** One commit: the registry test requires every registered type's
editor, help text and icon, so the core step and the builder step land together.

- Core: `Limit` (no default in the constructor; 10 from its definition's `create`), the shared row settings
  (`RowSettings.ts`), `LIMIT_CODEC` (a JSON number, written whenever set, left out only when cleared, read with
  `readOptionalFiniteNumber`), `emitLimit` with the new `take` role, and the registry entry in menu order.
- Builder: `parseWholeNumberText`, `CubeIntegerField`, `CubeRowCountDraft` and `CubeRowCountEditor` ("Rows to keep"),
  the help text, and `AlignTopIcon`.
- Tests: the node, the emitter (origins, apart from the capture's `limit`), decode errors, encoding, validity through
  inference, an M1 registry reading a limit as an Unknown node, unknown keys through edits, and the
  `operations.cube.json` sample; the draft, the whole-number text, the editor through the panel (cleared and refused
  texts, read-only, one undo step) and Ctrl+Z in the size field. The palette, context menu and registry lists include
  Limit.
- Changeset: `legend-cube-unary-operations` (both Cube packages, patch).

## Open items

| Item            | Notes                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changeset check | `check:changeset` can't see a missing M2 changeset while M1.9's (on master until the next release) lists both Cube packages; check `git diff --name-only origin/master -- .changeset` |
| Supersessions   | PLAN §11.4's list is applied to the sections it names in one docs commit at the end of M2 (M2.17)                                                                                     |
| Mutation proofs | Run in the verification after M2.4, in an isolated copy of the packages                                                                                                               |

## Known local failures

Seen only in a repo-wide `yarn test`, not in the per-workspace gates: legend-dev-utils `TypescriptConfigUtils.test.js`
(the checkout's path has a space) and legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts` (the local engine
writes empty arrays that Studio's serializer leaves out).
