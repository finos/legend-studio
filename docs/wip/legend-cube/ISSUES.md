# Legend Cube — Known Issues

> **What this file is:** the known defects and gaps in Legend Cube, kept so later PRs can fix them. Each entry says
> what is wrong, where, and the suggested fix. [PROGRESS.md](PROGRESS.md) tracks status and [PLAN.md](PLAN.md) the
> plan.
>
> **Upkeep:** add an entry when a verification or a review finds something that is not fixed in the same change, and
> remove the entry in the PR that fixes it. Upstream defects (Studio and engine) are in PLAN.md Appendix B, not here.

## Bugs

### Decimal literals lose precision

- **Found:** M1.7 verification. **Deferred** by the user on 2026-10-07, until after the main end-to-end.
- **What:** the engine reads a `decimal` literal sent as a JSON number through a double. Digits past double precision
  are lost (e.g. `0.10000000000000000001`), so a filter can return the wrong rows.
- **Reachable:** only once a filter on a Decimal column can be built or imported (S7 import, M1.8b Filter editor).
- **Suggested fix:** in `V1_CubeLambdaSerializer`, write a decimal literal's value as a JSON string (the engine's
  `CDecimal` reads it with `new BigDecimal`). Verify it on the engine and add an engine-roundtrip test.

### The row limit accepts hexadecimal and exponent text

- **Found:** M2's requirements and its first verification (2026-10-08). M1 page code, so not fixed in M2's Limit
  step.
- **What:** the grid toolbar's row limit is checked with `Number(text.trim())` (`getRowLimitError` in
  `LegendCubeLabels.ts`) and set with `Number(draft.trim())` (`CubeGridRegion.tsx`), so `0x10` sets 16, `1e3` 1000,
  `0b11` 3 and `1.0` 1, where a user typing them likely meant something else.
