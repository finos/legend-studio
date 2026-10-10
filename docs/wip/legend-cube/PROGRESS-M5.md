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
| Step   | M5.1–M5.11 done; next M5.12                                                                                   |
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
- [x] **M5.8** Partition on the engine and in the browser
- [x] **M5.9** The window composition suite
- [x] **M5.10** Partition around the databases, and the changeset
- [x] **M5.11** Guides and READMEs
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

**M5.8 (2026-10-09).** On the engine, through Cube's emitter (`LegendCubeOperations`, "Partition on the engine"):
the ORDERS tie on 1996-07-08 (Count Rows 1, 2, 4, 4, 5, 6; a Sum of EMPLOYEE_ID 5, 11, 18, 18, 22, 25; Rank 1, 2, 3, 3,
5, 6; Dense Rank 1, 2, 3, 3, 4, 5; Row Number 3 and 4 on the tie, either way), ALFKI's running Sum 6, 10, 14, 15, 16,
19 against 19 on every row without a sort, France's 77 on each of its rows after a Filter (a `WITH` in the SQL), the
top 3 freights per country by a Filter on the Rank (10634, 10511, 10787, sorted after the window), and ALLTYPES ID 3's
empty Sum and Average, Count 0 and Count Rows 1. On H2 and DuckDB through the direct connection
(`LegendCubeDirectConnectionOperations`): a count per country after a Filter, a running count, Rank and Row Number,
and a windowed Distinct Count (`count(distinct …) over ()`, native on DuckDB) and Distinct Value, in a Partition of a
Partition. In the browser (evidence `demo/check-m58-partition.mjs`, on :9002 and :6300; 20 checks, no page problems):
Apply Window Functions last in the palette; the editor's sections in Q4's order; Rank without a sort marked on its
function until a sort row has a column; a running Sum by city; the 19 rows with every city's rank 1 and running sums
reaching each city's total; the grid's Filter by on Rank 1 giving one row per city; the let in Show Pure; the saved
spec. An error inside a let is checked on the engine (M5.3), not in the browser: Cube's validation keeps one from
being built.

**M5.9 (2026-10-09).** `CubeWindowComposition.engine-roundtrip-test.ts` (workflow `m59-m510-windows`,
`wf_197ca968-a37`): 29 Cube graphs, pairs and triples with a Partition, run on H2 through Cube's emitter and checked
against a JavaScript reference with SQL's null rules and default frame, computed from ORDERS' 830 rows, read once
(about 20 s). Each checks the query is valid, the reference's columns are Cube's schema, one let per Partition that
isn't the capture, every Partition written in the array form, and the rows (as multisets, as tie sets for Row Number,
in order where a Sort reaches the capture). They include SQL Server's and Sybase IQ's row-number forms, nullable
partition and sort columns, a negated filter on nullable columns after a window, and windowed Distinct Count and
Distinct Value over a column with empty values. The negative control writes the single form, unbound: France's two
rows count 2, not 77. On H2 a filter on the window column itself is written QUALIFY and comes out right, so the control
filters on input columns. Twelve mutations of the reference each fail the suite (a reversed tie order rightly
doesn't). A reviewer and a skeptic, who broke the core's built lib in an isolated copy, found test gaps, now closed.

**M5.10 (2026-10-09).** `LegendCubeDialects` gets `WINDOW_SHAPES` (17 Cube graphs with a Partition) over
`WINDOW_DATABASE_TYPES` (17 types: every plan type but Spanner, Presto and Composite, which refuse any window, pinned,
plus DuckDB, which plans windows but would need its own entry for the Group after two Renames, so it isn't in
`DATABASE_TYPES`). Pinned on every window type: an OVER clause and no frame; `count(col)`, `count(1)`, `sum`,
`avg(1.0 * …)`; `rank()`, `dense_rank()`, `row_number()` over the window's sort; no bare count; a rank and an aggregate
in selects of their own, listed in the Partition's order; `over (order by …)` and `over ()`; a Filter after a
Partition as `WITH n_partition101` and a `WHERE` outside every window, never QUALIFY; the capture's ORDER BY and limit
at the root, never Sybase IQ's own numbering; on SQL Server and Sybase, every ORDER BY in a subquery or CTE with TOP,
for a sorted Limit before and after a Partition; the windowed distinct forms (native everywhere in the plans); one
select per window column on H2; and the row-number databases keeping `cube_rn` around a Partition. ISSUES gets five
drafts: window `count()` losing OVER, a single-form window not isolated (QUALIFY on 4 types, refused on 6, silently
dropped on 9), a rank with no ORDER BY planning, windowed `count(distinct)` portability, and one subselect per window
column. The patch changeset for both packages. Gates: `check:ci`, `lint:ci`, 2752 core, 1264 builder and 245 Query
tests pass, and 652 of 654 engine tests: the two others are direct-connection setup-failure tests M5 doesn't touch,
which the local engine now takes about 90 s to fail, past their 30 s timeout (they passed at M5.7, and nothing they
read has changed since); the engine may need a restart.

**M5.11 (2026-10-09).** The core guide covers windows (isolation boundaries, the lets and the run lambda's shape,
the array form, separate extends, `size()` counts, the per-column nesting), aggregation uses, and the shared codec
readers; the builder guide the shared rows (`CubeAggregationRowEditor`, `CubeSortRowEditor`, `CubeColumnChecklist`),
judging rows by the node Apply stores, a Partition's column origins, and `WINDOW_SHAPES`; `testing.md` the window
tests (plans, the operations tests, H2 and DuckDB, the composition suite, the isolation test); both READMEs list
window functions.

## Open items

- The engine issue drafts in ISSUES.md for windows (M5.10), filed by the user.
- The landing order with `cube-ingest`, based before M4, which touches the same registries (PLAN §11.6, Landing).
