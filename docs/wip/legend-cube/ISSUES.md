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

### A GROUP BY written by the alias, which a column of the subquery can shadow

Found in M4's requirements and pinned in M4.8 (plans only, engine `93d92b4`). After `rename(~SHIP_COUNTRY, ~X)` and
`rename(~SHIP_CITY, ~SHIP_COUNTRY)`, a `groupBy(~[SHIP_COUNTRY], …)` selects `"orders_0"."SHIP_CITY" as "SHIP_COUNTRY"`
from a subquery that still has the table's `SHIP_COUNTRY` column. Ten database types are written `GROUP BY` the
expression or the position, which is right; nine (H2, Sybase IQ, MemSQL, Spanner, Redshift, Hive, BigQuery, ClickHouse,
Composite) are written `GROUP BY "SHIP_COUNTRY"`, which a database that looks the name up in the subquery first reads
as the country: MySQL-style MemSQL may then group by country with arbitrary cities, and Postgres-style Redshift or
Hive fail. H2 reads the alias and gives the 70 cities ✅; the others are inferred from their documented rules, never
run. `LegendCubeDialects.engine-roundtrip-test.ts` pins each database's form. Cube has no workaround: a `select` before
the group doesn't change the SQL (the engine folds it in); grouping by a temporary key would. Draft issue for
finos/legend-engine:

```text
Title: groupBy after a rename writes GROUP BY the alias, which a column of the subquery can shadow

`#>{db.S.ORDERS}#->rename(~SHIP_COUNTRY, ~X)->rename(~SHIP_CITY, ~SHIP_COUNTRY)
->groupBy(~[SHIP_COUNTRY], ~[n: x|$x.ORDER_ID : y|$y->count()])` selects
`"orders_0"."SHIP_CITY" as "SHIP_COUNTRY"` from a subquery that still has the table's
`SHIP_COUNTRY`, then writes `group by "SHIP_COUNTRY"` on H2, Sybase IQ, MemSQL, Spanner,
Redshift, Hive, BigQuery and ClickHouse. A database that resolves GROUP BY names against the
FROM clause first groups by the other column. SQL Server, DB2, Oracle and Trino write the
expression and Postgres and Snowflake the position, which are unambiguous; every dialect
could do the same.
```

### Distinct Value of a Boolean writes `max()` over a bit or boolean

Found in M4's requirements (plans only). `uniqueValueOnly()` is written
`case when count(distinct(x)) = 1 then max(x) else null end`; on a Boolean column that is `max()` over a `bit`
(SQL Server, Sybase), which they reject, or over a `boolean` (Postgres), which has no `max`. MemSQL and Oracle convert
the Boolean to text first. Cube offers Distinct Value on Boolean, as the spec does (PLAN §11.5), so such a Group plans
but would fail on those databases (inferred, not run). Draft issue for finos/legend-engine:

```text
Title: uniqueValueOnly() over a Boolean writes max() that SQL Server, Sybase and Postgres reject

`->groupBy(~[K], ~[u: x|$x.B : y|$y->uniqueValueOnly()])` with a Boolean `B` is written
`case when count(distinct("t_0".B)) = 1 then max("t_0".B) else null end`. SQL Server and
Sybase reject MAX over bit, and Postgres has no max(boolean). MemSQL and Oracle already
convert the Boolean to text before max; SQL Server, Sybase and Postgres could do the same,
or use bool_or / a cast to integer.
```

### SQL Server sums an `int` column as `int`

Found in M4's requirements (plans only). `sum()` over an `int` column is written `sum(x)`, which SQL Server types as
`int`: a sum past 2,147,483,647 fails with an arithmetic overflow. The engine and Cube type it `Integer` (PLAN §5.7),
whose range is a Java long. Inferred from SQL Server's typing rules, not run. Draft issue for finos/legend-engine:

```text
Title: SQL Server: sum() over an int column overflows past 2^31

`->groupBy(~[K], ~[s: x|$x.I : y|$y->sum()])` with an `int` column `I` is written
`sum("t_0".I)` on SQL Server, which returns int and fails with an arithmetic overflow once
the sum passes 2,147,483,647, though Pure types the result as Integer (a long). Writing
`sum(cast("t_0".I as bigint))` on SQL Server would match the Pure type.
```

### A window `count()` loses its OVER clause

