# Legend Cube — M6 Progress Log

> **What this file is:** the "where are we" ledger for M6, Difference and Extend (PLAN §11.3 and §11.7). It is kept
> apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2, M4 and M5 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.7 holds what M6 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                       |
| ------ | ------------------------------------------------------------------------------------------- |
| Branch | `cube-m6`, on `cube-dev` `b23afd19f`; draft PR #5662 into `cube-dev` (user, 2026-10-10)     |
| Engine | Local legend-engine on `localhost:6300`                                                     |
| Step   | M6.1–M6.13 done: M6 is complete, in draft #5662 for `cube-dev`                              |
| Tests  | 2820 core, 1413 builder (core group); engine: the Difference suites, `CubeExpressions` (10) |

## Steps

See PLAN §11.7 for each step's deliverable and when it is done.

- [x] **M6.1** The settled decisions (PLAN §11.7) and this file
- [x] **M6.2** Difference in the core
- [x] **M6.3** Difference in the builder, and registered
- [x] **M6.4** Difference on the engine, around the databases and in the browser
- [x] **M6.5** Extend in the core
- [x] **M6.6** The engine adapter: parse, type and plan expressions
- [x] **M6.7** Retyping in the builder
- [x] **M6.8** The Extend editor, and registered
- [x] **M6.9** Extend on the engine, in the conformance suite and around the databases
- [x] **M6.10** Guides, READMEs and the changeset
- [x] **M6.11** Verification and the browser rehearsal
- [x] **M6.12** A demo video of M6's features (PLAN §11.3)
- [x] **M6.13** Fold PLAN §11.7's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

Hashes after the rebase onto #5663 (`b23afd19f`); the PR is squash-merged, so they last only as long as the branch.

| Step  | Commit      | Subject                                                                                                     |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| M6.1  | `d247225cb` | docs: settle Legend Cube M6 (Difference, Extend)                                                            |
| M6.2  | `e7479d406` | feat: add Difference to Legend Cube's core                                                                  |
| M6.3  | `f48188d97` | feat: add Difference to Legend Cube's builder                                                               |
| M6.4  | `af8292782` | test: run Legend Cube's Difference on the engine                                                            |
| M6.5  | `cab62d39b` | feat: add Extend to Legend Cube's core                                                                      |
| M6.6  | `72f0f8f9f` | feat: parse, type and plan Legend Cube's Extend expressions                                                 |
| M6.7  | `cc7948e84` | feat: type Legend Cube's Extends in the background                                                          |
| M6.8  | `058b3c7dd` | feat: add the Extend editor to Legend Cube                                                                  |
| M6.9  | `daabb6332` | test: run Legend Cube's Extend on the engine and every database                                             |
| M6.10 | `3ce35c4a6` | docs: cover Legend Cube's Difference and Extend in its guides                                               |
| M6.11 | `f0112d2ce` | fix: redact Legend Cube expression literals, and read unknown typed-column keys as Unknown                  |
| M6.11 | `cf21a5337` | fix: retype a Legend Cube Extend when the input the engine sees changes, and keep the Extend editor's edits |
| M6.11 | `aed47eaaf` | test: show on the engine that an Extend over another types by what Cube's schema hides                      |
| M6.11 | (this one)  | docs: record Legend Cube M6.11's review and fixes                                                           |

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
- **M6.7** (2026-10-10). `CubeEditorState` types every Extend waiting on `ERR_TYPING` (`extendsToType`: its own
  checks passed, its input valid, not already sent) through a MobX reaction, in one `typeLambdas` call
  (`retypeExtends`), outside the undo history: the typing goes in place of the very nodes sent, in the cube shown and
  the undo snapshots (`replaceOutsideHistory`, now shared with the source re-check), so an answer for a node the user
  changed meanwhile is dropped and the new node gets its own round. A failure is stored, so it isn't retried until
  something changes. On import every Extend is typed once more, as sources are re-checked, and a typing that comes
  back the same leaves the node alone (`isSameCubeExtendTyping`; from M6.11, a loaded typing without a digest is
  replaced once, to record it). Pending is not invalid: the canvas shows a waiting
  or typing Extend as resolving (pulsing), the header says "typing new columns" with the loading bar, and the panel
  leaves `ERR_TYPING` out of its problems; Execute's reason names the waiting node. Not done: retyping on a model
  change within a session (the import covers a loaded cube); M6.11 does it.