- **Suggested fix:** read the text once with `parseWholeNumberText` (`stores/editors/CubeIntegerText.ts`, which the
  operations' size fields use), refuse `undefined` or a value below 1, and pass the parsed number to `setRowLimit`.
  Test: each of those texts gives "The row limit must be a whole number of at least 1." and leaves the limit unchanged.

### A Join doesn't see shared columns that differ only in case

- **Found:** M2's second verification (M2.16). M1 Join code, so not fixed in M2.
- **What:** the Join's duplicate check (`getDuplicateJoinColumns`, `Join.ts`) compares names exactly, so a left `ID`
  and a right `id` pass. SQL Server, MemSQL and DuckDB take them for one column: the join's SQL fails there, or (DuckDB)
  returns one column's values for both. M2.16 made Rename, the Join autofix and Cube's temporary columns compare names
  in any case (`foldColumnName`).
- **Suggested fix:** fold names in `getDuplicateJoinColumns` and in the Join's output-schema check, so the duplicate
  rule and its autofix offer `ID_1`/`id_2`. Test: left `[ID, X]`, right `[id, X]` joined on X reports the duplicate,
  and the autofix makes the join valid.

## Engine issues to file

Upstream defects move to PLAN.md Appendix B once filed (M2.17). These wait for the user's go-ahead to post.

### SQL Server: `distinct()` then `limit()` renders `select top N distinct`

Found in M2's requirements (plan-only, not executed: no SQL Server in reach). On `SqlServer`, the engine writes a
relation `distinct()` followed by `limit(n)` as `select top n distinct …`
(`sqlServerExtension.pure:66` writes TOP before DISTINCT); T-SQL needs `select distinct top n …`. A Cube run hits it
whenever the engine keeps the DISTINCT in the same SELECT as a TOP: a Distinct at the node that runs (the run ends
with `limit(rowLimit + 1)`), or one followed by a Filter, a Sort or a Limit. A Rename or Restrict after the Distinct
moves it into a subquery, which SQL Server accepts. H2 accepts the order (the engine's own H2 test expects it), and
Sybase and Sybase IQ render `select distinct top` for the run's outermost limit (Sybase IQ gets a Limit inside the
query wrong another way: see below). Cube works around it (M2.13), padding every Distinct on SQL Server:
`->distinct()->extend(~cube_d: x | 1)->select(~[…])`, which plans `select top n … from (select distinct …, 1 as
"cube_d" …)`. Draft issue for finos/legend-engine:

```text
Title: SQL Server: distinct() followed by limit() generates SELECT TOP n DISTINCT, which T-SQL rejects

For `#>{db.S.T}#->distinct()->limit(10)` with a `SqlServer` connection, the plan's SQL is
`select top 10 distinct …`. SQL Server requires `select distinct top 10 …`. The TOP clause is written
before DISTINCT in `sqlServerExtension.pure` (line 66). Sybase and Sybase IQ already write
`select distinct top n`.
```

### `rewriteSliceAsWindowFunction` numbers rows by the first sort key only, and inside a `select distinct`

Found in M2's second verification (M2.16, plans only, engine `93d92b4`). For a `limit`, `drop` or `slice` inside a
query, Sybase IQ (`sybaseIQExtension.pure:265`), MemSQL (`memSQLExtension.pure:389`) and Spark
(`sparkSQLExtension.pure:260`) call `rewriteSliceAsWindowFunction` (`extensionDefaults.pure:39`), which numbers the
rows with `row_number() OVER (Order By <the first ORDER BY key only>)`: with ties on that key (ALFKI has six orders),
the plan doesn't decide which rows it keeps. The same rewrite copies the select with `distinct` kept
(`extensionDefaults.pure:67`), so `select distinct X, row_number() …` numbers every row and DISTINCT removes
nothing. Running the plans' SQL on H2 and SQLite gave the wrong rows ('Argentina' ×5 for five distinct countries).
The rewrite also names its numbering column `row_number` whatever the input has, so an input column of that name (any
case) gives two. Cube works around all three (M2.13, M2.16): row numbers of its own for Sybase IQ's Drop, Slice and
every Limit, and for MemSQL's Drop, and the padded Distinct on Sybase IQ. Spark SQL's extension calls the rewrite
too, but no connection can choose it (the protocol's `DatabaseType` has no SparkSQL); Databricks has its own
extension, which doesn't, and planned Cube's shapes right in the M2.16 plan test. Draft issue for
finos/legend-engine:

```text
Title: rewriteSliceAsWindowFunction orders by the first sort key only, and keeps DISTINCT

`#>{db.S.T}#->sort([~A->ascending(), ~B->descending()])->limit(5)->limit(1001)` on Sybase IQ plans
`row_number() OVER (Order By A asc)` for the inner limit, ignoring `B`, so ties on `A` take any rows.
MemSQL does the same for `drop()`. And `->distinct()->limit(5)->limit(1001)` on Sybase IQ plans
`select distinct X, row_number() OVER (…) …`, where the window makes every row distinct.

The rewrite (`extensionDefaults.pure`, lines 39 and 67) should order by every sort key and number the
rows of the distinct query, not within it. It also names the numbering column `row_number` whatever
the input's columns are (line 43).
```

### ClickHouse: a Drop after a descending sort key writes `nulls firstoffset m`

Found in M2's third check (M2.16, plans only). After a sort whose last key is descending, the engine's ClickHouse SQL
for a `drop(m)` joins the null ordering and the offset into one word, `… desc nulls firstoffset 10`
(`clickHouseExtension.pure:252` adds `offset` with no leading space), which ClickHouse can't parse (inferred from the
SQL; no ClickHouse server was run). Cube writes ClickHouse's Drop through row numbers. Draft issue for
finos/legend-engine:

```text
Title: ClickHouse: offset is written with no space after "nulls first"

`#>{db.S.T}#->sort(~A->descending())->drop(10)->limit(1001)` on ClickHouse plans
`order by … desc nulls firstoffset 10`. `clickHouseExtension.pure` line 252 should put a space
before `offset`.
```

### A duplicate column from `rename` or `select` fails with HTTP 500 and no source location

Found in M2's requirements (rename and select probes on `93d92b4`). `#>{db.S.T}#->rename(~ORDER_ID, ~CUSTOMER_ID)`
and `#>{db.S.T}#->select(~[ORDER_ID, ORDER_ID])` fail with `Compilation error at ??, "The relation contains
duplicates: [X]"` as an HTTP 500, not a 400 compilation error with a source location, so the error can't be placed on
a node. Cube's own validation refuses both before they reach the engine (Rename's collision check, Restrict's
duplicates), so Cube users don't see it. Draft issue for finos/legend-engine:

```text
Title: Duplicate columns from rename/select return HTTP 500 with no source information

`->rename(~A, ~B)` where `B` exists, or `->select(~[A, A])`, gives
`Compilation error at ??, "The relation contains duplicates: [B]"` as a 500. It should be a
compilation error (400) with the call's source information, like other typing errors.
```

## Direct connections and data products

### The engine's schema exploration mistypes some columns

On H2 and DuckDB, `DECIMAL(10,2)` comes back as `Numeric(0,0)`; on DuckDB, `VARCHAR(5)` comes back as `Varchar(0)`. Cube keeps the
engine's types (precision isn't enforced in Cube), and no test asserts them. An engine issue to file.

### Engine errors can echo setup SQL

A failed exploration's message may quote the connection's setup SQL. Cube shows the first line and the rest on demand,
in the tab only; it never logs it.

### Data products can't run on the open-source engine

The open-source engine rejects every data product construct (`#P`, a LakehouseRuntime with an environment and a
warehouse), so data product runs are tested with fakes and, on the engine, with stand-in functions only. The first
real run is in an internal deployment (Part B2).

### Saved data product sources aren't checked again

A data product cube opens on its saved column snapshots; Refresh and the re-check on import don't read the artifact
again yet (a planned follow-up). A redeployed product doesn't change a cube, which stays on its saved version.

### The lite list is read whole

The data product list reads the lakehouse's lite list through `getAllLiteDataProducts`, as Legend Query does, which
pages until the server says it's done and takes no abort signal. Paging guards and marketplace search are follow-ups.

## Test gaps

None hides a known bug.

- **The grid tests were not independently verified** (demo-cut test run `m18-democut-tests`, 2026-10-07). The grid
  group's verifier hit the session limit, so `CubeGridRegion.test.tsx` was checked only by its writer, against the
  writer's own mutants.
- **Part A's extras** (M1.9 requirements, kept for later by the user on 2026-10-08). A.4's FULL join on one nullable
  key checks Cube's merged-key nullability but not against the engine's answer: a check must allow Cube ⊇ engine and
  never pin the engine's `[1]`, a known engine defect (PLAN Appendix B). A.7's negatives run on synthetic schemas in
  the core tests, not on the resolved Northwind tables (`ORDER_DETAILS ⋈ PRODUCTS`, `EMPLOYEE_ID Equal 100000`).

## Risks

- **React Flow's two stylesheets.** The Cube canvas (xyflow 12) imports its CSS with the lazy Cube page, so Query's
  other pages don't load it (checked in the M1.8b dry run). Once the Cube page has been opened, it stays loaded for
  the session, and the query builder's lineage viewer (reactflow 11) shares its `.react-flow__*` class names. The
  lineage viewer wasn't seen after a visit to `/cube` (it needs a depot query). Check it when one is reachable.
- **Canvas fitting is checked by hand only.** jsdom measures nothing, so React Flow never reports the nodes measured
  and the refit after a layout or size change (`CubeCanvas.tsx`) has no jsdom test. Part B checks it by hand. The M1.9
  rehearsal found that a height-only change (the splitter above the grid) didn't refit, and that is fixed.
- **Only Chrome is checked.** The dry run, the demo and the M1.9 acceptance use Chrome, and `03e095655` fixed a
  Chrome-only behaviour of the date input. Firefox and Safari are untested, value entry (Part B step 5) and the spec
  file import (step 8) above all (user, 2026-10-08).
- **A page laid out at zero width stays empty.** Found in M2.4's browser check: when the Cube page first renders in a
  container with no width (the app's browser pane opening), react-reflex warns "Found ReflexContainer with width=0" and
  the graph and grid region keeps zero width, even after the window grows, until the page reloads. Not seen in a
  normal browser tab. Suggested check: whether `CubeEditor`'s resizable layout should re-measure on a resize, or
  render only once its container has a size.
- **Long column names on Postgres (💭, not probed).** A Rename (M2.9) accepts new names of up to 128 code points
  (PLAN §11.4), but Postgres cuts identifiers at 63 bytes, so two long names could collide or be cut once a Postgres
  runtime is in use. Suggested check: plan a rename to a name of 64 bytes or more on Postgres, and lower the cap per
  database if needed.
