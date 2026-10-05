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
| Plan        | `PLAN.md`, **approved** by the user on 2026-10-05; committed                                                                                                                                                                                                    |
| Code        | **None yet.** Next milestone step: M1.0                                                                                                                                                                                                                         |
| Decisions   | PLAN.md §0, D1–D10. D7 is final: route `/cube` in Legend Query (URL `/query/cube`); packages `@finos/legend-cube` (host-free core) and `@finos/legend-cube-builder` (UI + adapter); `legend-application-query` depends on them, `legend-query-builder` does not |
| Plan review | A four-agent review of PLAN.md (evidence, requirements, semantics, repo conventions) is running; its fixes are pending (see Open items)                                                                                                                         |

## Milestone checklist

See PLAN.md §11 for the deliverables and "done when" of each step.

- [ ] **M1.0** Scaffolding: `legend-cube` + `legend-cube-builder` packages, purity guard, `/cube` route + `TEMPORARY__enableLegendCube` flag
- [ ] **M1.1** Types and values (precise primitive registry, compatibility, literal validation)
- [ ] **M1.2** Graph and inference (invariants + acyclicity, operations, sentinels, node registry, relational source, Unknown)
- [ ] **M1.3** Join (validation, duplicate rule, §7.11 order, nullability and merged-key rules, FULL OUTER)
- [ ] **M1.4** Filter (tree, operators by family, value validation, builder helpers)
- [ ] **M1.5** IR and emitter (join algorithm, filter emission, typed literals, origins, debug printer)
- [ ] **M1.6** Saved spec v1 codec (round trip, rest preservation, Unknown passthrough)
- [ ] **M1.7** Thin end-to-end headless: `v1/` serializer, relation-type adapter, engine port, Cube Northwind fixture, engine-roundtrip acceptance (part A)
- [ ] **M1.8** Canvas and editors on `/query/cube` (picker, canvas, Join/Filter/Source panels, grid, export/import spec)
- [ ] **M1.9** Slice acceptance (part B, manual) and hardening
- [ ] M2 Rename + Join autofix + simple unary transforms
- [ ] M3 Entry points, sources modal, depot catalog (user to design entry points and the sources modal first)
- [ ] M4 Group, Concat · M5 Partition (windows) · M6 Extend, Difference · M7 Grid and presentation
- [ ] M8 Persistence (engine Cube store) · M9 More sources (services → functions → data products → ingest)

## Next action

1. Triage the plan review findings and fold the valid ones into PLAN.md (in progress, 2026-10-05).
2. Start **M1.0**: scaffold the two packages per PLAN.md §3.1–3.5. Keep the PR small: build, lint, purity guard, and a
   placeholder page at `/query/cube` behind the flag.

## Open items

| Item                                              | Owner  | Notes                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan review findings                              | Claude | Run `wf_fbdcba3a-637` (resumed 2026-10-05); apply verified fixes, then commit. If this chat is gone before triage, the findings persist in `~/.claude/projects/-Users-mauriciouyaguari-Goldman-Sachs-legend-studio/f7a9ecc2-5ae2-4b59-b432-81982ee80476/subagents/workflows/wf_fbdcba3a-637/journal.jsonl` (one `"type":"result"` line per reviewer) |
| Where to keep the scratch evidence                | User   | Harnesses from planning are in a session-only scratchpad and will be lost. Proposed: copy the curated set (window regression matrix, per-dialect plan harness, precise-type fixture, relation-function tests, check scripts) to a local folder outside the repo, not committed                                                                       |
| Entry points and the sources modal (D7 follow-up) | User   | Designed before M3                                                                                                                                                                                                                                                                                                                                   |
| Upstream defects (PLAN.md Appendix B)             | –      | Non-blocking (D8); write up as separate studio PRs and engine issues when convenient                                                                                                                                                                                                                                                                 |

## Environment (local)

- **Engine:** legend-engine checkout (sibling folder), run from IntelliJ (`org.finos.legend.engine.server.Server`, no
  arguments, so `userTestConfig.json`).
  - Port 6300, anonymous auth. CORS allows the Query dev origin.
  - **No Mongo**, so the engine's query stores don't work locally.
  - Its depot setting points at `127.0.0.1:6200`, but nothing runs there.
  - Check with `curl -s localhost:6300/api/server/v1/info`; planning used commit `93d92b4`.
- **Legend Query dev:** `yarn dev:ts` plus `yarn dev:query` → `http://localhost:9001/query/`. The Cube page will be at
  `/query/cube` once the flag exists (M1.0).
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
  - Started the plan review.
  - Added this file.
