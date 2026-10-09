# Legend Cube — M4 Progress Log

> **What this file is:** the "where are we" ledger for M4, Group and Concat (PLAN §11.3 and §11.5). It is kept apart
> from [PROGRESS.md](PROGRESS.md), which covers M1, and [PROGRESS-M2.md](PROGRESS-M2.md), so the lines of work merge
> cleanly. [PLAN.md](PLAN.md) §11.5 holds what M4 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Branch | `cube-m4` merged on 2026-10-09 as #5649 (`d847e6721`, squashed); the follow-ups are on `cube-m4-followup`, from that merge           |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                                                                    |
| Step   | M4.1–M4.16 done (M4.1–M4.13 and M4.16 merged in #5649; M4.14 and M4.15 on the follow-up PR); M4.17, PLAN's folding, next             |
| Tests  | 2486 core, 1162 builder (core group), 245 Query, 415 builder engine-roundtrip (after the dates warning, on finos master `4f5aab13d`) |

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
- [x] **M4.11** Concat on the engine and around the databases
- [x] **M4.12** Concat's Rename and Restrict autofixes
- [x] **M4.13** Concat's Convert types setting
- [x] **M4.14** Docs and changeset
- [x] **M4.15** Verification and the browser rehearsal
- [x] **M4.16** A demo video of M4's features, as for M1 and M2 (PLAN §11.3)
- [ ] **M4.17** Rebase on the latest master, fold PLAN §11.5's supersessions in, PR when the user asks

## Commits

Filled in as steps land. Rebased on master `e01552380` (#5641) after M4.10: the hashes are the rebased ones, before
the squash merge; the follow-up PR's are its own.

| Step       | Commit      | Subject                                                                     |
| ---------- | ----------- | --------------------------------------------------------------------------- |
| M2 merge   | `38bdecd96` | docs: record Legend Cube M2's merge                                         |
| M4.1       | `d5efd8b64` | docs: settle Legend Cube M4 (Group and Concat)                              |
| M4.2       | `c09967e03` | test: hold Legend Cube's inference to the engine's, node by node            |
| M4.3       | `4514dee9e` | feat: add the aggregations Legend Cube's Group will use                     |
| M4.4       | `6a83028a7` | feat: add Group to Legend Cube's core                                       |
| Video rule | `87c00c554` | docs: end every Legend Cube milestone that changes the UI with a demo video |
| M4.5       | `8ca87464c` | feat: add Group by Column to Legend Cube's builder                          |
| M4.6       | `c19ea96ea` | test: run Legend Cube's Group on the engine and in the browser              |
| M4.7       | `52fadf5fa` | feat: add Group by to Legend Cube's grid quick actions                      |
| M4.8       | `c940c85d3` | test: pin how each database plans Legend Cube's Group                       |
| M4.9       | `1c78ae348` | feat: add Concat to Legend Cube's core                                      |
| M4.10      | `1a5460950` | feat: add Concatenate Another Input to Legend Cube's builder                |
| Rebase     | `ccadc49b4` | test: leave data product sources out of Legend Cube's conformance guard     |
| Rebase     | `8ae0cadff` | docs: record Legend Cube M4's rebase on master                              |
| M4.11      | `a997a5cc1` | test: run Legend Cube's Concat on the engine and plan it on each database   |
| M4.12      | `f277ee542` | feat: add Concat's Rename and Restrict autofixes to Legend Cube             |
| M4.13      | `6c1bc9ba1` | feat: add Concat's Convert types setting to Legend Cube                     |
| Rebase     | (none)      | rebased on finos master `4f5aab13d` (#5652, #5651): 17 commits unchanged    |
| Dates      | `c81223a4f` | feat: warn about Legend Cube's converted dates in Join and Filter           |
| Merge      | `d847e6721` | feat: add Legend Cube's Group and Concat (M4) (#5649), the above squashed   |
| Merge docs | `04e2054c2` | docs: record Legend Cube M4's merge                                         |
| M4.14      | `b10539a23` | docs: cover Legend Cube's Group and Concat in its guides                    |
| M4.15      | (this one)  | test: close the gaps M4's verification found in Legend Cube                 |

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
auto-names over 128 code points (settled in M4.5: shown invalid, never cut; recorded in PLAN §11.5 by M4.15).

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

**Rebase on master (2026-10-09).** At the user's request, after M4.10, `cube-m4` was rebased on master `e01552380`,
which merged #5641 (direct database connections and data products' access points). The conflicts were lists both
sides add to (the registry and its pinned test, help texts, icons, the editor registry) and the docs (PROGRESS,
ISSUES), each resolved by keeping both; `git range-diff` shows no M4 change altered. One semantic fix:
`dataProductAccessPoint`, now registered, is left out of the conformance guard, since the open-source engine doesn't
read data products (its stand-in engine test checks its types). After the rebase: `yarn install` (three workspace
dependencies of the builder) and `yarn build:ts`, then every gate green.

**M4.11, Concat on the engine and the databases (2026-10-09).** Eight engine tests in
`LegendCubeOperations.engine-roundtrip-test.ts` ("Concat on the engine"), each checked against the tables run alone:
the printed Pure parses to what Cube emits and types as Cube infers; CUSTOMERS and SUPPLIERS give 120 rows, their
names exactly, and the same rows with the inputs swapped; CUSTOMERS with itself gives each customer twice; a Distinct
after it removes the countries both have; a Limit inside the first input takes the last 3 customers by its Sort,
with the 29 suppliers; ORDERS' nullable CUSTOMER_ID and SHIP_NAME with CUSTOMERS' make both nullable, 921 rows; a
Group after it counts all 120. `LegendCubeDialects.engine-roundtrip-test.ts` gains five Concat shapes (in `SHAPES`,
so the numbering and SQL Server checks cover them) and pins on all 19 database types: one UNION ALL per Concat; each
input's Sort and Limit in a subquery of its own with its TOP, LIMIT or FETCH (Sybase IQ: Cube's row numbers), never an
ORDER BY on the union; a Limit after a Concat taken from the whole union; a Group after it outside the union. A
Drop inside an input plans as it does alone (`limit m,-1` on Snowflake, Redshift, Hive, BigQuery and Composite, as
PLAN §8 records), so no workaround and no ISSUES draft.

**M4.12, Concat's autofixes (2026-10-09).** Core `ConcatAutofix.ts` (as `JoinAutofix.ts`): `planConcatRename` maps
each name of the second input that differs from the first input's at its position (case-only included) to the first's,
refused when a renamed name folds to another first-input column (a reorder), when M2's Rename refuses it, or when the
Concat would still be invalid (types); `planConcatRestrict` keeps the narrower input's names in the wider input when
they are there in order, naming the dropped columns. `renameConcatInput` and `restrictConcatInput` splice the node
before the right input as one query change, the selection kept. The node editor's `canRenameConcatInput` /
`renameConcatInput` and `canRestrictConcatInput` / `restrictConcatInput` apply them as one undo step, the panel
staying on the concat; the Concat editor shows each fix with its changes ('REGION → CITY', the dropped columns) and a
'Rename them' or 'Drop them' button. Engine: three conformance cases (the Rename, the Restrict on either input), and
a run whose suppliers' REGION comes back under CITY ('New Orleans Cajun Delights', LA). Browser (:9002): both fixes
turn a Concat valid and run 120 rows. Tests by workflow `m412-tests-verify` (run `wf_18e9362c-e17`, 4 agents): the
core (67), the store (21), the editor (12). Mutants: 65, 53 killed; of the 12 survivors, 9 are equivalent (guards
that Rename, Restrict or the validity check repeat, and buttons whose disabled state matches read-only whenever the
editor shows), S04 (the store passing the schemas swapped) is killed by a new test, and S03 and S08 (the fix not made
from the panel's edits) can't be seen until Concat has a draft (M4.13).

**M4.13, Convert types (2026-10-09).** `getConcatConvertedType` (`Concat.ts`): a type itself, else the least common
ancestor (String for Varchar lengths, Integer for SmallInt and Int, Number for Int and Float4, Decimal for two Numeric
precisions, Date for StrictDate and Timestamp), never across numbers, strings and dates, enumerations or opaque types.
With `widenTypes`, validation accepts such types and reports the others with `MESSAGE_CONCAT_COLUMN_NOT_CONVERTIBLE`;
the schema has the converted types. The emitter casts each input's differing columns, type-only:
`->extend(~[cube_cast: x|$x.<c>->cast(@<T>), …])->select(~[…])->rename(~cube_cast, ~<c>)…` (roles `convert`, `cast`,
`select`, `rename`). The autofixes plan with the Concat's setting. Builder: `CubeConcatDraft` (Convert types, so Concat
now has Apply and Cancel; M4.10's widening of the panel's Problems is reverted, no transform without settings having
any), the editor's checkbox, converted types shown in the table ('Varchar(15)? → String'), and an offer to tick it when
that makes the inputs match, never for an untyped column (H2 failed converting one, review). Engine: 16 conformance
cases, every converted type exact; runs on H2 (TinyInt and SmallInt, Varchar lengths, StrictDate and Timestamp as
midnight timestamps, Int with Float4, BigInt with Double kept exact, a row's values kept together beside a column named
CUBE_CAST, the Rename autofix once it converts); all 19 database types plan it as one UNION ALL with no SQL cast.
Browser (:9002): Varchar(15) and Varchar(30) to String, applied, 120 rows. Tests by workflow `m413-tests-verify` (run
`wf_0ffa5a38-3f1`, 5 agents). Review: the untyped offer (fixed and pinned), PLAN's bullet (updated), and a converted
Date comparing as timestamps downstream (open, for the user). Mutants: 78, 74 killed; 3 equivalent, E02e (converted
types shown where names differ) killed by a new test, as is the untyped offer's guard.

**Dates warning and second rebase (2026-10-09).** The branch was rebased on finos master `4f5aab13d` (#5652, the
data product sources, and #5651), with no conflict and every commit's patch unchanged, and force-pushed after every
gate passed. The user chose a warning for a converted Date (review of M4.13): `isDateOrTimestampType` (core) is true
for the abstract Date only, which only Convert types gives; the Join editor warns on a key pair with such a column on
either side, and the Filter editor on a condition that compares one with a value. Tests: the helper, both editors
(the Join's on either input), each warning's mutants killed in the isolated copy.

**After M4.13 (user, 2026-10-09):** the PR is marked ready for review once the changeset and description are updated
and every gate is green; M4.15's verification, M4.16's video and later checks follow as fixes on the open PR.

**Merge and the demo video (2026-10-09).** #5649 was approved and squash-merged on 2026-10-09 as `d847e6721`. M4.16's
video, `legend-cube-m4-group-concat.webm` (3:12), was sent to the user to attach to #5649: evidence
`demo/demo-m4.mjs`, its cubes from `demo/demo-m4-specs.mjs` (`m4-specs/`), against the :9002 dev server and the
engine. Seven scenes (the grid's Group by, 21 countries adding up to 830; the Group editor's Sum and Max; a Concat added
from a node's menu and wired, First and Second on the canvas; "Rename them", 120 rows; "Drop them"; Convert types, 120
rows; the date warning, the midnight row only), 19 checks as it runs, each key frame checked against its caption. Two
captions were reworded after a take: no claim of Concat's row order, and no value named that isn't on screen.

**M4.14, the guides (2026-10-09).** The core guide names Group and Concat as examples; covers `BinaryNode`'s default
ports and own port labels, a setting passed to the shared validation, the autofix pattern (plan, `can…`, fix, offered
only when the fixed node is valid by its own checks), several temporary columns at once, type-only casts, and a
boolean setting always written; and gives the menu order. The builder guide covers a transform that gains a draft,
fixes as node-editor actions on the query with the draft applied, warnings that belong to one control, Group's and
Concat's columns in `findColumnOrigins`, and dialect shapes. `testing.md` covers the conformance exemption and
`converted`, the data a test may rely on, and the Group and Concat plan facts. Both READMEs list Group and Concat. A
patch changeset for both packages.

**M4.15, verification and the rehearsal (2026-10-09).** Workflow `m415-verify` (run `wf_7615b47a-011`, 16 agents:
reviewers of the core, the builder, and the engine and tests, then a skeptic per finding; the rehearsal agent re-run
once after a network error) over the merged code (`d847e6721`). 12 findings: 5 refuted as intended and documented
(a Group row with no column left out, the editor's Count Rows auto-name, a function its new column doesn't offer kept
and shown invalid, the column picker's title, the cast pins), 7 confirmed, all fixed: the database test now requires
each sorted shape's ORDER BY by both keys and two in a Concat of sorted Limits (before, a lost sort passed on 18 of
19 types); a 'Sort after a Concat' shape, ordered outside the union on every type; conformance cases for a Group of
the types Convert types gives (Number, Date, abstract Integer, Float, Decimal, String); a grid Group by on a Group
named 'Count Rows 2'; a hint when a Rename or Restrict needs Convert types ticked (`CONCAT_FIX_NEEDS_CONVERT_TEXT`);
PLAN records the long auto-name decision (shown invalid, never cut) and the suite's families, and ISSUES' Postgres
draft covers Group's auto-names. The new tests fail without what they cover (isolated copies). Rehearsal:
`demo/rehearsal-m4.mjs`, M2's with only the grid menu's order changed and 3 palette and menu checks added, 57/57; the
demo's 19 checks pass again.

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
