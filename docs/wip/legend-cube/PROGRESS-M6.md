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
| Step   | M6.4: Difference on the engine, around the databases and in the browser               |
| Tests  | 2796 core, 1349 builder (core group); engine: the Difference suites below             |

## Steps

See PLAN §11.7 for each step's deliverable and when it is done.

- [x] **M6.1** The settled decisions (PLAN §11.7) and this file
- [x] **M6.2** Difference in the core
- [x] **M6.3** Difference in the builder, and registered
- [x] **M6.4** Difference on the engine, around the databases and in the browser
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
| M6.3 | `1a5a879ae` | feat: add Difference to Legend Cube's builder    |
| M6.4 | (this one)  | test: run Legend Cube's Difference on the engine |

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
- **M6.4** (2026-10-10). On H2 (`LegendCubeOperations`, 3 tests): last month's orders against this month's, each
  row checked against a reference computed from ORDERS itself; every numeric family of ALLTYPES (TI, SI, BI as
  Integer, F, D as Float, DEC, NUM as Number), BI's 9007199254740993 read exactly, a right-only row of empty values
  giving 0; keys named apart, each empty on the other input's rows. On H2 and DuckDB through the direct connection, a
  small stock table compared with hand-computed values (`LegendCubeDirectConnectionOperations`). Conformance: three
  cases, the keys named apart declared wider (the engine types a full join's keys as never empty, yet they are, as
  the H2 test shows). Plans (`LegendCubeDialects`): a native `full outer join` on all 19 types but H2, where the
  engine emulates it (a left join `union all` a right join), so PLAN §8.8's "FULL native on 9" is outdated for this
  shape (to fold in M6.13); `coalesce(…, 0) - coalesce(…, 0)` and the float zero (`0.0`, Oracle's `0.0d`, H2's
  cast), never a cast of the values; two Difference shapes join `SHAPES`. The operations sample's Difference types
  as Cube infers it (`CubeSpecCorpus`). In the browser (`demo/check-m64-difference.mjs`, 12 checks, `out-m64/`):
  the palette order, the editor's problems and reasons, Apply, the 9 rows checked against their inputs, Show Pure,
  the saved spec. The fixture's FREIGHT is a REAL, so its differences show float noise (`32.380001068115234`); a
  demo should compare integers or DOUBLE columns.
