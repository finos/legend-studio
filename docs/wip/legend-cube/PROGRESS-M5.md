# Legend Cube — M5 Progress Log

> **What this file is:** the "where are we" ledger for M5, Partition (window functions) (PLAN §11.3 and §11.6). It is
> kept apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2 and M4 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.6 holds what M5 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-m4-followup`, PR #5653, after M4's follow-ups (user, 2026-10-09), rebased on master `5e424277b` (#5656)   |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                                               |
| Step   | M5.1–M5.3 done; next M5.4                                                                                       |
| Tests  | 2486 core, 1198 builder (core group), 245 Query, 436 builder engine-roundtrip (after the rebase on `5e424277b`) |

## Steps

See PLAN §11.6 for each step's deliverable and when it is done.

- [x] **M5.1** The settled decisions (PLAN §11.6) and this file
- [x] **M5.2** `let` in the IR, the serializer and the printer
- [x] **M5.3** The isolation pass in `QueryEmitter`, and the adapter's engine test
- [ ] **M5.4** The window functions in the aggregation model, and the messages
- [ ] **M5.5** Partition in the core
- [ ] **M5.6** The builder extraction (no behaviour change)
- [ ] **M5.7** Partition in the builder, and registered
- [ ] **M5.8** Partition on the engine and in the browser
- [ ] **M5.9** The window composition suite
- [ ] **M5.10** Partition around the databases, and the changeset
- [ ] **M5.11** Guides and READMEs
- [ ] **M5.12** Verification and the browser rehearsal
- [ ] **M5.13** A demo video of M5's features (PLAN §11.3)
- [ ] **M5.14** Rebase on the latest master, fold PLAN §11.6's supersessions in

## Commits

Filled in as steps land.

| Step   | Commit      | Subject                                                 |
| ------ | ----------- | ------------------------------------------------------- |
| Rebase | (none)      | rebased on master `5e424277b` (#5656)                   |
| M5.1   | `9652c569a` | docs: settle Legend Cube M5 (window functions)          |
| M5.2   | (this one)  | feat: write the lets that isolate Legend Cube's windows |

## Step notes

**M5.1 (2026-10-09).** Requirements `m5-requirements` (workflow run `wf_00a3eba7-f24`, 4 agents: readers for the
Partition node, for emitting and isolating windows, and for the cross-cutting work, and a synthesizer that merged their
reports, checked their claims and re-ran 16 engine facts): 62 checklist items, a 15-step build order and 8 questions.
The full result is `m5-requirements-result.json` in the local evidence folder, with the probe outputs under
`m5-requirements/`.

- The user answered the four questions without a precedent, all on the recommendation: D5's frames (no frame setting;
  a "running / whole partition" toggle is the follow-up), Row Number beside Rank and Dense Rank, windowed Distinct
  Count and Distinct Value natively, and the original's editor order (functions, partition, order).
- The other four follow a precedent and are in PLAN §11.6's "Decided without asking": Count rows offered (M4's row
  model), the engine's error on Spanner, Presto and Composite (as M2's Spanner), no grid quick action (spec §12.4),
  and a Partition keeping its input's order (as Distinct).
- The synthesizer's 15 steps became 14: its M5.9, a grid quick action, is not built.
- The user asked for M5 to continue on `cube-m4-followup` and #5653 rather than a branch and PR of its own, as no
  reviewer is free. The branch was rebased on #5656 first (no conflicts); the gates passed on it.
- Folded in from M4.15: PLAN §8.8's Sort row and §12.2 item 2 name Group and Concat among the nodes that lose the order.

**M5.2 (2026-10-09).** The IR's `let` carries an origin (role `let`), and `letBinding` builds one; the IR's `block`
is gone, since a block is a lambda with several statements. The serializer writes `letFunction('<name>', <value>)`,
the name stamped with the let's origin as the engine's own parse places it. The engine parses `printIR`'s let form
(two window extends bound by a let, a filter on the rank, then `from()`, sort and limit) to Cube's JSON exactly.

**M5.3 (2026-10-09).** `TransformDefinition.isolationBoundary`, and the isolation pass in `QueryEmitter`: a run binds
each boundary node upstream of the capture with a let, after the lets it reads, and the run lambda becomes
`{| {| <lets>; <relation>}->from(runtime)->sort(…)->limit(n + 1)}`; without a boundary it is unchanged, and typing
lambdas never bind. Let names are `n_<id>` lowercased for a short identifier no other let has in any case, else
`n_<k>`. The requirements' "a window read by two nodes is bound once" can't happen: a node feeds only one other
(`Query.ts`, PLAN §5.1's invariant 3), so the emitter has no memo. On the engine, through the adapter, with a
test-only count window: France's 2 orders up to 10251 count 77 with the let; the single form counts 2 without it and
77 with it, so the let alone isolates the window; an id like `a-b` runs as `n_1`; the let form types as Cube infers
it and as the chain does; Show Pure shows the lets; an error inside a let lands on the window it binds.

## Open items

- The engine issue drafts in ISSUES.md for windows (M5.10), filed by the user.
- The landing order with `cube-ingest`, based before M4, which touches the same registries (PLAN §11.6, Landing).
