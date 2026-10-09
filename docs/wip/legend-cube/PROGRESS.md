# Legend Cube — Progress Log

> **What this file is:** the "where are we" ledger for Legend Cube.
> [PLAN.md](PLAN.md) is the stable plan (what and why). This file tracks status, the last session, the next action
> and open items, so anyone can pick up the work cold.
>
> **Upkeep:** update it at the end of every working session and whenever a milestone step lands, and commit it with
> that work. Git history on the branch is the detailed log; this file is the summary.

## Current state (2026-10-09)

| Item        | State                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch      | Work goes to finos master through one PR per milestone or source, each from its own branch of the fork. Open: ingest data sets on `cube-ingest` (finos/legend-studio#5654); Depot databases on `cube-depot`                                                     |
| Plan        | `PLAN.md`, **approved** by the user on 2026-10-05, with its departures from the spec's guidance sections (Appendix A)                                                                                                                                           |
| Code        | **On master:** M1 (#5591, #5634), M2 (#5644), the direct connection and data products (#5641, #5652), M4 Group and Concat (#5649), a CSV as a DuckDB table (#5656). **In progress:** ingest data sets (#5654), Depot databases (requirements)                   |
| Decisions   | PLAN.md §0, D1–D13. D7 is final: route `/cube` in Legend Query (URL `/query/cube`); packages `@finos/legend-cube` (host-free core) and `@finos/legend-cube-builder` (UI + adapter); `legend-application-query` depends on them, `legend-query-builder` does not |
| Plan review | Done 2026-10-05: 4 reviewers, 31 findings. All verified and folded into PLAN.md except one partial rejection (see Session log)                                                                                                                                  |

## Milestone checklist

See PLAN.md §11 for the deliverables and "done when" of each step.

- [x] **M1.0** Scaffolding: `legend-cube` + `legend-cube-builder` packages, purity guard, `/cube` route (always mounted, no flag: D11)
- [x] **M1.1** Types and values (precise primitive registry, compatibility, literal validation)
- [x] **M1.2** Graph and inference (invariants + acyclicity, operations, sentinels, node registry, relational source, Unknown)
- [x] **M1.3** Join (validation, duplicate rule, §7.11 order, nullability and merged-key rules, FULL OUTER)
- [x] **M1.4** Filter (tree, operators by family, value validation, builder helpers)
- [x] **M1.5** IR and emitter (join algorithm, filter emission, typed literals, origins, debug printer)
- [x] **M1.6** Saved spec v1 codec (round trip, rest preservation, Unknown passthrough)
- [x] **M1.7** Thin end-to-end headless: `v1/` serializer, relation-type adapter, engine port, Cube Northwind fixture, engine-roundtrip acceptance (part A)
- [x] **M1.8a** Editor state and page without canvas (picker, grid with execute/stale/limit, Show Pure, export/import spec, undo)
- [x] **M1.8b** Canvas and editors (canvas, palette, DnD, Join/Filter/Source panels, shortcuts)
- [x] **M1.9** Slice acceptance (part B, manual) and hardening (accepted and signed off 2026-10-08; merged as #5634, `3260216a6`)
- [ ] **M2.0** legend-graph types (D12): fix legend-graph's precise primitives (own PR), then rebase `CubeType` on legend-graph's `GenericType`. No longer gates the sources (PLAN §6.8)
- [x] M2 Rename + Join autofix + simple unary transforms (merged as #5644, `0335b3f5f`)
- [ ] M3 Sources: the direct connection first (H2 and DuckDB; PLAN §6.8), then data products, then Depot databases; entry points and the sources modal
  - The direct connection (H2 and DuckDB) and a thin end-to-end data product slice (beta) merged on 2026-10-09 as
    #5641 (`e01552380`), so data products can be tested inside an internal deployment. The data product follow-ups
    (PLAN §6.8) merged the same day as #5652 (`4f5aab13d`).
  - Left for these two sources: Part B2 (PLAN §11.2), the manual check of both, run by the user in an internal
    deployment, with Query's two optional data product keys set (hosting.md); the mock-backed data product tests
    (DP22), which wait for the local lakehouse, marketplace and depot mocks; and the data product half of the demo
    video (the direct connection's half was recorded on 2026-10-09; the data product tab needs the mocks or an internal
    deployment).
  - A CSV pasted or chosen in the Database connection tab becomes a DuckDB table of the setup SQL (user, 2026-10-09):
    merged as #5656 (`5e424277b`).
  - Ingest data sets (PLAN §6.7; user, 2026-10-09: before Depot databases) on `cube-ingest`, finos/legend-studio#5654,
    with master merged in (`8b235e495`): build steps IN1–IN11 done (the `#I` accessor, the source and its kinds rule,
    the `cubeIngest` model and runs, the ingest catalog, Query's `lakehouse.platformUrl`, the Ingest tab and palette
    item, the data set's panel with its warehouse, the engine stand-ins, the docs). Left after the PR (user,
    2026-10-09): skeptic verification and the demo video, then Part B2's ingest steps in an internal deployment. Later:
    reading a definition from Depot at its deployed version (the SDLC pointer), and producers' user-id environments.
  - Next: Depot databases (PLAN §6.3, §6.8; their requirements are answered: released versions only, no dependency
    Databases), starting with the local mock depot.
- [x] M4 Group, Concat (merged as #5649, `d847e6721`)
- [ ] M5 Partition (windows) · M6 Extend, Difference · M7 Grid and presentation
- [ ] M8 Persistence (engine Cube store) · M9 More sources (services → functions; data products and ingest moved to M3)

## Next action

**PR #5591 merged** on 2026-10-08, squashed as `fbde4379f` on master, after Yasirmod17 approved it (on `b1c73b640`)
and all 21 CI checks passed, including the `engine-roundtrip` group on CI's docker engine (engine commit
`00108b70638b`, 279 tests). The M1.9 commits were then rebased onto it (`git rebase --onto origin/master b1c73b640
cubeV1`, no conflicts; the old tip is kept as `cubeV1-before-m19-rebase`).

**M1.9 (slice acceptance and hardening) has started** (2026-10-08). Requirements: `m19-requirements` (5 readers, a
merge, a critic and a finalize step), 108 items, a 21-step build order and 13 decisions; the full result is kept in
the local evidence folder. The user's decisions are in PLAN §11.1 "Settled at the start of
M1.9": M1.9 lands as a follow-up PR after #5591 merges (nothing more is pushed to #5591); an agent rehearsal of Part
B, then the user runs it by hand; no e2e; short READMEs with how-to guides in `docs/`; the `V1_*` imports of the
engine-backed tests are allowed.

M1.9 build order (requirements B1–B19, without the e2e and the optional steps; hashes after the rebase):

1. ✅ Docs drift and ISSUES upkeep; the `V1_*` test exception (`298a8fc2a`, `db8c98c68`).
2. ✅ PLAN §11.2 rewritten so a person can follow Part B (`4ca34e4f1`).
3. ✅ Small code fixes, the two picker test gaps (`b50ad35fe`, `14937744b`). The builder's unused exports were dropped
   (`1e2a80461`), then restored (`0c636d4cc`): 0.0.2 was released with them before the follow-up PR (user,
   2026-10-08).
4. ✅ The READMEs and their `docs/` guides, the draft marker, the docs trim (`65d889fe1`, `8b1cf95b8`, `67ccce323`).
5. ✅ Rehearsal in a browser: it found that a height-only change (the splitter above the grid) didn't refit the
   canvas, fixed in `afd32717f`; every other check passed. ✅ Skeptic verification `m19-verify` (4 reviewers, a skeptic
   per finding): 38 findings kept, 2 refuted, mostly docs; fixed in `92afa6f9f` (a picker test re-picked the model
   in a way no browser can) and the docs commits after it. ✅ Final gates on the rebased branch (2026-10-08):
   `check:ci` and `lint:ci` green; 1419 core, 538 builder (core group), 236 Query and 63 builder engine-roundtrip
   tests; the changeset `legend-cube-slice-acceptance` (both packages, patch: neither had been released on
   2026-10-08, so the dropped exports broke nobody; recheck npm before the PR). The rehearsal passed again on the rebased head. **Acceptance head:** `92afa6f9f`,
   the last commit that changes code or tests.
6. ✅ **Part B acceptance, 2026-10-08:** the user ran all of PLAN §11.2 Part B by hand and reported that it passed,
   on `cubeV1` at `4064209a6` (code and tests as at the acceptance head `92afa6f9f`), in Chrome, against the local
   IntelliJ engine (commit `93d92b4`); docker CORS waived. **M1 review sign-off** (PLAN §11.1): the finos approval of
   #5591 (Yasirmod17, 2026-10-08) and the user's OK on 2026-10-08. The follow-up PR, #5634, merged on 2026-10-08 as
   `3260216a6`.

**In parallel:** M1.9 merged on 2026-10-08 as #5634 (`3260216a6`). M2, the simple unary operations, merged on
2026-10-09 as #5644 (`0335b3f5f`), with its record in [PROGRESS-M2.md](PROGRESS-M2.md) and its decisions in PLAN §11.4.
M4, Group and Concat, merged on 2026-10-09 as #5649 (`d847e6721`), with its record in [PROGRESS-M4.md](PROGRESS-M4.md)
and its decisions in PLAN §11.5; each operation follows the editor contract in PLAN §7.4. Direct connections and data
products' access points merged on 2026-10-09 as #5641 (`e01552380`). Also planned: test setup and a DuckDB WASM study
(low priority, research first: PLAN §12.2 item 9). The next sources (databases from Depot and direct connections,
deployed data products) and their local test setup are being designed with the user: settled parts in PLAN §6.8, open
ones in §12.2 item 10, UI questions for the original app in [QUESTIONS.md](QUESTIONS.md). Decimal precision stays for a
later PR (user, 2026-10-07).

## Milestone notes

**M1.7 (thin end-to-end, headless) is done** (2026-10-07). Build: `d653123e5` to `192346e79` (see their messages),
then the verify fixes in the commit after `8df31aaa3`. 1595 Cube tests green with :6300 up; `check:ci` and
`lint:ci` green, and both Cube packages lint clean without the ESLint cache.

- Verification `m17-verify`: 33 real issues out of 56 (23 refuted), kept in the local evidence folder. Fixed:
  lint (2 redundant assertions), column-spec values unstamped
  (errors in them landed on the wrong node), batch results read through `Object.prototype` (a node id like
  `__proto__`). The rest were test gaps, now covered: per-key typing failures, abort, every unsupported model kind,
  lossless request bodies, a deterministic duration, error placement on the stamped node (A.9 typed under another
  key, plus a stale join key captured downstream), PARSER errors, the outline's flags one by one and near-miss
  runtimes, Decimal/Number/Float result values, the engine commit logged by Part A. Fix run `m17-fixes`: each new
  test was shown to fail on the mutant
  its finding named.
- **Deferred by the user** until after the main end-to-end: decimal-literal precision (still deferred, ISSUES.md).
  Show Pure printing numbers as 0 was fixed later (`dcaf0efdb`).

**M1.8 (editor state, page, picker, grid; then canvas and editors) has started.** Requirements: `m18-requirements`,
164 items, a 21-step build order (S1–S12 are M1.8a, S13–S21 M1.8b), 13 plan statements
that no longer match the code, 19 core/builder gaps and 24 open questions; the full result
is kept in the local evidence folder. The first five steps are the **demo cut**: the user can open
`/query/cube`, pick Northwind, a runtime and tables, execute and see the engine's rows. **Demo cut built (2026-10-07):** `2115cedfa` S1 host contract and test
harness (plus the core's `getRelationalDisplayName` export); `be16ae26d` S2 editor and execution state (with an
engine test: ORDERS gives 830 rows); `30f4366dc` S3 page shell and the Legend Query host, lazy-loaded at
`/query/cube`; `8bd4b7c0a` S4 source picker; `97e9fa4c2` S5 results grid and execution. `check:ci`, `lint:ci` and
1905 tests (core, builder, Query) green. Checked in the browser against :6300: the outline, the batch typing call
(compressed body, CORS from :9001) and execute (830 rows in about 0.6 s; truncation at limit 10) all work.
Verification `m18-democut-verify`:
74 real out of 86 (6 bugs, 3 unmet requirements, 61 test gaps). The bugs and requirements are fixed in `c5bce0d81`:
a run's error now belongs to its query (an edit clears it; a run that fails after an edit shows nothing), closing
the picker drops a pending Add, a cube with a model but no runtime keeps the picked runtime, the grid checks column
names as well as the count, long one-line errors keep Details, duplicate error keys, loading bars beside the pending
labels, and Show SQL. The missing tests are committed in `0e535c4e1` (run `m18-democut-tests`,
the evidence folder's `m18-democut-tests-result.json`; 329 builder, 1404 core, 248 Query and 271 engine-roundtrip tests
green; `check:ci` and `lint:ci` green). Coverage, honestly:

- Query, editor, state and picker tests were each mutation-checked by an independent verifier. Its follow-ups were
  done by hand: the Query host test now also checks the client name, the state repair added the outline-by-reference
  and replaced-capture-node tests, and a grid test pins the run's headers on stale rows (the `R53liveHeaders` mutant).
- The grid tests were not independently verified, and a few minor mutants survive; both are tracked in
  [ISSUES.md](ISSUES.md).

**M1.8a S6–S12 built (2026-10-07):**

- `70bbcced1` S6 Undo. A restored query is a new object; undoing a change that left the query alone keeps it (PLAN
  §7.8).
- `447b4cdd9` S7 Export/Import spec (dev). A newer-version spec opens read-only; Select still works there (PLAN §7.8).
- `06bce5cfa` + `c76547830` S8 re-checking tables after an import: drift warnings, saved columns kept on failure,
  invalid filter values read again. The core gained `diffSchemas`, `rereadFilterValues` and
  `rereadQueryFilterValues`.
- `dcaf0efdb` the Show Pure "numbers as 0" fix; `b38027872` S9 Show Pure.
- `7915d5dce` S10 paste a Pure model. S11 telemetry: none, by decision.
- `497fd3241` S12 changeset text.

Checks: 1416 core, 382 builder, 248 Query and 271 engine-roundtrip tests; `check:ci` and `lint:ci` green. Part B, the
M1.8a part, passed by hand on :9001 + :6300: pick Northwind and StoreRuntime, add ORDERS and CUSTOMERS, Execute (830
rows), Select (stale), Undo, Show Pure (real literals, e.g. `->limit(1001)`), Export, reload, Import, Execute: the
same 830 rows. F9 came with M1.8b's shortcuts (S20, PLAN §3.5). Importing the slice spec and executing gives the 19 rows.

**M1.8a verified (2026-10-07).** Verification `m18a-verify` (evidence
`m18a-verify-result.json`): 39 real out of 45 (12 bugs, 27 test gaps).

- `8b8b632cd` core: chained Filters are re-read until nothing changes.
- `69cf8e6be` builder and docs:
  - re-checking applies by node identity to the cube shown and to undo snapshots, so Undo never brings back an
    unchecked table, and "resolving source" shows only while the cube shown has a table being typed;
  - the picker's paste box shows only for the model it loaded;
  - file reads: a too-large file ends a pending read, and read errors are worded;
  - three doc fixes.
- `1fd25a532` the missing tests (run `m18a-tests`, evidence `m18a-tests-result.json`), each checked
  against its mutant by an independent verifier.

1419 core, 430 builder, 248 Query and 271 engine-roundtrip tests; `check:ci` and `lint:ci` green.

**Rebased on finos master `a32e5c0fb` (2026-10-07)**, with no conflicts; the backup branch `cubeV1-before-rebase` holds the old tip.
finos master reverted the security dependency update, so the builder keeps axios 1.16.0. Commit hashes in these docs refer to the `cubeV1` branch history on the fork; master gets the PR squashed. `check:ci`, `lint:ci` and the
engine-roundtrip group (279) are green, and the whole `yarn test` passes except two suites that fail only locally:

- legend-dev-utils `TypescriptConfigUtils.test.js` runs `tsc -p` on an unquoted path, which breaks on this machine's
  folder name with a space;
- legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts`: the local engine (93d92b4) writes empty arrays that
  Studio's serializer leaves out. CI runs it on its own engine image.

**M1.8b (canvas and editors) is done and verified** (2026-10-08), on `cubeV1` itself, so PR
finos/legend-studio#5591 carries it (user, 2026-10-07: it is on the critical path for the parallel work).

- **Settled at the start of M1.8b** (user, 2026-10-07, all on the recommendation): PLAN §7.8. Two answers were
  narrowed or extended in the build, both in PLAN: a panel without edits follows its node (§7.4), and blank
  conditions or key pairs are dropped wherever they are (§7.5, §7.6).
- **Build:** `3c10563d0` S13 layout and dependencies; `42c881997` S14 canvas; `77baa9359` S15 palette and drag and
  drop; `aea4fc469` S16 context menu; `fc572b42d` S17 editor panel, Source panel and the editor contract (PLAN §7.4);
  `ae0839618` S18 Join editor and the outline's untyped columns; `4604a6b56` S19 Filter editor; `1b6acdfda` S20
  shortcuts (Query's core plugin contributes them); `0682fdf9e` changeset text.
- **Verification** `m18b-verify` (evidence `m18b-verify-result.json`): 5 reviewers, 43
  distinct findings, 40 confirmed (16 bugs, 3 unmet requirements, 14 test gaps, 7 docs), 3 refuted. Fixed in
  `b717c4f00` (state: re-check against undo snapshots, refresh of a failing table, warnings across Import, Undo over
  Import, draft no-ops, the 'type unknown' lookup) and `9dfcfc306` (UI and tests), docs in the commit after.
- **Dry run of Part B** on :9001 + :6300 (2026-10-08): all eight steps pass, with real drags (palette to canvas,
  handle to handle), F9 giving 19 rows, Cmd+Z, Show Pure, and Export, reload, Import, F9 giving the same 19 rows.
  It found what jsdom can't: the canvas fitted before React Flow measured new nodes, the Filter row squeezed its value,
  the graph header overflowed beside the panel, the minimap covered nodes, and Chrome's date input gives React no
  Enter (`03e095655`). On macOS, Ctrl-click is the system's right-click, so the capture node is set with Cmd-click
  (PLAN §11.2 step 6). xyflow's CSS loads only with the Cube page; the lineage viewer itself needs a depot query, so
  it wasn't seen.
- **Checks:** 1419 core, 596 builder, 236 Query and 279 engine-roundtrip tests; `check:ci` and `lint:ci` green.

**Pushed** to the PR on 2026-10-08 (head `b1c73b640`). While an incident on legend-studio's side held the merge,
work continued on `cubeV1` (user, 2026-10-08); the PR merged later that day.

**Demo video** (2026-10-08, for the PR): a Playwright script runs Part B against :9001 and :6300 and records it,
checking 19 rows after both runs. The video and the script are in the evidence folder's `demo/`
(`node cube-demo.mjs <outDir>`). No e2e is planned (PLAN §11.1), so it stays outside the repo. Two things it showed: Undo back to the
executed query leaves the rows marked stale (as §7.8 says: a restored query is a new object), and opening the editor
panel logs React 19's `element.ref` warning from `react-reflex` (legend-art's resizable panels), not from Cube.

- **The user settled every M1.8a question on 2026-10-07**, all on the recommendation; recorded in PLAN §7.8
  "Settled before M1.8" (with the plan statements that no longer matched the code corrected in §3.5, §4.3, §6.2.7,
  §7.2, §7.8, §8.7, §11.1 and §11.2).
- **Settled at the start of M1.8b:** see PLAN §7.8.

## Merge plan (decided by the user, 2026-10-07)

The user wants a first merge so that new sources and new operations can be built in parallel. PLAN §0 D13.

- **Cut: after M1.8a** (S6–S12), then M1.8b joined the same PR before it merged (user, 2026-10-07). The Show Pure
  "numbers as 0" bug, which S9 made visible, is fixed (`dcaf0efdb`).
  `/query/cube` has no flag (D11), so the page ships in Query when this merges.
- **One PR** for the whole branch; the commit history guides the review.
- **Docs:** PLAN.md and PROGRESS.md moved to `docs/wip/legend-cube/` (2026-10-07), with ISSUES.md beside them to
  track the known issues for later PRs. LEGEND-GRAPH-ISSUES.md is not included: it moved to the local evidence
  folder.
- **Workflows:** S6 onward uses workflows as before (requirements, build, skeptic verification).
- **Parallel work after the merge.**
  - Operations can be built headless: a node class, an emitter, a codec and a `NodeRegistry` entry, plus engine
    tests. `v1/` needs no change while an operation emits only the IR and literal kinds `V1_CubeLambdaSerializer`
    already handles; a new IR or literal kind needs its own case there.
  - An operation's editor follows the editor contract in PLAN §7.4 (a draft, an editor, help text, an icon; a
    registry test checks each type has them).
  - New sources: the design is under way with the user (PLAN §6.8); M2.0 no longer gates them (user, 2026-10-08).

## Open items

| Item                                              | Owner | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning evidence                                 | –     | Kept in a local folder outside both repos (not committed), indexed by its `README.md`: investigation reports, runnable harnesses, workflow results. M1.7 and M5 reuse its fixtures and harnesses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Entry points and the sources modal (D7 follow-up) | User  | Designed before M3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| legend-graph precise-primitive fix (M2.0, D12)    | User  | Can start any time as its own PR to master, in parallel with the slice. Until M2.0, keep the type seam narrow (PLAN.md §4.1). The verified issue list for a separate session is kept outside the repo, in the local evidence folder (by the user's choice, 2026-10-07)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **To revisit: type tables locally** (2026-10-06)  | User  | The user wants Cube to stop asking the engine for every table's relation type: read the `Database` definition through legend-graph and build the column types from it, and later do the same for data products and ingest. This needs the legend-graph fixes above, and the core depending on legend-graph earlier than D12/M2.0 planned (it breaks the host-free rule, D10 and PLAN §3.3). It changes M1.7's schema resolution (PLAN §6.2.6, which uses the engine's batch endpoint). **Decided 2026-10-06 (user): M1.7 types tables with the engine behind `resolveSchemas` and records the engine's types for every fixture table as a parity test; the local typer replaces that method after the legend-graph fixes (PLAN §6.2.6).** Constraint to keep: local types must match the engine's compiler mapping exactly (a conformance test against the engine), or emitted queries and the grid will disagree. User direction (2026-10-06): data products are typed from their generated artifact (cached relation types), not their definition; Cube sends V1 protocol lambdas, not legend-graph's built (metamodel) lambdas |
| Known issues                                      | –     | Bugs, test gaps and risks to fix in later PRs: [ISSUES.md](ISSUES.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Push and PR                                       | User  | First PR (#5591) opened 2026-10-07 from the fork MauricioUyaguari/legend-studio `cubeV1` to finos/legend-studio master. Approved by Yasirmod17 on 2026-10-08 on `b1c73b640`, all 21 CI checks green (`engine-roundtrip` included); merged 2026-10-08 as `fbde4379f`. M1.9 goes in a follow-up PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Upstream defects (PLAN.md Appendix B)             | –     | Non-blocking (D8); write up as separate studio PRs and engine issues when convenient                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Key facts a cold start must not miss

Each is verified and detailed in PLAN.md.

- Execution is a relation-function chain built as **protocol JSON**, never Pure text: there are precedence traps, and
  dotted names are mangled (§8.3).
- A relation join rejects any shared column name. The emitter renames to temporary names and finishes with a `select`
  in §7.11 order (§8.4).
- SQL NULL semantics for joins: `->toOne()` on the left key when both keys are nullable. Verified for INNER, LEFT,
  RIGHT and FULL, and on Postgres, Snowflake and SQL Server plans (§8.4).
- The FULL OUTER merged key needs a `cast(@<common ancestor>)` when the key types differ; parameterized types fail to
  compile without it (§4.7, §8.4).
- The engine **does not type-check** `==`, `in` or join keys, and **lies about nullability** after outer joins and
  aggregates. Cube validates and infers both itself (§5.4–5.6, §4.7).
- Take schemas from `lambdaRelationType` (and its `/batch` form, whose response field is `result`). Studio's wrappers
  drop type parameters (§5.1, §8.7); the batch wrapper also read `results` and threw, until #5593.
- The core (`@finos/legend-cube`) is host-free: relative imports and plain ECMAScript only, so no `console`,
  `setTimeout`, `structuredClone` or `URL` either. ESLint, `yarn build` and a unit test enforce it (§3.3).
- Window extend followed by a filter gives wrong rows, and some dialects silently drop the filter. Isolate window
  nodes with `let` (§8.6, from M5).

## Session log

- **2026-10-05.**
  - Investigated legend-studio and legend-engine against the live engine (33-agent workflow plus follow-ups).
  - Wrote PLAN.md; the user answered D1–D8 and approved it.
  - Rebased onto master (spec landed as `WIP-CUBE-SPEC.md`).
  - Committed PLAN.md (`50bfa4fe0`).
  - Verified the two remaining plan inferences live (`toOne()` NULL semantics; FULL merged-key typing) and updated
    PLAN.md.
  - Added this file.
  - Copied the planning evidence to a local folder outside the repos with a README; smoke-tested the
    harnesses from there.
  - Plan review (4 reviewers, 31 findings). Verified the high-severity ones live, then folded them into PLAN.md.
    Main changes:
    - lint-compliant builder layout (port in `graph-manager/`, factory outside `v1/`);
    - FULL merged key nullable if either key is nullable;
    - Not over a group pushed to the leaves for D4;
    - `genericType` IR node for casts;
    - quoted table names keep their quotes;
    - REAL-column equality caveat;
    - specified ALLTYPES rows;
    - discriminating RIGHT/FULL acceptance cases and order-insensitive asserts;
    - Unknown node per-instance ports;
    - Execute gated on the capture subtree;
    - value pipeline keeps invalid text and canonicalizes numbers;
    - engine-test wiring;
    - M1.8 split into M1.8a and M1.8b.
  - **Partially rejected:** blocking joins on `OTHER`-typed columns. They are flagged "type unknown" with an inline
    warning instead, because the failure is a loud engine error, not silent wrong data, and v1 has no cast to work
    around a block.
- **2026-10-05, M1.0.**
  - The user accepted the departures from the spec's guidance sections (§14.4, §17.7, §17.11) and gave the go-ahead.
  - Scaffolded `@finos/legend-cube` and `@finos/legend-cube-builder` (0.0.1 each, patch changeset), with root and
    Query tsconfig references.
  - The core's host-free guard is stricter than planned; PLAN.md §3.3 describes it as built:
    - lint allows relative imports only;
    - the build compiles against the ECMAScript library with no ambient types;
    - a unit test checks module references and the compile, against bad fixtures too.
  - A probe file importing `mobx` and reading `window` was rejected by all three guards.
  - Legend Query: route `/cube`, always mounted; the bootstrap stylesheet imports the builder's CSS. M1.0 first put
    the route behind a `TEMPORARY__enableLegendCube` option; the user dropped it the same day (D11), with its config
    test and the dev-only setup changes.
  - The builder declares only what it uses (core, React, React DOM). Other dependencies, and the `@xyflow/react` CSS
    import, arrive with the step that first needs them.
- **2026-10-05, M1.1.**
  - The user dropped the `TEMPORARY__enableLegendCube` flag first (D11): `/query/cube` is always mounted.
  - Types (`packages/legend-cube/src/types/`): the registry of 24 primitives; interned `PrimitiveType` and
    `OpaqueType`, `EnumType` equal by path; `resolveCubeType` never throws (unknown paths and misfitting
    parameters become opaque); comparison classes and `areCompatibleTypes`; `getLeastCommonAncestor` (needed by
    FULL joins in M1.3); enum qualification helpers.
  - Values (`src/values/`): `LiteralValue`, `parseValue` and `checkValue`, both built on one reader, so
    canonical form, kind and range checks can't drift apart.
  - Tests: 281 in the core. One table drives `parseValue` and `checkValue` for every accepted and rejected input.
    Three mutations of the code (UBigInt range, negative zero, date compatibility) were each caught.
  - PLAN.md §5.4 and §5.6 record what M1.1 settled: StrictTime is its own comparison class; a non-finite FLOAT
    value is out of range; the abstract `Date` takes a date or a date-time; value problems are structured, and
    M1.4 adds their messages.
- **2026-10-05, M1.2.**
  - Recorded D12 (legend-graph types from M2.0; narrow type seam until then) and that date-time values accept a
    trailing `Z` or `+0000`.
  - Schema (`src/schema/`): `SchemaColumn {name, type, nullable}`, `Schema` with unique names, order-sensitive
    `equals` that ignores nullability, and `isIdenticalTo` for drift detection.
  - Graph (`src/graph/`): `QueryNode` (with `SourceNode`, `UnaryNode`, `BinaryNode`), `Connection`, and an
    immutable `Query` with the five spec invariants plus acyclicity and a port invariant, every operation with a
    total `canX` predicate, `replace`, `clone` and per-type `generateId`.
  - Inference (`src/inference/`): `buildSchemasAndValidity` with the three sentinels and the query-rule pass; the
    validation combinators.
  - Nodes (`src/nodes/`): `RelationalTableSource` with the same-database rule, `UnknownNode` with synthetic ports,
    and `NodeRegistry`/`createNodeRegistry()`. Messages (`src/messages/`): the full §16 catalogue plus Cube's
    additions, tested line for line against the spec.
  - PLAN.md §4.3–4.6 record what M1.2 settled (healing in port order, move selection, nodes that refuse new inputs,
    rule-error order, describe of failed or quoted sources).
  - Verification: a 5-agent workflow built a 168-item cited checklist; a 92-agent workflow checked it and hunted
    bugs, confirming 40 issues (37 test gaps, the `ensureSchemas` shape check, quoted names in `describe()`), all
    fixed; a 19-agent re-verification found 14 more test gaps and one weak check, all fixed. 453 core tests.
- **2026-10-05, M1.3 (in progress).**
  - `Join` (`src/nodes/transforms/Join.ts`): ports `leftTds`/`rightTds`, §7.11 steps 1–5 with the catalogue
    messages, comparison-class compatibility, the duplicate rule, §7.11 output order, nullability and merged-key
    rules per join type, FULL OUTER. Exported helpers for the emitter. Registered as "Join Another Input".
  - `QueryNode.withSwappedInputs()` hook, applied by `Query.swapInputs`: a Join's key columns follow its inputs.
  - A 4-agent workflow built a 92-item checklist (81 in scope, 11 ambiguities); the code follows its recommendations
    except two recorded choices (PLAN §4.7). 10 hand mutations, all caught. 543 core tests.
  - Verification (28 agents, resumed after the usage stop) confirmed 12 issues: one bug (key lists with holes passed
    the constructor check) and 11 test gaps (exact name matching, partially same-named duplicates, merged-key
    position for every join type, INNER nullable keys, join type kept by edits and swaps, FULL merged enum values,
    frozen right list, single-input swap stays incomplete). All fixed; each named mutant now fails a test.
  - The user confirmed the three M1.3 choices in PLAN §4.7 (swap swaps key columns; both columns of a pair
    checked; blank names).
- **2026-10-05, M1.4.**
  - Filter (`src/filter/`, `src/nodes/transforms/Filter.ts`): the 16 operators with descriptions and negation
    pairs, availability by family (StrictTime, Variant and unknown types: empty checks only), the comparison / And-Or
    group / Not tree with values that keep invalid text, validation (column, operator, shape, each value through
    `checkValue`, with the new messages), the builder helpers (normalize/unwrap at the top level, column- and
    operator-change resets, negate), descriptions with a redacted form, `describeRedacted()` on every node, and the
    registry entry "Filter by Column" before Join.
  - The user confirmed the M1.4 choices (PLAN §4.8 "Settled in M1.4").
  - Verification: a 4-agent workflow built a 152-item checklist (125 in scope); a 52-agent workflow confirmed 20
    issues: two bugs (the Filter node accepted any object with `validate`, such as a Join; a row moved between
    same-family columns kept invalid text that was valid for the new column) and 18 test gaps, all fixed. A
    22-agent re-verification found 8 more test gaps, all fixed. Repo-wide `check:ci` and `lint:ci` green. 696 core
    tests.