Found in M5's requirements; run on H2 and planned on every database type again in M5.10 (engine `93d92b4`). In a
window, `count()` types as Integer but is written as a plain aggregate:
`->extend(over(~[SHIP_COUNTRY]), ~[c:{p,w,r|$r.SHIP_REGION}:y|$y->count()])`
plans `count("orders_0".SHIP_REGION) as "c"`, with no OVER, on all 20 database types ✅ (even Spanner, Presto and
Composite, which refuse every other window column). Run on H2, it fails: `Column "orders_1.ORDER_ID" must be in the
GROUP BY list` ✅. `size()` plans `count(x) over (…)`. Cube writes a window's Count and Count Rows with `size()`
(`PartitionEmitter.ts`), and `LegendCubeDialects.engine-roundtrip-test.ts` pins `count(…) over` on the 17 window
types, and no `count(` without OVER in any select but a Group's GROUP BY. Draft issue for finos/legend-engine:

```text
Title: count() in a window extend is written without its OVER clause

`#>{db.S.T}#->extend(over(~[P]), ~[c:{p,w,r|$r.X}:y|$y->count()])` compiles, typed Integer, but
plans `count("t_0".X) as "c"` with no `OVER (Partition By "t_0".P)` on every database type, so it
runs as an aggregate without a GROUP BY and fails (H2: "must be in the GROUP BY list").
`$y->size()` in the same place plans `count("t_0".X) OVER (…)`. count() should keep its window,
as size() does, or fail to compile.
```

### A filter after a single-form window extend runs before the window, or is dropped

Found in M5's requirements; run on H2 and planned on every database type again in M5.10 (engine `93d92b4`). A
filter after an `extend` whose window column is in the single form, `~c:…`, is folded into the window's SELECT:

- On an input column it becomes the window's WHERE, so it runs first:
  `->extend(over(~SHIP_COUNTRY), ~c:{p,w,r|$r.ORDER_ID}:y|$y->size())->filter(r|$r.ORDER_ID < 10252)->filter(r|$r.SHIP_COUNTRY == 'France')`
  counts France's orders as 2, not 77, on H2 ✅ (`CubeWindowIsolation.engine-roundtrip-test.ts` runs the single form
  unbound, 2, and bound by a let, 77; the unbound array form also gives 77 ✅, in a probe), and every one of the 17
  window types plans the WHERE in the window's SELECT ✅.
- On the window column (`->filter(x|$x.c > 100)`) it is written as QUALIFY on 4 types (H2, Snowflake, Databricks,
  DuckDB), refused on 6 (Postgres, MemSQL and Spanner: "QUALIFY grammar is not supported"; Redshift, Hive and
  Composite: "QUALIFY is not supported") and silently dropped, every row returned, on 9 (SQL Server, Sybase, Sybase IQ,
  DB2, Oracle, Trino, BigQuery, Athena, ClickHouse) ✅ (plans). Presto refuses any window.

The array form, `~[c:…]`, plans both filters after the window on all 17 ✅. Cube writes every window in the array form
and binds every Partition that isn't the capture with a `let` (PLAN §8.6, §11.6), whose WITH keeps the filter
outside; the plan-only test pins the WITH, the WHERE outside the window's select and no QUALIFY. Draft issue for
finos/legend-engine:

```text
Title: A filter after a single-form window extend runs before the window, or is dropped

`#>{db.S.T}#->extend(over(~P), ~c:{p,w,r|$r.X}:y|$y->size())->filter(x|$x.Y == 'v')` puts
`where Y = 'v'` in the same SELECT as `count(X) OVER (Partition By P)`, so the window counts only
the filtered rows (H2: 2 instead of 77). With `->filter(x|$x.c > 100)` the predicate becomes a
QUALIFY on H2, Snowflake, Databricks and DuckDB, an error ("QUALIFY ... is not supported") on
Postgres, MemSQL, Spanner, Redshift, Hive and Composite, and disappears from the SQL on SqlServer,
Sybase, SybaseIQ, DB2, Oracle, Trino, BigQuery, Athena and ClickHouse. The array form `~[c:…]`
plans a subselect and is right on all of them; the single form should be too.
```

### A rank with no ORDER BY plans, and fails only on the database

Found in M5's requirements; run on H2 and planned on every database type again in M5.10 (engine `93d92b4`).
`->extend(over(~[SHIP_COUNTRY]), ~[rk:{p,w,r|$p->rank($w,$r)}])` types (`rk` Integer) and plans
`rank() over (partition by …)`, with no ORDER BY, on all 17 window types ✅. Run on H2, it fails as an HTTP 500 with
no source location: `Syntax error in SQL statement "RANK() OVER (PARTITION BY … ORDER BY NULL[*])"; expected
"ORDER BY"` ✅. Other databases weren't run: SQL Server requires an ORDER BY for ranking functions, while Postgres
ranks every row 1 (💭, vendor documentation); `denseRank` and `rowNumber` with no sort weren't probed (💭). Cube
refuses a Rank, Dense Rank or Row Number with no sort before running
(`Aggregation function "<a>" requires at least one sort column.`). Draft issue for finos/legend-engine:

```text
Title: rank() over a window with no sort compiles and plans, then fails in the database

