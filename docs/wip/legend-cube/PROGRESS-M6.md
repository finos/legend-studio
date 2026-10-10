# Legend Cube — M6 Progress Log

> **What this file is:** the "where are we" ledger for M6, Difference and Extend (PLAN §11.3 and §11.7). It is kept
> apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2, M4 and M5 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.7 holds what M6 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| Branch | `cube-m6`, from `cube-dev` `1f8f8cf0b`; a draft PR into `cube-dev` (user, 2026-10-10)      |
| Engine | Local legend-engine on `localhost:6300`                                                    |
| Step   | M6.6: Extend's engine calls                                                                |
| Tests  | 2817 core, 1357 builder (core group); engine: the Difference suites, `CubeExpressions` (9) |

## Steps

See PLAN §11.7 for each step's deliverable and when it is done.

- [x] **M6.1** The settled decisions (PLAN §11.7) and this file
- [x] **M6.2** Difference in the core
- [x] **M6.3** Difference in the builder, and registered
- [x] **M6.4** Difference on the engine, around the databases and in the browser
- [x] **M6.5** Extend in the core
- [x] **M6.6** The engine adapter: parse, type and plan expressions
- [ ] **M6.7** Retyping in the builder
- [ ] **M6.8** The Extend editor, and registered
- [ ] **M6.9** Extend on the engine, in the conformance suite and around the databases
- [ ] **M6.10** Guides, READMEs and the changeset
- [ ] **M6.11** Verification and the browser rehearsal
- [ ] **M6.12** A demo video of M6's features (PLAN §11.3)
- [ ] **M6.13** Fold PLAN §11.7's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step | Commit      | Subject                                                     |
| ---- | ----------- | ----------------------------------------------------------- |
| M6.1 | `13fc28972` | docs: settle Legend Cube M6 (Difference, Extend)            |
| M6.2 | `58c56830e` | feat: add Difference to Legend Cube's core                  |
| M6.3 | `1a5a879ae` | feat: add Difference to Legend Cube's builder               |
| M6.4 | `5b1fa39c9` | test: run Legend Cube's Difference on the engine            |
| M6.5 | `1270430ee` | feat: add Extend to Legend Cube's core                      |
| M6.6 | (this one)  | feat: parse, type and plan Legend Cube's Extend expressions |

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
- **M6.5** (2026-10-10). `Extend` (`nodes/transforms/Extend.ts`): columns `{name, code, lambda}` and a typing
  (`unresolved`, `typed` with a type per column, or `failed` with the engine's message and the column it names), each
  for a signature (`getExtendSignature`: a digest, cyrb53 over a stable JSON text, of the input's columns and each new
  column's name and lambda). A stale typing reads as `unresolved`, and an unresolved one makes the node wait on the
  new marker `ERR_TYPING` (`isTypingError`), which the UI is to show as pending. Validation reuses the spec's and
  Rename's messages (`Columns cannot be empty.`, `New column name …`, `Column "x" is already present in the input
schema.`, `"x" does not have an expression.`, `"x" does not have a valid type.`) and adds three: a lambda of one
  parameter, and the engine's failure on a column or on all. Every new column is nullable. Emitted as one `extend`
  per column, the lambda as the new IR `lambdaJson`, marked `EmitRole.EXPRESSION` (the extends `EmitRole.EXTEND`).
  Saved as `{columns, typed?: {signature, types}}`, a failed typing never; a typing without a type per column reads as
  nothing typed; an unknown key on a column or the typing makes an Unknown node. Because a saved spec is read with
  `JSON.parse`, **a stored lambda keeps its number literals as their digit strings**, as Cube's literal values do
  (PLAN §4.9), and the serializer writes them digit for digit, stamping the origin on every object with a `_type`
  (`V1_CubeLambdaSerializer`). `EXTEND_DEFINITION` is defined, not registered until M6.8.
- **M6.6** (2026-10-10). `CubeEngine.parseExpression(code, sourceId)` reads the engine's JSON for a text losslessly
  (the client's unread response) into Cube's form, number literals as digit strings, both without locations (stored)
  and located (`V1_CubeExpression.ts`); `planLambda(model, lambda)` posts `generatePlan` with the body a run sends
  (`executionContextOf` and `executionBodyOf`, shared with `execute`). A `CubeEngineError` now carries the location the
  engine gives (`CubeSourceLocation`: source id, lines and columns). **Typing changed from PLAN §11.7's typed-parameter
  lambda to the chain Cube already types**: `typeLambdas` of the input's relation then one extend per column
  (`stores/CubeExtendTyping.ts`), which works on every kind of source as typing does (data products, ingest, direct
  connections), keyed `<extend id>#<k>` for the first k columns, so the first failing chain names the column. A
  stored lambda is marked with the Extend; a located one keeps its locations (the serializer keeps a lambda's own
  source information when no origin is given), so the editor can underline the text. Facts on the engine
  (`CubeExpressions.engine-roundtrip-test.ts`): digits kept; a parse error located; types per family (Double × Integer
  is Number); a column using the one before; the model's own enumeration and function typed over the cube's model,
  refused over the fixture without them; the failing column and its location (`NOPE` at 1:8–11); a nullable column
  refused until `->toOne()`; `dayOfWeekNumber()` plans and a row's `[…]->stdDevSample()` types, then fails to plan on
  H2 (`m6-requirements/p4-plan-fail.out`); two columns run with a literal beyond 2^53 exact. **A gap:** an
  expression whose result is an enumeration (`dayOfWeek()`) reads as a type Cube doesn't know, so it is refused with
  "does not have a valid type"; `->toString()` works around it. The test harness routes the new calls
  (`generatePlan`, and the expression parse through `postWithTracing`).