- **M6.8** (2026-10-10). Extend is registered last, after Partition (spec §7.0's order), with the spec's help text
  and `CalculatorIcon`. `CubeExtendDraft`: a row per column, named `col_<n>` (the first name no column has), its code
  starting `x | `; Validate (button, or F10 through a new `legend-cube.validate-expressions` command) parses each
  changed code under the source id `<node id>:<row key>`, types the columns located (so an error is underlined in its
  code), then plans the query up to the node for the cube's database, planning again column by column to name the one
  that fails; each problem goes on its row, with the `->toOne()` hint after a multiplicity error, and the engine's
  ` - Context:[…]` trail cut. Apply waits until every code is the one validated: drafts gained `applyDisabledReason`,
  which the panel shows in place of the problems and as Apply's title; the node then holds the lambdas and their
  typing, so it needs no retyping. `CubeExtendEditor`: rows of name, move, expand, remove and a Monaco editor
  (legend-lego's `CodeEditor`, Pure, no gutter), the row's status (its problem, its type and "can be empty", or "Not
  validated yet"), Add column, Validate, and the input's columns, a click writing `$x.NAME` (quoted when not an
  identifier) at the end of the expression last used. **Deltas from PLAN §11.7:** no `$x.` completion (the column
  list writes the access instead); the input's columns aren't inserted at the cursor but at the end. In the browser
  (`demo/check-m68-extend.mjs`, 13 checks, `out-m68/`): the palette, the toOne() hint underlined in the code, F10,
  a column using the one above, Apply, the rows (`SHIP_VIA × 10`, then `× 2`), Show Pure's two extends, the saved
  spec.
- **M6.9** (2026-10-10). Conformance: two Extend cases (arithmetic with a column using the one before and a float
  times an integer, Number; text, a comparison and a date after a Restrict), typed as Cube expects for the input it
  infers (`__test-utils__/CubeExpressionTestUtils.ts`: `TEST__expression`, `TEST__typedExtend`), every new column
  declared wider (the engine types it `[1]` after `toOne()`); a wrong expected type fails the suite (checked by hand).
  Plans (`LegendCubeDialects`): two Extend shapes join `SHAPES`, and on all 20 types each new column is written as
  its expression, the second over the first, aliased with `as` or, on Oracle, a space. Direct connection: an Extend
  of three columns runs on H2 and DuckDB with the hand-computed values. `CubeExpressions` (M6.6) already runs typing,
  errors, plans and values on H2.
- **M6.10** (2026-10-10). The core guide: Difference and Extend as examples, a node built from another's parts, a node
  the engine types (typing, signature, `ERR_TYPING`, the saved typing, the expression JSON and `lambdaJson`), the menu
  order, its tests. The builder guide: drafts that wait for the engine (`applyDisabledReason`), Join's key rows and the
  checklist's reasons, the code editor, background typing, column origins, the fake engine's new mocks, `act` and the
  Monaco mock. `testing.md`: Difference's and Extend's engine tests, `CubeExpressions`, `TEST__typedExtend`, the new
  wider-nullable columns. Both READMEs list the two operations; the changeset names both.
- **M6.11** (2026-10-10). Rebased onto #5663 (`b23afd19f`, Depot databases): the adapter keeps Depot's message beside
  Extend's error locations, and `executionBodyOf` checks a tables model as `checkTablesModel` does, so a project
  pointer plans as it runs. Review: a workflow of three reviewers (core; builder and adapter; tests and docs), then a
  skeptic per finding. 18 findings, 14 confirmed, 4 refuted: Difference checks "not a join column" first on purpose
  (documented and pinned); the serializer's own-locations path is covered by `CubeExpressions`; the direct-connection
  Extend's hand types are the engine's; Apply after a rename is meant to leave the typing waiting. Fixed:
  - **Stale typing over another Extend** (medium): typing is a chain, so an Extend's types depend on what the engine
    sees of its input, which Cube's schema hides (every Extend column nullable). Dropping `->toOne()` above left the
    one below valid and failing at Run; adding it left a failure stuck. Each typing now records `upstream`, a digest
    of the input's emitted relation and the model (not saved); the editor adds a query rule that makes an Extend with
    another digest wait, so it is typed again and Execute waits meanwhile. This also retypes on a model change
    (M6.7's gap). The engine test shows the two typings over one Cube schema.
  - **Undo snapshots:** a background typing goes only into the snapshots that give the engine the same input, so an
    undo past an upstream edit is valid at once.
  - **Offline:** a typing still current for its input (a loaded one has no digest) is kept when the engine can't be
    reached, with a warning, as PLAN says; it used to become a stored failure, with nothing to retry it.
  - **The panel:** a background typing of the node it shows used to close it and drop its edits; the draft now follows
    a node that differs only in its typing (`CubeNodeDraft.follow`). Closing it, or opening another node, used to
    store unvalidated codes as columns without expressions; it now stays open with a notice (the user may prefer
    "drop with a notice"), and Apply refuses them.
  - **Validate** threw an unhandled error when the engine typed what Cube refuses (`ship_via` over ORDERS, a type
    such as `Any`): Cube's per-column checks (`getColumnProblems`) run before typing, the types
    (`getTypeProblems`) before planning, each on its row, and an emitter failure becomes a row problem. Body-only
    code and two parameters get Cube's message, as PLAN said.
  - **Core lows:** `describeRedacted` gives `Extend with N columns`; `printIR`'s `redactLiterals` redacts a lambda's
    literals; an unknown key in a typed column's type makes the node Unknown.
  - **Tests the reviewers asked for:** a column type in the signature, the first of three columns failing to plan,
    the error marker reaching the code editor, and F10.
  - **Docs:** PLAN §11.7's retyping (no debounce; the digest; offline) and closing; the builder guide's source ids;
    then (after M6.13) both guides on the digest, the editor's rule, Execute's gate, snapshot predicates, `follow`
    and the kept-open panel, and a test that the digest is the same whichever node is selected.
  - **The digest's cost:** it covers the whole emitted relation, filter values included, so any edit above an Extend
    makes it, and the nodes after it, wait for one engine call, Execute too.
  - **Gates** on the fixed branch: `check:ci` and `lint:ci` pass; 2820 core, 1413 builder and 247 Query tests; the
    builder's engine group 746 of 750, the 4 failures the direct-connection "setup SQL fails" cases that time out on
    the local engine, as before. In the browser (evidence `demo/`): the rehearsal 57 of 57, Difference 12 of 12,
    Extend 13 of 13.
- **M6.12** (2026-10-10). The demo video, `legend-cube-m6-difference-extend.webm` (3 min, sent to the user), recorded
  by `demo/demo-m6.mjs` in the evidence folder from two cubes in `demo/m6-specs/`, against the dev server on :9002 and
  the local engine, 23 checks passing. (1) Compare Column Values: each employee's total freight and orders by Speedy
  Express against United Package (two Groups by EMPLOYEE_ID), the palette, the key pair, the checklist's reasons (a
  join column; not a number), the 9 rows, then the differences, Float and Integer. (2) Extend Columns: the editor, the
  `->toOne()` error underlined with its hint, the panel kept open on unvalidated code, a column using the one before,
  F10, the rows, a plan H2 refuses on its row, Show Pure. (3) M6.11's fix: a second Extend over `city`
  (`SHIP_CITY->toOne()`) types `toUpper()`; dropping `->toOne()` above types it again and shows the engine's refusal,
  Execute waiting; adding it below runs again. Each of the 17 key frames was checked against its caption; two were
  changed (a scroll that hid EMPLOYEE_ID, and a caption that claimed the error named `->toOne()`).
- **M6.13** (2026-10-10). PLAN §11.7's supersessions folded into the sections they change, by hand: D5 (Difference's
  native types); §4 (no `exclude` set); §4.11 and Appendix A §16 (M6's messages); §5.7 (Extend typed over the cube's
  model as a chain, its signature and digest, nullable columns, the enumeration gap); §5.8 (the lambda JSON and the
  saved Extend); §8.8 (the Join row's FULL on 19 types, the Difference and Extend rows, the expression notes); §10.3
  (both saved shapes); §11.3's M6 row; Appendix A §7.12, §7.14, §9 and §17.6. §11.7's own text now says what was
  built (the chain typing, the saved typing, `lambdaJson`, row-key source ids, Difference's check order and labels, no
  completion, the M6.4 values ✅, FULL native on 19) and keeps its Supersessions list as the record. M6 is complete;
  marking #5662 ready, and merging it into `cube-dev`, are the user's.