`#>{db.S.T}#->extend(over(~[P]), ~[rk:{p,w,r|$p->rank($w,$r)}])` compiles and plans
`rank() over (partition by P)` with no ORDER BY on every database type with windows. H2 then
fails with a syntax error ("expected ORDER BY") as an HTTP 500 with no source information. A
rank over a window with no sort keys should be a compilation error at the call.
```

### A windowed `count(distinct …)` plans on every database, though some refuse it

Found in M5's requirements; run on H2 and pinned in the plan-only test in M5.10 (engine `93d92b4`).
`->extend(over(~[SHIP_COUNTRY], [~ORDER_DATE->ascending()]), ~[dc:{p,w,r|$r.CUSTOMER_ID}:y|$y->distinct()->size()])`
plans `count(distinct(x)) over (…)`, and `uniqueValueOnly()` plans
`case when count(distinct(x)) over (…) = 1 then max(x) over (…) else null end`, sorted or not, on all 17 window types
✅; H2 runs them (France's running Distinct Count 1, 2, 3, and 10 over the whole partition ✅). At least Postgres, SQL
Server, Databricks and Trino (and so Athena, on Trino) reject DISTINCT in a window aggregate, and Oracle and BigQuery
with an ORDER BY in the window (💭,
vendor documentation; none was run here), so such a query plans and then fails in the database. Cube offers windowed Distinct Count and Distinct Value natively, with an editor note on where
they fail (PLAN §11.6, Q3), and the plan-only test pins each database's form (`WINDOWED_DISTINCT`). Draft issue for
finos/legend-engine:

```text
Title: distinct()->size() and uniqueValueOnly() in a window plan where DISTINCT in a window is rejected

`->extend(over(~[P], [~O->ascending()]), ~[d:{p,w,r|$r.X}:y|$y->distinct()->size()])` plans
`count(distinct(X)) OVER (Partition By P Order By O asc)` on every database type with windows,
and uniqueValueOnly() plans `case when count(distinct(X)) OVER (…) = 1 then max(X) OVER (…)`.
Postgres, SQL Server, Databricks and Trino reject DISTINCT in a window aggregate (Oracle and
BigQuery with an ORDER BY), so the error only comes from the database. Those dialects could
refuse it when planning, with a clear message, as they refuse QUALIFY.
```

### One nested subselect per window column, even inside one extend

Found in M5.5's review and planned again in M5.10 (engine `93d92b4`).
`->extend(over(~[SHIP_COUNTRY]), ~[a:{p,w,r|$r.EMPLOYEE_ID}:y|$y->sum(), b:{p,w,r|$r.ORDER_ID}:y|$y->max(), c:{p,w,r|$r.ORDER_ID}:y|$y->min()])->limit(1001)`
plans three nested selects, each computing one window column over the select inside it, on H2, Postgres and SQL
Server ✅. With nothing after the extend it is one select with three OVER clauses ✅; a filter after it, or a `let`
that binds it, nests it the same way ✅. The rows are right, but a Partition of N functions is N levels deep, each
selecting every column again, and a Partition of a Partition adds its own. Cube has no workaround: a run always ends
with a limit, so every Partition nests. `LegendCubeDialects.engine-roundtrip-test.ts` pins one select with an OVER per
window column on H2. Draft issue for finos/legend-engine:

```text
Title: A window extend of several columns plans one nested subselect per column

