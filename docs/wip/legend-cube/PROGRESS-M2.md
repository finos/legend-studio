# Legend Cube — M2 Progress Log

> **What this file is:** the "where are we" ledger for M2, the simple unary operations (PLAN §11.3 and §11.4). It is
> kept apart from [PROGRESS.md](PROGRESS.md), which covers M1, so the two lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.4 holds what M2 settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                         |
| ------ | --------------------------------------------------------------------------------------------- |
| Branch | `cube-ops`, on master `3260216a6` (#5634, M1.9, merged 2026-10-08)                            |
| Engine | Local legend-engine `93d92b4` on `localhost:6300`                                             |
| Step   | M2.1–M2.8 done (Limit, its verification, Drop, Slice, Distinct, Restrict); M2.9 next (Rename) |
| Tests  | 1599 core, 646 builder (core group), 236 Query, 88 builder engine-roundtrip (after M2.8)      |

## Steps

See PLAN §11.4 for each step's deliverable.

- [x] **M2.1** The settled decisions (PLAN §11.4) and this file
- [x] **M2.2** Limit in the core: node, codec, emitter
- [x] **M2.3** Limit in the builder, and registered
- [x] **M2.4** Limit on the engine and in the browser: the contract proven
- [x] **M2.5** Drop (native)
- [x] **M2.6** Slice (native)
- [x] **M2.7** Distinct
- [x] **M2.8** Restrict
- [ ] **M2.9** Rename, with the column-name rule and the collision fix
- [ ] **M2.10** Join rename autofix
- [ ] **M2.11** Sort, the row-order module, and the ORDER BY where the order is used
- [ ] **M2.12** The Sort warning
- [ ] **M2.13** Database workarounds (row numbers for Drop and Slice, padded Distinct on SQL Server)
- [ ] **M2.14** Grid quick actions: Sort by and Filter by
- [ ] **M2.15** Docs, sample typing on the engine, changeset text
- [ ] **M2.16** Verification and the browser rehearsal
- [ ] **M2.17** Rebase on the latest master, fold PLAN §11.4's supersessions in, PR when the user asks

## Step notes

Hashes are after the rebase onto master.

**M2.1 (2026-10-08): `2648b456d`.** Requirements `m2-requirements`: 140 checklist items, a 17-step build order and 5
questions (the full result is kept in the local evidence folder). The user answered all five on the recommendation
(PLAN §11.4): re-point `cube-ops` at `cubeV1`, Limit first, Sort's ORDER BY where the order is used, database
workarounds detected from the runtime, and Slice's "(20 excluded)" wording. `cube-ops` had no commits of its own, so it
was reset to `cubeV1` (`b9923ed28`). Gates on that base: `check:ci` and `lint:ci` green; 1419 core, 538 builder (core
group), 236 Query and 63 builder engine-roundtrip tests.

**Rebase (2026-10-08).** #5634 merged as `3260216a6`, whose tree is `0807adb12`'s, so the base's last commit
(`b9923ed28`, the DuckDB WASM note) was not in it. `git rebase --onto origin/master b9923ed28 cube-ops` replayed the M2
commits with no conflicts; that note stays on `cubeV1`.

**M2.2 and M2.3, Limit (2026-10-08): `5d65d0251`.** One commit: the registry test requires every registered type's
editor, help text and icon, so the core step and the builder step land together.

- Core: `Limit` (no default in the constructor; 10 from its definition's `create`), the shared row settings
  (`RowSettings.ts`), `LIMIT_CODEC` (a JSON number, written whenever set, left out only when cleared, read with
  `readOptionalFiniteNumber`), `emitLimit` with the new `take` role, and the registry entry in menu order.
- Builder: `parseWholeNumberText`, `CubeIntegerField`, `CubeRowCountDraft` and `CubeRowCountEditor` ("Rows to keep"),
  the help text, and `AlignTopIcon`.
- Tests: the node, the emitter (origins, apart from the capture's `limit`), decode errors, encoding, validity through
  inference, an M1 registry reading a limit as an Unknown node, unknown keys through edits, and the
  `operations.cube.json` sample; the draft, the whole-number text, the editor through the panel (cleared and refused
  texts, read-only, one undo step) and Ctrl+Z in the size field. The palette, context menu and registry lists include
  Limit.
- Changeset: `legend-cube-unary-operations` (both Cube packages, patch).
- Mutants, each shown caught in an isolated copy by the verification below: a default parameter in `Limit`'s
  constructor (7 tests fail, among them "Defaults to 10 only through its definition…"), the codec writing `size: null`
  for a cleared size (3, among them "Leaves out a cleared size…"), and the codec leaving out the default 10 (4, among
  them "Writes the size of a new limit, the default included" and two corpus tests).
- Gates after the rebase: `check:ci` and `lint:ci` green; 1475 core, 585 builder (core group), 236 Query and 64
  engine-roundtrip tests.

**M2.4, Limit on the engine and in a browser (2026-10-08).**

- Engine: `LegendCubeOperations.engine-roundtrip-test.ts`, through port-typed helpers (`CubeOperationsTestUtils.ts`):
  the serialized lambda equals the engine's parse of the printed Pure, the engine types the Limit as Cube infers it,
  Limit 5 gives 5 distinct orders, Limit 1000 all 830, the run fetches one row past the row limit and no more than
  the Limit gives (10 rows for a Limit of 10 under a row limit of 10, 4 for 5 under 3), and a Limit after a France
  filter keeps only France. Gates: `check:ci` and `lint:ci` green; 585 builder (core group) and 69 engine-roundtrip
  tests (core and Query unchanged).
- Browser, on :9002 and :6300 (Chrome 152, the app's browser pane): the palette's "Take first <x> rows" dragged onto
  ORDERS splices "Take first 10 row(s)" after it and selects it; F9 gives 10 rows; clearing the field shows "Size must
  be a positive whole number." with Apply enabled; 5 and Apply gives "Take first 5 row(s)", stale rows, and 5 rows on
  Execute; Show Pure reads `->limit(5)->limit(1001)->from(…StoreRuntime)`; Export, reload, Import and F9 give the same
  5 rows and the same Export text. Console: only the expected noise (the ServiceWorker, React 19's `element.ref` from
  react-reflex, ag-grid's licence lines). A page first laid out at zero width (the pane opening) warned "Found
  ReflexContainer with width=0" and left the main region empty until a reload: an M1 layout risk, not Limit's
  (ISSUES).
- Guides: the core guide says how a clearable setting is held and saved, that settings are JSON numbers, and which
  saved-spec suites a new kind joins; the builder guide covers whole-number fields, aria-labels and the operations
  engine test; testing.md covers row order versus sets, the Northwind facts and proving a test in a copy; hosting.md
  covers a second checkout on :9002. The core README says settings are JSON numbers.

**Verification of M2.1–M2.4 (2026-10-08), `m2-limit-verify`:** 5 reviewers (core, builder, tests, engine, docs) and a
skeptic per finding, each mutant tried in an isolated copy; 19 findings confirmed (17 once merged), 3 refuted. The full
result is kept in the local evidence folder.

- **Bug, fixed:** a Limit whose saved size its field can't hold (`1.5` or `1e21`, from a spec the app didn't write) lost
  that size when the user typed its text back and closed the editor, or Undo reported lost changes. The draft now
  gives the original back while the field holds the text it opened with; tests cover opening, closing, moving to
  another node, typing back and Undo, and kill the old `build()` and one with no guard at all.
- **Found by a new test:** `CubeNodeIcon` looked names up with a plain index, so `constructor` drew `Object` and crashed
  React; it now takes own keys only (M1 code, unreachable from the registry's own names).
- **Test gaps closed:** the shown rows and the `limited` flag of a Limit run through the editor state (10 under 10 not
  cut; 5 under 3 cut to 3); a Limit inside a query (one side of a LEFT join keeps all 830 orders; an INNER join and a
  Filter only see the Limit's rows), which kills an emitter that pushed a node below a Limit or dropped a Limit; F9
  runs the stored Limit while the panel holds an unapplied size; the size field marked invalid past the safe integers,
  and its `inputmode`; the emitter refusing `1e21` and `2^53`; each node type's icon, and the question mark for
  `constructor`.
- **Docs fixed:** PLAN §11.4 (the outline's `connections` and the run state set before waiting for it, BigQuery,
  `withRange`, Enter/Escape and Ctrl+Z, the controls' labels, the base's label, re-applying the DuckDB WASM note in
  M2.17, the PROGRESS.md supersession), ISSUES (the row limit's parser, Postgres identifier lengths), the builder guide
  (editors work in either host), both READMEs (Limit), and this file.
- **Refuted:** reading ORDER_IDs through `Number()` hides no lossless-reader regression (other tests read exact text);
  §11.4 naming `findColumnOrigins` before it exists is a decision for M2.9, not a defect; testing.md's "H2's order
  changes between queries" is right as written.
- Gates after the fixes: `check:ci` and `lint:ci` green; 1477 core, 605 builder (core group), 236 Query and 74
  engine-roundtrip tests.

**M2.5, Drop (2026-10-08).** `Drop` ("Drop first <x> rows"), registered before Limit in menu order, shares
Limit's row settings, draft and editor ("Rows to drop"), with `DROP_CODEC`, `emitDrop` (the native `->drop(n)`, a new
`drop` role) and `AlignBottomIcon`. The row-number form for SQL Server, Sybase and DB2 comes with M2.13. Tests: the
node, the emitter, the codec suites (a drop beside the limit in the M1-registry case and in `operations.cube.json`),
the editor, and the engine (its lambda and typing; 825 of 830 dropped leaves 5 distinct orders, 830 leaves an empty
result, 70 of the 77 French orders leaves 7). Browser on :9002: an imported ORDERS → "Drop first 10 row(s)" gives 820
rows from ORDER_ID 10258. Gates: `check:ci` and `lint:ci` green; 1515 core, 610 builder (core group), 236 Query and
78 engine-roundtrip tests.

**M2.6, Slice (2026-10-08).** `Slice` ("Take rows <x> to <y>"), 0-based `[start, stop)` (D5), takes `(id, start,
stop)` with no defaults (10 and 20 from `create`) and one edit method, `withRange`; each bound is checked on its own
("Start row index must be a whole number.", "Stop row index …"), then "Start row index must be less than stop row
index."; it describes itself as "Take rows 10 to 20 (20 excluded)". `SLICE_CODEC` writes each set bound as a JSON
number and leaves out a cleared one; `emitSlice` writes the native `->slice(start, stop)` with a new `slice` role (the
row-number form comes with M2.13). The builder adds `CubeSliceDraft`, which keeps a saved bound while its field holds
the text it opened with (the lesson of the first verification), `CubeSliceEditor` with the hint "Rows count from 0: the
start row is kept, the stop row is not.", the corrected help text and `AlignMiddleIcon`. Engine: [10, 15) gives 5
distinct orders, [825, 840) the last 5, and [70, 80) of the 77 French orders 7. Browser on :9002: an imported ORDERS →
"Take rows 2 to 5 (5 excluded)" gives 3 rows (ORDER_IDs 10250–10252, rows 2–4 counting from 0); the editor marks the
stop and reports the range when the start is set to 5. Gates: `check:ci` and `lint:ci` green; 1561 core, 629 builder (core
group), 236 Query and 82 engine-roundtrip tests.

**M2.7, Distinct (2026-10-08).** `Distinct` ("Distinct Values") has nothing to set and is always valid; it saves no
field of its own (a future field that changes rows needs a new kind or a format version, PLAN §11.4) and emits
`->distinct()` over every column with a new `distinct` role (the SQL Server padding comes with M2.13). The builder
registers `CubeDistinctEditor`, a description only, and no draft: `CUBE_NODE_TYPES_WITHOUT_SETTINGS` lists it, the
registry test skips it when asking for a factory, and the panel shows no Apply or Cancel. `CompressIcon`; the builder
guide says how a transform with nothing to set registers. Engine: its lambda and typing, and ORDERS keeps all 830 rows
(the counts that show rows removed come with Restrict). Browser on :9002: the panel shows the description with no Apply
or Cancel, and F9 gives 830 rows. Gates: `check:ci` and `lint:ci` green; 1571 core, 633 builder (core group), 236 Query
and 84 engine-roundtrip tests.

**M2.8, Restrict (2026-10-08).** `Restrict` ("Restrict Columns") keeps the columns it lists, in the input's order:
"Columns cannot be empty.", "Columns cannot have duplicates.", then each column named and in the input (labels
`Columns` and `Column`, PLAN §11.4). `RESTRICT_CODEC` always writes the list, exactly as held; `emitRestrict` lists the
inferred columns in a `select` (the `select` role, shared with Join) and checks they are a subsequence of the input. The
list check moved from Join to `isStringList` (`utils/AssertionUtils.ts`, internal). The builder adds
`CubeRestrictDraft` (picks kept in the input's order; a saved column the input lost stays until unticked) and
`CubeRestrictEditor` (a checkbox list with types, All and None, scrolling on its own), the help text and
`DataCubeIcon.TableColumns`. Engine: picks in another order come back in the input's order, and with a Distinct after
it the ship countries give 21 rows, countries and cities 70, employees and shippers 27. Browser on :9002: the grid's
headers are ORDER_ID, SHIP_COUNTRY for a restrict picked the other way round; the editor lists the 14 columns with two
ticked. Gates: `check:ci` and `lint:ci` green; 1599 core, 646 builder (core group), 236 Query and 88 engine-roundtrip
tests.

## Open items

| Item          | Notes                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Supersessions | PLAN §11.4's list is applied to the sections it names in one docs commit at the end of M2 (M2.17) |

## Known local failures

Seen only in a repo-wide `yarn test`, not in the per-workspace gates: legend-dev-utils `TypescriptConfigUtils.test.js`
(the checkout's path has a space) and legend-manual-tests `RoundtripGrammar.engine-roundtrip-test.ts` (the local engine
writes empty arrays that Studio's serializer leaves out).
