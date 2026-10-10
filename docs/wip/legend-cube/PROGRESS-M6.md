# Legend Cube — M6 Progress Log

> **What this file is:** the "where are we" ledger for M6, Difference and Extend (PLAN §11.3 and §11.7). It is kept
> apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2, M4 and M5 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.7 holds what M6 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                 |
| ------ | ------------------------------------------------------------------------------------- |
| Branch | `cube-m6`, from `cube-dev` `1f8f8cf0b`; a draft PR into `cube-dev` (user, 2026-10-10) |
| Engine | Local legend-engine on `localhost:6300`                                               |
| Step   | M6.3: Difference in the builder, and registered                                       |
| Tests  | 2796 core, 1349 builder (core group)                                                  |

## Steps

See PLAN §11.7 for each step's deliverable and when it is done.

- [x] **M6.1** The settled decisions (PLAN §11.7) and this file
- [x] **M6.2** Difference in the core
- [x] **M6.3** Difference in the builder, and registered
- [ ] **M6.4** Difference on the engine, around the databases and in the browser
- [ ] **M6.5** Extend in the core
- [ ] **M6.6** The engine adapter: parse, render, type and plan expressions
- [ ] **M6.7** Retyping in the builder
- [ ] **M6.8** The Extend editor, and registered
- [ ] **M6.9** Extend on the engine, in the conformance suite and around the databases
- [ ] **M6.10** Guides, READMEs and the changeset
- [ ] **M6.11** Verification and the browser rehearsal
- [ ] **M6.12** A demo video of M6's features (PLAN §11.3)
- [ ] **M6.13** Fold PLAN §11.7's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit      | Subject                                          |
| ---- | ----------- | ------------------------------------------------ |
| M6.1 | `13fc28972` | docs: settle Legend Cube M6 (Difference, Extend) |
| M6.2 | `58c56830e` | feat: add Difference to Legend Cube's core       |
| M6.3 | (this one)  | feat: add Difference to Legend Cube's builder    |

## Notes

- **M6.1** (2026-10-10). The user's answers, all on the recommendation: Extend's expressions edited inline in the
  panel, as full lambdas (`x | …`), a column able to use the ones above it, and automatic retyping; Difference with
  native types, after the probes showed `toFloat()` refused when planning on 7 of 20 database types. The probes
  (`m6-requirements/` in the evidence folder) also found that Extend must be typed over the cube's model, since an
  empty model can't type the model's enums or functions.
- **M6.2** (2026-10-10). `Difference` (`nodes/transforms/Difference.ts`), its emitter and codec, defined in the
  registry as `DIFFERENCE_DEFINITION` but not in `createNodeRegistry()` until M6.3. Join's key checks are shared
  (`validateJoinKeys`), and so is its relation (`emitJoinRelation`, the join before its `select`), with no change to
  Join's output. Two Cube messages: a difference column that is a join column, and an output name that is too long;
  an output name an input already has, or that folds to another output's, reuses the generic "already present"
  messages. A missing difference column names its side (`Left difference column`, `Right difference column`), as
  Join's keys do, where the spec says "Difference column". The schema filters the difference columns out of
  `buildJoinSchemaColumns`' output rather than adding PLAN §2's `exclude` set (to fold in M6.13). New role
  `EmitRole.DIFFERENCE`.
- **M6.3** (2026-10-10). Registered between Join and Partition, with the spec's help text and `CompareIcon`. Join's
  key-pair rows are shared (`CubeJoinKeyPairs.ts`, `CubeJoinKeyRows.tsx`), and `CubeColumnChecklist` takes a reason per
  column (`unpickableReason`). `CubeDifferenceDraft`: Join's pairs, and difference columns kept in a saved order until
  the picks change, then in the Left input's order. `CubeDifferenceEditor`: Swap Inputs, the pairs, and the Left
  input's columns, each one that can't be a difference column saying why (a join column, not a number, not in the
  Right input, or another type there), then three notes. `findColumnOrigins` follows `x_1` and `x_2` to their side's
  `x`; a difference comes from none. The Join editor's "Rename them" autofix isn't offered for a Difference (its
  duplicate columns are listed in its problems). `operations.cube.json` gains a Difference of two ORDERS on
  ORDER_ID and EMPLOYEE_ID, by SHIP_VIA and FREIGHT. The patch changeset now names Difference; Extend joins it later.
  Conformance cases move to M6.4, with the engine.