`#>{db.S.T}#->extend(over(~[P]), ~[a:{p,w,r|$r.X}:y|$y->sum(), b:{p,w,r|$r.X}:y|$y->max(),
c:{p,w,r|$r.X}:y|$y->min()])->limit(10)` plans three nested selects with one OVER each, though
the three columns share one window and none reads another. Without the limit it is one select
with three OVER clauses. The columns of one extend could stay in one select whatever follows it.
```

## Direct connections, data products and ingest data sets

### The engine's schema exploration mistypes some columns

On H2 and DuckDB, `DECIMAL(10,2)` comes back as `Numeric(0,0)`; on DuckDB, `VARCHAR(5)` comes back as `Varchar(0)`. Cube keeps the
engine's types (precision isn't enforced in Cube), and no test asserts them. An engine issue to file.

### The source dialog's lists show no hover, and hide the picked row under the pointer

Found while recording the sources demo (2026-10-09), on Legend Query's light theme. The lists of the "Add a source"
dialog's tabs (tables in the Model and Database connection tabs, products and access points in the Data product tab)
paint a hovered row with `--color-bg-hover`, which is the dialog body's own grey (`#edf0f1`), so hovering shows
nothing. The hover style also wins over the picked row's `--color-bg-selected` (`#def3ff`), so the row just clicked
looks unpicked until the pointer leaves it. Suggested fix: apply the hover background only to rows that aren't picked,
and give hover a color that differs from the dialog body. Low; no behavior is wrong.

### Engine errors can echo setup SQL

A failed exploration's message may quote the connection's setup SQL. Cube shows the first line and the rest on demand,
in the tab only; it never logs it.

### Data products can't run on the open-source engine

The open-source engine rejects every data product construct (`#P`, a LakehouseRuntime with an environment and a
warehouse), so data product runs are tested with fakes and, on the engine, with stand-in functions only. The first
real run is in an internal deployment (Part B2).

### Re-checking saved data product sources

An import and Refresh read a data product cube's access points again from the deployed artifact at the cube's saved
version. An import uses the artifact this page visit already read, and Refresh reads it again, so a SNAPSHOT version
redeployed meanwhile shows on Refresh. A redeployed product never moves a cube to another version.

### Listing data products

- **The lite list:** Cube pages the lakehouse's lite list itself and stops on a page that isn't one, a missing or
  repeated cursor, or past 50 pages. The lakehouse client takes no abort signal, so closing the dialog stops further
  pages but not the page already asked for.
- **Marketplace search** (when Query's `marketplace.serverUrl` is set) reads one page of 100 matches. On a cube whose
  data products are fixed to one project, a typed search keeps that page's rows from the project, so it can show few of
  them; the cube's own products show when the search is empty.

### Ingest data sets can't be read or run on the open-source engine

The open-source engine can't parse an ingest definition's grammar and can't type or run `#I{…}#`, so ingest data sets
are tested with a fake catalog and, on the engine, with stand-in functions only (testing.md). The ingest servers'
answers, the parse of a real definition, the environment name and the warehouse are first checked in an internal
deployment (PLAN §11.2 Part B2).

### Ingest definitions: what Cube leaves out for now

- **No project version.** A definition is read from the ingest server by URN, through its grammar and the engine's
  parse, as Data Cube does. Cube doesn't know the version it was deployed from; reading it from Depot at that version
  is the TODO (PLAN §6.7).
- **Only SDLC-deployed definitions** (`alloy-git` URNs) are listed; ad hoc (`rest-api`) ones, and producers' own
  user-id environments, are left out. The tab counts the definitions it doesn't show.
- **Materialized views** (a data set whose source is a function) are listed disabled.
- **A data set re-checked on import** keeps its saved columns, with a warning, when its definition can't be read again
  (e.g. no longer deployed).

## Depot databases

- **Scale is unmeasured.** The project list isn't paged and has no search, and a version's first typing call compiles
  the project with its dependencies. Neither was measured at a real depot's size.
- **The mock copies Studio's depot client.** The real depot's answers for versions (`snapshots=false`), `latest` and
  its wrappers weren't checked in a deployment.
- **No CI test sends a pointer:** CI runs no depot. The `cube-local` group does, by hand.
- **The engine caches a pointer's project per version,** so a sample project changed under the same version needs an
  engine restart (local only: a published release doesn't change).

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
  database if needed. Group's auto-names, `<column> <function>`, reach the limit with no name typed (M4.15, plans
  only): from a 53-byte column, Distinct Count and Distinct Value share their first 63 bytes; from 61 bytes, Min and
  Max do too; from 62 bytes, every aggregation of the column. Cube accepts both names and the engine passes them on,
  so Postgres would reject a Sort on either after the Group ("ORDER BY … is ambiguous") and a Concat's outer select
  ("column reference is ambiguous"); a Filter, Limit or select after the Group is unaffected. A per-database cap on
  Rename's names wouldn't cover this: a guard has to check every derived output name, a Group's included, and only
  when the runtime's database is Postgres (the names run on H2).
