# Legend Cube — Progress Log

> **What this file is:** the "where are we" ledger for Legend Cube.
> [PLAN.md](PLAN.md) is the stable plan (what and why). This file tracks status, the last session, the next action
> and open items, so any new chat can pick up the work cold.
>
> **Upkeep:** update it at the end of every working session and whenever a milestone step lands, and commit it with
> that work. Git history on the branch is the detailed log; this file is the summary.

## How to resume in a new chat

Paste this as the first message:

> We're building Legend Cube in legend-studio on branch `cubeV1`. Read `PLAN.md` and `PROGRESS.md` at the repo root
> first. The spec is `docs/design/WIP-CUBE-SPEC.md` (read sections on demand, not all of it). My local legend-engine
> runs from IntelliJ on localhost:6300. Then do the "Next action" from PROGRESS.md, and update PROGRESS.md when you
> finish.

Claude's memory also points to both files, so a new chat in this repo finds them on its own.

## Current state (2026-10-05)

| Item        | State                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch      | `cubeV1`, rebased on master `0665e6f4c` (the spec landed there as `docs/design/WIP-CUBE-SPEC.md`, #5589)                                                                                                                                                        |
| Plan        | `PLAN.md`, **approved** by the user on 2026-10-05, with its departures from the spec's guidance sections (Appendix A)                                                                                                                                           |
| Code        | **M1.0–M1.3 done** (scaffolding; types and values; graph and inference; join), committed on `cubeV1`, not pushed. In progress: **M1.4**                                                                                                                         |
| Decisions   | PLAN.md §0, D1–D12. D7 is final: route `/cube` in Legend Query (URL `/query/cube`); packages `@finos/legend-cube` (host-free core) and `@finos/legend-cube-builder` (UI + adapter); `legend-application-query` depends on them, `legend-query-builder` does not |
| Plan review | Done 2026-10-05: 4 reviewers, 31 findings. All verified and folded into PLAN.md except one partial rejection (see Session log)                                                                                                                                  |

## Milestone checklist

See PLAN.md §11 for the deliverables and "done when" of each step.

- [x] **M1.0** Scaffolding: `legend-cube` + `legend-cube-builder` packages, purity guard, `/cube` route (always mounted, no flag: D11)
- [x] **M1.1** Types and values (precise primitive registry, compatibility, literal validation)
- [x] **M1.2** Graph and inference (invariants + acyclicity, operations, sentinels, node registry, relational source, Unknown)
- [x] **M1.3** Join (validation, duplicate rule, §7.11 order, nullability and merged-key rules, FULL OUTER)
- [ ] **M1.4** Filter (tree, operators by family, value validation, builder helpers)
- [ ] **M1.5** IR and emitter (join algorithm, filter emission, typed literals, origins, debug printer)
- [ ] **M1.6** Saved spec v1 codec (round trip, rest preservation, Unknown passthrough)
- [ ] **M1.7** Thin end-to-end headless: `v1/` serializer, relation-type adapter, engine port, Cube Northwind fixture, engine-roundtrip acceptance (part A)
- [ ] **M1.8a** Editor state and page without canvas (picker, grid with execute/stale/limit, Show Pure, export/import spec, undo)
- [ ] **M1.8b** Canvas and editors (canvas, palette, DnD, Join/Filter/Source panels, shortcuts)
- [ ] **M1.9** Slice acceptance (part B, manual) and hardening
- [ ] **M2.0** legend-graph types (D12): fix legend-graph's precise primitives (own PR), then rebase `CubeType` on legend-graph's `GenericType`. Before M3
- [ ] M2 Rename + Join autofix + simple unary transforms
- [ ] M3 Entry points, sources modal, depot catalog (user to design entry points and the sources modal first)
- [ ] M4 Group, Concat · M5 Partition (windows) · M6 Extend, Difference · M7 Grid and presentation
- [ ] M8 Persistence (engine Cube store) · M9 More sources (services → functions → data products → ingest)

## Next action

Finish **M1.3, Join**. The code and 543 core tests are committed; `check:ci`, package lint and `tsc` are green.

- The verification workflow (`m13-verify`, run `wf_b3831658-543`) was stopped part-way when the usage limit was
  reached. Resume it with `Workflow({scriptPath: <session>/workflows/scripts/m13-verify-wf_b3831658-543.js,
resumeFromRunId: 'wf_b3831658-543'})` (args: `checklist_file` = the scratchpad `m13-checklist.json`, `total` 92),
  or re-run it. Rebuild `packages/legend-cube/lib` first. Fix what it confirms, then run `yarn lint:ci`.
- Decisions to confirm with the user are in PLAN.md §4.7, "Settled in M1.3" (swap also swaps the key columns;
  both columns of a pair checked; blank names).
- Then report M1.3 and wait for the go-ahead on **M1.4, Filter**.

## Open items

| Item                                              | Owner | Notes                                                                                                                                                                                                                                             |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning evidence                                 | –     | Copied to `/Users/mauriciouyaguari/Goldman Sachs/legend-cube-evidence/` (outside both repos, not committed); see its `README.md`. Reports in `wf/`, harnesses runnable from there (paths rewritten). M1.7 and M5 reuse the fixtures and harnesses |
| Entry points and the sources modal (D7 follow-up) | User  | Designed before M3                                                                                                                                                                                                                                |
| Lazy-load the Cube page (M1.8a)                   | –     | Query imports the Cube page statically, so from M1.8 the canvas stack would sit in Query's main bundle, even for users who never open the page. Consider `React.lazy` for the route                                                               |
| legend-graph precise-primitive fix (M2.0, D12)    | –     | Can start any time as its own PR to master, in parallel with the slice. Until M2.0, keep the type seam narrow (PLAN.md §4.1)                                                                                                                      |
| Push and PR                                       | User  | `cubeV1` is local only. Push and open a PR when the user asks                                                                                                                                                                                     |
| Upstream defects (PLAN.md Appendix B)             | –     | Non-blocking (D8); write up as separate studio PRs and engine issues when convenient                                                                                                                                                              |

## Environment (local)

- **Engine:** legend-engine checkout (sibling folder), run from IntelliJ (`org.finos.legend.engine.server.Server`, no
  arguments, so `userTestConfig.json`).
  - Port 6300, anonymous auth. CORS allows the Query dev origin.
  - **No Mongo**, so the engine's query stores don't work locally.
  - Its depot setting points at `127.0.0.1:6200`, but nothing runs there.
  - Check with `curl -s localhost:6300/api/server/v1/info`; planning used commit `93d92b4`.
- **Legend Query dev:** `yarn dev:ts` plus `yarn dev:query` → `http://localhost:9001/query/`. The Cube page is at
  `http://localhost:9001/query/cube`.
  - Run `yarn build` at least once first: `dev:ts` doesn't build the stylesheets (`lib/index.css`) that the Query
    bundle imports.
- **Northwind:** the engine loads it into H2 through `call loadNorthwindData()` in the connection's
  `testDataSetupSqls`. The shared grammar is
  `packages/legend-manual-tests/src/__tests__/query-builder/model/Northwind.pure`. Cube will ship its own corrected
  fixture (PLAN.md §6.2.4).
- **Engine-backed tests:** name them `*.engine-roundtrip-test.ts`. They use axios against `http://localhost:6300/api`,
  because `fetch` is blocked in Jest.

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
  drop type parameters, and its batch wrapper reads `results`, so it throws (§5.1, §8.7).
- The core (`@finos/legend-cube`) is host-free: relative imports and plain ECMAScript only, so no `console`,
  `setTimeout`, `structuredClone` or `URL` either. ESLint, `yarn build` and a unit test enforce it (§3.3).
- Window extend followed by a filter gives wrong rows, and some dialects silently drop the filter. Isolate window
  nodes with `let` (§8.6, from M5).

## Session log

- **2026-10-05.**
  - Investigated legend-studio and legend-engine against the live engine (33-agent workflow plus follow-ups).
  - Wrote PLAN.md; the user answered D1–D8 and approved it.
  - Rebased onto master (spec landed as `WIP-CUBE-SPEC.md`).
  - Committed PLAN.md (`baeab7d0a`).
  - Verified the two remaining plan inferences live (`toOne()` NULL semantics; FULL merged-key typing) and updated
    PLAN.md.
  - Added this file.
  - Copied the planning evidence to `legend-cube-evidence/` (outside the repos) with a README; smoke-tested the
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
  - The three M1.3 choices in PLAN §4.7 (swap swaps key columns; both columns of a pair checked; blank names) still
    await the user's OK.
