# Legend Cube — M4 Progress Log

> **What this file is:** the "where are we" ledger for M4, Group and Concat (PLAN §11.3 and §11.5). It is kept apart
> from [PROGRESS.md](PROGRESS.md), which covers M1, and [PROGRESS-M2.md](PROGRESS-M2.md), so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.5 holds what M4 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Branch | `cube-m4`, from finos master `d1c3f3ae6` (after M2 merged as #5644, `0335b3f5f`); its first commit, `8c1d3f74e`, records that merge |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                                                                   |
| Step   | M4.1–M4.10 done (Group complete; Concat in the core and the builder); **M4.11 next** (Concat on the engine and the databases)       |
| Tests  | 2223 core, 831 builder (core group), 236 Query, 262 builder engine-roundtrip (after M4.9; M4.10 before the rebase)                  |

## Steps

See PLAN §11.5 for each step's deliverable and when it is done.

- [x] **M4.1** The settled decisions (PLAN §11.5) and this file
- [x] **M4.2** The conformance suite on M2's node types
- [x] **M4.3** The aggregation model (core)
- [x] **M4.4** Group in the core
- [x] **M4.5** Group in the builder, and registered
- [x] **M4.6** Group on the engine and in the browser
- [x] **M4.7** The grid's 'Group by "X"'
- [x] **M4.8** Group around the databases
- [x] **M4.9** Concat in the core
- [x] **M4.10** Concat in the builder, and registered
- [ ] **M4.11** Concat on the engine and around the databases
- [ ] **M4.12** Concat's Rename and Restrict autofixes
- [ ] **M4.13** Concat's Convert types setting
- [ ] **M4.14** Docs and changeset
- [ ] **M4.15** Verification and the browser rehearsal
- [ ] **M4.16** A demo video of M4's features, as for M1 and M2 (PLAN §11.3)
- [ ] **M4.17** Rebase on the latest master, fold PLAN §11.5's supersessions in, PR when the user asks

## Commits

Filled in as steps land.

| Step       | Commit      | Subject                                                                     |
| ---------- | ----------- | --------------------------------------------------------------------------- |
| M2 merge   | `8c1d3f74e` | docs: record Legend Cube M2's merge                                         |
| M4.1       | `95339aeb9` | docs: settle Legend Cube M4 (Group and Concat)                              |
| M4.2       | `cb6837dd6` | test: hold Legend Cube's inference to the engine's, node by node            |
| M4.3       | `4c7398dca` | feat: add the aggregations Legend Cube's Group will use                     |
| M4.4       | `eefb1dfb5` | feat: add Group to Legend Cube's core                                       |
| Video rule | `1f7c21c13` | docs: end every Legend Cube milestone that changes the UI with a demo video |
| M4.5       | `8165c6598` | feat: add Group by Column to Legend Cube's builder                          |
| M4.6       | `84c9f999c` | test: run Legend Cube's Group on the engine and in the browser              |
| M4.7       | `d2e700fa7` | feat: add Group by to Legend Cube's grid quick actions                      |
| M4.8       | `3242636e2` | test: pin how each database plans Legend Cube's Group                       |
| M4.9       | `8616f433f` | feat: add Concat to Legend Cube's core                                      |
| M4.10      | (this one)  | feat: add Concatenate Another Input to Legend Cube's builder                |

## Step notes

**M4.1 (2026-10-09).** Requirements `m4-requirements` (workflow run `wf_edce0040-94c`, 4 agents: readers for Group,
Concat and the cross-cutting work, and a synthesizer that merged their reports and checked their claims): 52
checklist items, a 16-step build order and 8 questions. The full result is `m4-requirements-result.json` in the local
evidence folder, with the probe outputs under `m4-requirements/`. What it established (engine facts re-run on
`93d92b4` unless marked 💭):

- M2 was already merged, and `cube-m4`'s Cube packages are identical to `cube-ops`', so the code citations made
  against `cube-ops` hold.
- Group: the engine outputs the keys in the order listed; it types Min, Max and DistinctValue `[0..1]` but Sum and
  Average `[1]`, though both can be null, so Cube's nullability decides whether a negated filter keeps the null group;
  an aggregate over no rows gives one row; no keys and no aggregations each throw an NPE; Count of the null
  SHIP_REGION group is 0 where Count rows is 507.
- Concat: the engine doesn't check the column count (it types the shorter relation and fails at execution), ORs
  nullability, accepts a type next to its own ancestor and refuses sibling types and another column order; a
  type-only cast widens two Varchar lengths with no SQL cast.
- Neither needs a database workaround, on plans only (💭).
- The synthesizer corrected six reader claims, kept as build rules in PLAN §11.5 (ALLTYPES' values, FREIGHT's type,
  Count rows' saved shape, `findColumnOrigins`, key order, the Concat key shipped with the kind).

The user answered all eight questions on the recommendation (2026-10-09):

- Q1 Count rows: added, with no column (`x|1 : y|$y->count()`), and the default of the grid's Group by; Count keeps
  D4's meaning.
- Q2 Group keys: a multi-select that stores picks in the input's order; a loaded order is kept until the picks change.
- Q3 Output names: always stored; the editor's auto-name follows until edited; a nameless saved one gets it on read.
- Q4 An unknown, empty or window-only function keeps the Group, invalid and saved again unchanged; Rank and DenseRank
  are unknown in M4.
- Q5 Concat types: strict (D5), plus a saved setting that widens within a family by a type-only cast, turned on by
  "Convert types"; across families later.
- Q6 Concat autofixes: a Rename before the second input and a Restrict before the wider input, as separate buttons.
- Q7 Conformance nullability: exact, with the columns where Cube may be wider declared per case; replaces PLAN §12.1's
  one-way rule.
- Q8 Concat wording: ports First and Second, and the new help text.

**M4.2, the conformance suite (2026-10-09).** `CubeInferenceConformance.engine-roundtrip-test.ts` resolves the
tables of 19 cases in one engine call and types every node of every case in one `typeLambdas` batch (about 0.1 s):
the sources (ORDERS, ALLTYPES), Filter (an And with a negated Is Empty; Is Not Empty on ALLTYPES), the four Joins on
CUSTOMER_ID, a FULL join on keys of differing parameters and one on a nullable key, a LEFT join then Restrict, Rename,
Sort and Limit, the Join autofix (ORDER_DETAILS and PRODUCTS), Sort on two keys, Restrict then Rename, Restrict then
Distinct, Limit, Drop and Slice after a Sort, and a chain on ALLTYPES. `TEST__typingDifferences`
(`CubeOperationsTestUtils.ts`) compares names, positions, precise types with parameters and nullability exactly;
`TEST__expectEngineTyping` now uses it one-way, as does the corpus test, which types every node each sample can run,
not only the one it runs. Run with no exception declared, the suite found 13 differences, all columns the engine
types not nullable where Cube says nullable: padded columns of the LEFT, RIGHT and FULL joins, the FULL merged keys,
and the padded column carried through the nodes after the LEFT join. Each is declared in its case's `widerNullable`
with the reason; no M2 node differs otherwise. Proofs: removing every Distinct fails the coverage test, and dropping
the LEFT join's declared column fails the typing test (each run on a temporary copy of the test, then deleted). A
core-group test pins the comparator's rules (10 tests). The builder guides say a new operation needs a case.

**M4.3, the aggregation model (2026-10-09).** `src/nodes/transforms/Aggregation.ts`: the functions as saved
(`AggregationFunction`, Count rows as `CountRows`), how each is shown, `getAvailableAggregations` per family, the
result type (`getAggregationResultType`, PLAN §5.7) and nullability, the auto-name, and `validateColumnAggregation`,
one row at a time with the spec's messages and two of Cube's (`… is not valid column name.`; `Group column "X" of type
<T> cannot be grouped.` for M4.4). Enumerations, VARIANT and a type Cube doesn't know get Count only, through the
switch's default. Check (`m43-verify`, 2 agents): a review against the spec, PLAN and the probes, which also probed
the unmeasured cells (Min and Max over `Date` give `Date` ✅; evidence `m4-verify/review/types-unmeasured.out`); and
44 mutants in an isolated copy (`m4-verify/mutants/`), 38 killed. Of the 6 survivors, 2 were dead code, removed (a
default branch, now carrying the Count-only types, and a blank-name guard), and 4 had tests added: names that meet
only when folded (fullwidth, `ß` and `SS`) and the order of the name rules. Also added: Count rows' name rules. Left
for later steps, in PLAN §11.5's open gaps: M5's functions per use, M4.5's column on a switch to Count rows, and
auto-names over 128 code points.

**M4.4, Group in the core (2026-10-09).** `Group.ts` (keys in stored order, validation in PLAN §11.5's order with
`validateGroupColumn` exported, the schema of keys then aggregations, `describe()`, no row order), `GroupEmitter.ts`
(`groupBy(~[keys], ~[n: x | $x.c : y | $y-><reduce>])`, `aggregate(…)` with no key, Count rows as `x | 1`, roles
`group` and `aggregation`), `CubeIR.aggregationColSpec`, `GroupCodec.ts` (Q3 and Q4) and `GROUP_DEFINITION`, not in
`createNodeRegistry()` until M4.5: tests pass `TEST__registryWithGroup()` (`__test-utils__/CubeTestRegistry.ts`).
Tests by workflow `m44-tests-verify` (5 agents, three writers on disjoint files, then a review and mutants): Group's
node (55), RowOrder (4: a Sort before a Group is a full loss naming it, even after a Restrict's partial one), the
emitter (24), the serializer's `function2`, and the four saved-spec suites. The review confirmed the emitted Pure on the
engine and found two defensive gaps in the emitter, now closed: a Group with no aggregation has its own message, and
a column function without a column throws instead of counting rows. Mutants: 74 in the isolated copy, 67 killed; of
the 7 survivors, 2 are equivalent (a guard that only narrows a type; the encoded keys' array identity) and 5 had tests
or code added (a key repeated in another case, aggregations kept with exactly their three fields, the emitter's three
guards), each shown to fail its mutant in the copy. Settled: a nameless aggregation with no auto-name is read as `''`
and its empty name reported once its function and column are valid. The constructor now uses `isStringList`.

**M4.5, Group in the builder (2026-10-09).** Group is registered after Sort (core registry; the builder's draft and
editor registries, help text from spec §17.9, icon `DataCubeIcon.TableGroupBy`), with the pinned lists updated
(`Nodes.test.ts` with Group's definition test, the palette, the canvas menu, help texts, icons); the M4.4 test registry
is gone. `CubeGroupDraft`: keys stored in input order on any tick or untick, a saved order kept until then (Q2); rows
whose name follows column and function until typed, the empty name of a row with no auto-name included (Q3); Count set
when a column is picked first; Count rows clears the column; `isBuiltGroupRow` decides which rows build: a column,
Count rows, or a function this version doesn't know with no column (Rank, kept per Q4). `CubeGroupEditor`: the "Group
columns" checkboxes (VARIANT and OPAQUE disabled unless already ticked, so a bad saved key can be unticked), rows of
column, function (the column type's functions, then Count Rows) and name, each problem marked on the control it is
about, a "Clear column" button for a saved Count rows holding one, "Add aggregation" never disabled, the notes.
`findColumnOrigins` follows a Group's keys and its Distinct Value, Min and Max outputs. A Group joins
`operations.cube.json` (on its own ORDERS node, since a node feeds one other). Conformance: every allowed (function,
family) cell on ALLTYPES by a key and over all rows, keys out of input order, FREIGHT, a Group of a Group, a Group
after a LEFT join; Group types exactly as the engine does but for the declared Sum and Average. Tests by workflow
`m45-tests-verify` (5 agents): the draft (22), the editor (19), Join origins (6). The review found 11 issues, all fixed
(the six behaviour fixes above, each shown by a revert in the isolated copy to fail a test, and five small ones);
mutants: 40, 39 killed, 1 equivalent while validation reports one problem per row.

**M4.6, Group on the engine and in the browser (2026-10-09).** Seven engine tests in
`LegendCubeOperations.engine-roundtrip-test.ts` ("Group on the engine"), each the first run of the `groupBy` or
`aggregate` Pure Cube writes: ORDERS by SHIP_COUNTRY gives 21 groups adding up to 830; with no key one row of 830; the
SHIP_REGION group of no region counts 0 regions and 507 rows; every function each ALLTYPES column offers, as worked out
over its three rows (counts 3 and 2, two distinct values so no Distinct Value, BigInt's Sum exact as text
`9007199254740997`, decimals as text, dates and timestamps; BigInt's Average comes back lossy, so isn't pinned); one
distinct value per ID group (`abc`, `xyz`, none); one row over no rows (0, 0, empty, empty); and a negated filter on a
Sum keeping ALLTYPES ID 3, whose Sum is empty, because Cube marks the Sum nullable. Browser check (evidence
`demo/check-m46-group.mjs`, 15 checks, Chromium 149, :9002): Group after Sort in the palette, added from the Filter's
menu, a key ticked, Sum of FREIGHT and Count Rows built with their auto-names, a name like an input column refused,
Apply, F9 giving 7 cities adding up to the 19 orders, and the spec saving the Group as PLAN §11.5 says; the console
clean. It caught a layout gap: the row controls didn't fit the panel side by side (once the Query deployment's
Tailwind CSS was rebuilt for the new classes), so each aggregation now takes two lines, its column, then its function,
name and remove button.

**M4.7, the grid's Group by (2026-10-09).** `getCubeGridQuickActions` offers `Group by "X"` between Sort by and
Filter by: a Group keyed on the cell's column with Count rows (Q1), added after the node that ran as one undo step
that selects it, never run. It is disabled for M2's shared reasons (stale rows, a run, a read-only cube) and on a type
that can't be compared (`notGroupable`). The Count rows name is `Count Rows`, or `Count Rows 2`, 3, … when an input
column already has it in any case (`getGroupByCountName`; a Group of a Group). Spliced before a downstream node, it
can leave that node invalid, visibly and undone in one step. Tests: the store (Group by added as described, disabled on
Variant, the splice and its undo, the free name), the context menu's order, and on the engine 21 countries adding up
to the 830 orders. The existing tests that picked Filter by second now pick it third; the M2 rehearsal script's menu
check (evidence `demo/rehearsal-m2.mjs`, check j) expects Filter by second and needs the same change before reuse.

**M4.8, Group around the databases (2026-10-09).** No `CUBE_DIALECT_WORKAROUNDS` entry: every plan below came out
right or is an engine issue Cube can't route around. `LegendCubeDialects.engine-roundtrip-test.ts` gains six Group
shapes (in `SHAPES`, so the existing checks cover them: numbering by every key, no ClickHouse offset run into a word,
no Sybase IQ rewrite, no row numbers inside a `select distinct`, no TOP before DISTINCT) and pins on all 19 database
types: `count(distinct …)`, `avg(1.0 * …)`, `count(1)` for Count rows and a `case` for Distinct Value; a Filter after a
Group as HAVING with `count(1)` inlined; a Distinct before a Group kept as a `select distinct` subquery; on SQL Server
and Sybase no ORDER BY in a subquery under a GROUP BY without its TOP; Sybase IQ's Limit after a Group by Cube's row
numbers. And the alias shadow: after SHIP_COUNTRY is renamed away and SHIP_CITY renamed to SHIP_COUNTRY, ten types
group by the expression or the position, nine by the alias while the subquery still has the table's SHIP_COUNTRY
(H2 reads the alias and is right ✅; MemSQL, Redshift and Hive are inferred to group by, or fail on, the other column).
A `select` before the group doesn't help (the engine folds it in); grouping by a temporary key would, so it is the
user's call whether Cube works around it. ISSUES drafts: the alias shadow, `max()` over a Boolean for Distinct Value
(SQL Server, Sybase, Postgres), and SQL Server's `int` sum overflow; all plan-only.

**M4.9, Concat in the core (2026-10-09).** `Concat.ts` (validation, schema, First and Second), four messages in
`CubeMessages.ts`, `ConcatEmitter.ts` (role `concat`), `ConcatCodec.ts` (`widenTypes`, always written) and
`CONCAT_DEFINITION`, not yet in `createNodeRegistry()`: tests pass `TEST__registryWithConcat()`
(`__test-utils__/CubeTestRegistry.ts`), which gives the default registry once it holds Concat, so M4.10 can register
it and then drop the helper. The messages and the key are settled in PLAN §11.5. Tests (workflow `m49-tests-verify`,
run `wf_8e6ecad8-699`, 5 agents: three writers on disjoint files, a reviewer with engine probes, a mutation tester):
`Concat.test.ts`, `ConcatEmitter.test.ts`, row order, messages and the four saved-spec suites. On the engine (H2,
evidence `m4-verify/m49-review/`): nullability is OR'ed both ways, as Cube's schema; a column-count mismatch types as
the shorter relation and fails only when run (an NPE), which Cube refuses before; a reorder, a case-only name and two
Varchar lengths are 400s; SmallInt with Integer, which Cube refuses until Convert types, types and runs as Integer.
Review fixes: a type message names the paths when both types share a short name (two enumerations `a::Region` and
`b::Region`); the emitter refuses a third input; `CONCAT_DEFINITION`'s fields are pinned. Mutants: 59 run, 54 killed. Of the 5 survivors, 2 are equivalent (the second
input's names, and a nullability fallback, both unreachable once validation passes) and 3 (the definition's label,
icon and beta) are killed by the new definition test; so are 4 more mutants of the fixes (evidence
`m4-verify/mutants/results-m49/`).

**M4.10, Concat in the builder (2026-10-09).** Concat is registered between Slice and Join (core registry, the M4.9
test registry gone; the builder's editor registry, help text per Q8, icon `LayerGroupIcon`), with the pinned lists
updated (`Nodes.test.ts`, the palette, the canvas menu, icons, help texts). It is in `CUBE_NODE_TYPES_WITHOUT_SETTINGS`
until Convert types (M4.13): no draft, no Apply or Cancel; the panel now lists the problems of such a transform too
(PLAN §7.4), never a source's. `CubeConcatEditor`: the requirement in words, then a table of both inputs' columns by
position (name, type, `?` when nullable; the path when two different types share a short name), each name or type
that differs from the other input's marked with a title saying what it has, `(none)` where only one input has a
column, and the 'type unknown' warning for each untyped column of either input. `findColumnOrigins` already follows a
Concat into both inputs by name. Conformance: six cases (matching columns, nullability from either input both ways,
every ALLTYPES type, a Sort and Limit inside an input with a Group and Sort after, a Concat of a Concat), exact with
no declared column. A Concat of CUSTOMERS and SUPPLIERS joins `operations.cube.json`. Browser (:9002): the palette
item, edges labelled First and Second, a mismatched Concat's marks and messages, and a matching one running 120 rows
(91 customers and 29 suppliers). Tests by workflow `m410-tests-verify` (run `wf_c13c8a0f-ab6`, 4 agents): the editor
(14), the panel (3), origins through a Concat (5), the canvas (2). Review fixes: the editor text no longer implies an
order; long names wrap in the warning and the Problems list; a failed table's message isn't repeated as a Problem
(pinned). Mutants: 42, 41 killed, the survivor (Problems for every type) killed by that test.

## Open items

| Item                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gaps to probe         | ALLTYPES' expected values (M4.6); a Cube-emitted `groupBy` and a widened Concat through the serializer; whether engine errors land on the Group's `aggregation` role or the Concat; how PLAN §7.4's editor without settings carries Concat's autofix buttons before M4.13 gives it a draft; VARIANT or OPAQUE keys, two enumerations, enum rows; Group and Concat SQL on DuckDB; whether `CubeColumnPicker` keeps a stored key order; the PCT manifests (PLAN §11.5, "Risks and open gaps")                                                                                                                                             |
| Alias shadow          | Settled (user, 2026-10-09): engine issue only, no Cube workaround (PLAN §11.5, item 9); the dialect test pins each database's GROUP BY                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Grid numbers          | A Sum of a 32-bit REAL column such as FREIGHT shows float noise (`587.9800033569336`); number formatting is M7's (§13)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| cube-direct           | Agree with the cube-direct session which branch lands first; the second rebases. Both touch PLAN.md, PROGRESS.md, the builder's `testing.md` (cube-direct appends "Direct connections"; M4 adds a conformance section beside it) and `hosting.md`, and possibly the builder's `index.ts` and `V1_CubeEngineTestUtils.ts`. M4 leaves `V1_LegendCubeEngine.ts` alone (cube-direct routes `typeLambdas` there for direct models). cube-direct predates M2 and already conflicts with it in PLAN.md, PROGRESS.md, `hosting.md` and `CubeSourceEditor.tsx`. Its samples sit in `fixtures/direct/`, which the corpus engine test doesn't read |
| QUESTIONS.md U12      | The Group editor question exists only on `cubeV1` and `cube-direct`; copy Q2 and Q3's answers there after those merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| M2 product follow-ups | Found while recording M2's demo video: Rename's case-only refusal doesn't name the column it matched; the column dropdowns in the Sort, Rename and Join editors cut names off; a full sort loss at a Restrict could name the removed columns; the Stale hint shows while Execute is disabled for an incomplete node                                                                                                                                                                                                                                                                                                                     |
| Engine issues         | M4's drafts (the alias shadow, `max(bit)` for a Boolean DistinctValue, SQL Server's `SUM(int)`) go to ISSUES.md in M4.8, for the user to file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Supersessions         | PLAN §11.5's list, applied in M4.17                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Known local failures

Seen only in a repo-wide `yarn test`, not in the per-workspace gates: legend-dev-utils `TypescriptConfigUtils.test.js`
(the checkout's path has a space) and legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts` (the local engine
writes empty arrays that Studio's serializer leaves out).
