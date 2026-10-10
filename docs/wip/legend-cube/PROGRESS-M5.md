# Legend Cube — M5 Progress Log

> **What this file is:** the "where are we" ledger for M5, Partition (window functions) (PLAN §11.3 and §11.6). It is
> kept apart from [PROGRESS.md](PROGRESS.md), which covers M1, and the M2 and M4 logs, so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.6 holds what M5 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-m4-followup`, PR #5653, after M4's follow-ups (user, 2026-10-09), rebased on master `5e424277b` (#5656) |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                                             |
| Step   | M5.1–M5.8 done; next M5.9                                                                                     |
| Tests  | 2752 core, 1264 builder (core group), 245 Query, 453 builder engine-roundtrip (after M5.8)                    |

## Steps

See PLAN §11.6 for each step's deliverable and when it is done.

- [x] **M5.1** The settled decisions (PLAN §11.6) and this file
- [x] **M5.2** `let` in the IR, the serializer and the printer
- [x] **M5.3** The isolation pass in `QueryEmitter`, and the adapter's engine test
- [x] **M5.4** The window functions in the aggregation model, and the messages
- [x] **M5.5** Partition in the core
- [x] **M5.6** The builder extraction (no behaviour change)
- [x] **M5.7** Partition in the builder, and registered
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

**M5.4 (2026-10-09).** `WindowRankFunction` (Rank, DenseRank, RowNumber) beside `AggregationFunction`, which is
unchanged, and an `AggregationUse` (a Group, or a window that knows whether it sorts) that the known-function check,
the auto-name and `validateColumnAggregation` take, a Group by default. The rank functions take no column, are
Integer and never empty, are named as shown (`Dense Rank`, `Row Number`) in a window and not at all in a Group, and
need a sort: checked after the function and the column, before the name. The two Cube messages. Every M4 test passes
unchanged.

**M5.5 (2026-10-09).** `Partition` in the core: the node (`validatePartitionColumn`, validation in PLAN §11.6's order,
the input's columns then one per window function, the input's row order kept, `Apply <n> Window Functions`), the
emitter (an aggregates extend, then a ranks extend, then a select only when the listed order differs; the four
`over()` forms; `size()` counts; no frame) and the codec, which reads its sorts and window functions with the
readers it now shares with Sort and Group (`readSortKeys`, `readColumnAggregations`, `ReadEntries`). The shape
guards `isColumnDirection` and `isColumnAggregation` are exported. `PARTITION_DEFINITION` (an isolation boundary)
waits for M5.7; tests use `TEST__registryWithPartition()`. Tests by workflow `m55-tests-verify` (`wf_9b00f7a3-35f`):
three writers (the node and row order, the emitter, the saved-spec suites; 211 tests), a reviewer that ran the
emitted shapes on the engine, and 103 mutants in an isolated copy: 97 killed, 4 equivalent (one was dead code, the
sort duplicates check's blank filter, now removed), and 2 decode-order mutants killed by rows added after. The review
found no bug; its two isolation shapes (a captured Sort after a Partition, a Partition of a Partition) are tested,
and its finding that the engine nests a subselect per window column, not per extend, corrected PLAN §11.6's risk.
Result: `m5-verify/m55-result.json` in the evidence folder.

**M5.6 (2026-10-09).** No behaviour change: the aggregation rows (`CubeAggregationRows.ts`, judged by an
`AggregationUse`), the sort rows (`CubeSortRows.ts`) and their row editors (`CubeAggregationRowEditor`,
`CubeSortRowEditor`, driven by callbacks), and the column checklist (`CubeColumnChecklist`) come out of the Group and
Sort drafts and editors, which now use them. Every builder test passes unchanged (1199).

**M5.7 (2026-10-09).** Partition registered after Join (`createNodeRegistry`; the test registry is gone), with
`CubePartitionDraft` and `CubePartitionEditor` (window functions, then partition columns, then sort rows, on M5.6's
shared rows), labels and notes, the help text, `SigmaIcon`, both registries, and `findColumnOrigins` through a
Partition. Tests by workflow `m57-tests-verify` (`wf_3703c964-c6a`): the draft and editor, the column origins, two
`operations.cube.json` samples (typed by the engine in `CubeSpecCorpus`), and the Partition conformance cases (every
function on ORDERS and on ALLTYPES' families, no partition, neither, ranks only, a listed order that needs the select,
after a LEFT join, after a Group, a Partition of a Partition, a Filter and a Group after one; Cube's types equal the
engine's but for Sum and Average nullability, declared). A reviewer, and 113 mutants in the isolated builder copy:
103 killed, 1 equivalent, and the 9 others killed by the tests added after (one change at a time on the draft; a
saved Rank holding an empty column; a Group's saved Rank keeping its column). The review's fixes: two notes (where
empty sort values go; a Rank's sort makes the node's aggregates run), and rows judged by the node Apply stores (a
saved blank sort key still counts as a sort until something changes). A windowed Max of an untyped column can't
exist (an OTHER column is a String, which offers no Max), so the Join warning's test uses Distinct Value, as Group's
does. Result: `m5-verify/m57-result.json`.

## Open items

- The engine issue drafts in ISSUES.md for windows (M5.10), filed by the user.
- The landing order with `cube-ingest`, based before M4, which touches the same registries (PLAN §11.6, Landing).
