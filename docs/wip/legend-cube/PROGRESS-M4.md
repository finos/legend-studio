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
| Step   | M4.1–M4.2 done (the settled decisions; the conformance suite on M2's node types); **M4.3 next**                                     |
| Tests  | 1853 core, 750 builder (core group), 236 Query, 169 builder engine-roundtrip (after M4.2)                                           |

## Steps

See PLAN §11.5 for each step's deliverable and when it is done.

- [x] **M4.1** The settled decisions (PLAN §11.5) and this file
- [x] **M4.2** The conformance suite on M2's node types
- [ ] **M4.3** The aggregation model (core)
- [ ] **M4.4** Group in the core
- [ ] **M4.5** Group in the builder, and registered
- [ ] **M4.6** Group on the engine and in the browser
- [ ] **M4.7** The grid's 'Group by "X"'
- [ ] **M4.8** Group around the databases
- [ ] **M4.9** Concat in the core
- [ ] **M4.10** Concat in the builder, and registered
- [ ] **M4.11** Concat on the engine and around the databases
- [ ] **M4.12** Concat's Rename and Restrict autofixes
- [ ] **M4.13** Concat's Convert types setting
- [ ] **M4.14** Docs and changeset
- [ ] **M4.15** Verification and the browser rehearsal
- [ ] **M4.16** Rebase on the latest master, fold PLAN §11.5's supersessions in, PR when the user asks

## Commits

Filled in as steps land.

| Step     | Commit      | Subject                                                          |
| -------- | ----------- | ---------------------------------------------------------------- |
| M2 merge | `8c1d3f74e` | docs: record Legend Cube M2's merge                              |
| M4.1     | `95339aeb9` | docs: settle Legend Cube M4 (Group and Concat)                   |
| M4.2     | (this one)  | test: hold Legend Cube's inference to the engine's, node by node |

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

## Open items

| Item                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gaps to probe         | ALLTYPES' expected values (M4.6); a Cube-emitted `groupBy` and a widened Concat through the serializer; whether engine errors land on the Group's `aggregation` role or the Concat; how PLAN §7.4's editor without settings carries Concat's autofix buttons before M4.13 gives it a draft; VARIANT or OPAQUE keys, two enumerations, enum rows; Group and Concat SQL on DuckDB; whether `CubeColumnPicker` keeps a stored key order; the PCT manifests (PLAN §11.5, "Risks and open gaps")                                                                                                                                             |
| cube-direct           | Agree with the cube-direct session which branch lands first; the second rebases. Both touch PLAN.md, PROGRESS.md, the builder's `testing.md` (cube-direct appends "Direct connections"; M4 adds a conformance section beside it) and `hosting.md`, and possibly the builder's `index.ts` and `V1_CubeEngineTestUtils.ts`. M4 leaves `V1_LegendCubeEngine.ts` alone (cube-direct routes `typeLambdas` there for direct models). cube-direct predates M2 and already conflicts with it in PLAN.md, PROGRESS.md, `hosting.md` and `CubeSourceEditor.tsx`. Its samples sit in `fixtures/direct/`, which the corpus engine test doesn't read |
| QUESTIONS.md U12      | The Group editor question exists only on `cubeV1` and `cube-direct`; copy Q2 and Q3's answers there after those merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| M2 product follow-ups | Found while recording M2's demo video: Rename's case-only refusal doesn't name the column it matched; the column dropdowns in the Sort, Rename and Join editors cut names off; a full sort loss at a Restrict could name the removed columns; the Stale hint shows while Execute is disabled for an incomplete node                                                                                                                                                                                                                                                                                                                     |
| Engine issues         | M4's drafts (the alias shadow, `max(bit)` for a Boolean DistinctValue, SQL Server's `SUM(int)`) go to ISSUES.md in M4.8, for the user to file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Supersessions         | PLAN §11.5's list, applied in M4.16                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Known local failures

Seen only in a repo-wide `yarn test`, not in the per-workspace gates: legend-dev-utils `TypescriptConfigUtils.test.js`
(the checkout's path has a space) and legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts` (the local engine
writes empty arrays that Studio's serializer leaves out).
