# Legend Lite Deep Dive

What legend-lite is, how it compiles Pure, generates SQL and executes queries compared with legend-engine, and how its new Legend Query and DataCube compare with the ones in legend-studio.

> **Read at:** neema2/legend-lite `16c8120` (Oct 2026). **Compared against:** legend-studio `76b80a4b3` (Oct 2026) and a local legend-engine checkout `b90b8b03e1` (Apr 2026).
>
> A styled version of this page is in [`legend-lite-deep-dive.html`](./legend-lite-deep-dive.html).

## Contents

1. [What legend-lite is](#1-what-legend-lite-is)
2. [How it compares to legend-engine](#2-how-it-compares-to-legend-engine)
3. [Compilation](#3-compilation)
4. [SQL generation](#4-sql-generation)
5. [Execution](#5-execution)
6. [Compatibility and testing](#6-compatibility-and-testing)
7. [Legend Query: gap analysis](#7-legend-query-gap-analysis)
8. [DataCube: gap analysis](#8-datacube-gap-analysis)
9. [DataCube features to add to yours](#9-datacube-features-to-add-to-yours)
10. [Questions worth asking Neema](#10-questions-worth-asking-neema)
11. [How this was checked](#11-how-this-was-checked)

## The short version

- **legend-lite is a clean-room rewrite of legend-engine's query path in plain Java 21.** It parses Pure with a hand-written parser, type-checks in Java, and compiles every query to a single SQL statement that runs inside the database. Engine, by contrast, runs Pure-written plan generation on the legend-pure runtime and may finish work in the JVM.
- **It is built to be wire-compatible with engine:** it serves the same `/api/pure/v1` endpoints, so a client written for engine (Query, DataCube) can point at it. Its parser emits byte-identical protocol JSON for its 22,725-element test corpus.
- **The big architectural move:** the same planner is compiled to WebAssembly (TeaVM), so the Query and DataCube apps can plan in the browser and run on DuckDB-WASM in the tab, with no server.
- **Scope is narrow but deep:** relational only, on DuckDB, H2, Postgres and SQLite. Engine's ~20 database extensions and its non-relational stores (service store, Mongo, Elastic, flat-data…) are parse-only in lite.
- **The Query app is days old (v1: 2026-10-01) and about 6.6K lines**, against roughly 180K for yours. It covers the core build/run/save loop. It has none of the enterprise surface: Depot projects, data products, Lakehouse, services, lineage, entitlements, AI chat.
- **The DataCube is the more interesting one.** It ships working versions of several features that are greyed-out _WIP_ placeholders in yours (heatmap, plot, treemap, selection stats, HTML/PDF export), plus charts, dashboards, drill-through, an OLAP ad-hoc mode and share links.

| Measure                                                                               | Value                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Lines of Java in legend-lite `core/src/main/java`                                     | 221K (README quotes ~120K for the compiler packages alone) |
| `.java` · `.pure` files in the legend-engine checkout (excl. `target/`)               | 5,763 · 2,881                                              |
| ANTLR `.g4` grammars: legend-lite vs legend-engine                                    | 0 vs 154                                                   |
| Lines of TS+CSS: lite DataCube vs `legend-data-cube` + `legend-application-data-cube` | ~49K vs ~50K                                               |

## 1. What legend-lite is

The README describes it as "a clean-room reimplementation of the FINOS Legend Engine in modern Java 21". In practice it reimplements the slice of engine that takes a Pure model and a query and returns rows: parsing, compiling, mapping resolution, SQL generation and execution. It was built as a _strangler fig_. An older implementation (`engine/`, package `com.gs.legend`) was replaced by `core/` (package `com.legend`), and `docs/GATES.md` records that the old module was deleted on 2026-08-11.

The repo is unusual in how much of its process is written down: 318 files in `docs/` (audits, homework, plans, burndowns), an `AGENTS.md` of architectural invariants, and Bazel "gates" that every change must pass. It reads as a project built largely with AI agents under tight rules. For example: no fallbacks, no `default ->` in sealed switches, and the frontend does all typing.

| Module                                              | What it is                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core/`                                             | The compiler and runtime: lexer → parser → typer → store resolver → lowerer → SQL dialects → JDBC executor, plus the HTTP server (`com.legend.server`), LSP and diagram service. 1,058 Java files.                                               |
| `wasm/`                                             | The planner (`planner.Wasm`) compiled ahead of time by TeaVM to a WebAssembly-GC module, with differential tests holding it to the JVM's answers.                                                                                                |
| `warehouse/`                                        | A small multi-user SQL server over native DuckDB (and attachable Postgres catalogs), with sign-in tokens and per-user history. DataCube's "Live" plane; also the `bazel run //datacube:app -- postgresql://…` developer path.                    |
| `datacube/`                                         | A DataCube rewritten in plain TypeScript and DOM (no React), using ECharts, DuckDB-WASM and fflate. ~49K lines, 221 TS files.                                                                                                                    |
| `query/`, `query-store/`, `pure-protocol/`          | Legend Query rebuilt the same way (~6.6K lines), a saved-query store with the engine's `/pure/v1/query` contract, and a TS library for V1 protocol JSON.                                                                                         |
| `pct/`, `parser-equivalence/`, `spec/`, `projects/` | Compatibility harnesses. These are the upstream Pure Compatibility Tests run per database, byte-parity with engine's parser, the relational test corpus ported from engine, and ~55 synthetic finance projects used as a realistic model corpus. |
| `tools/`, `experiments/`, `repro/`                  | Census and scoreboard scripts, the release-bump tool, TeaVM rules, spikes.                                                                                                                                                                       |

Everything builds with Bazel (`bazel test //...`). The legend-engine / legend-pure release used as the "spec" is pinned by sha256 in `MODULE.bazel`, and the tests read upstream sources as declared inputs.

## 2. How it compares to legend-engine

The core difference is **where the language lives**. In legend-engine, Pure is metacircular: the compiler builds a legend-pure M3 graph (`PureModel.java`), and plan generation and SQL generation are themselves written in Pure. Examples are `core_relational/relational/pureToSQLQuery/pureToSQLQuery.pure` and the per-database `sqlQueryToString/dbExtension.pure`, which are compiled to Java by legend-pure. An `ExecutionPlan` is produced as data and executed node by node by `PlanExecutor`. In legend-lite, every phase is ordinary Java over sealed records, and there is no Pure interpreter in the loop.

| Dimension             | legend-engine                                                                                                                                       | legend-lite                                                                                                                                                       | Why it matters                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parsing               | ANTLR4: 154 `.g4` files in the checkout, walked into V1 protocol (`PureModelContextData`)                                                           | Hand-written recursive descent (`parser/ElementParser`, `SpecParser`); no ANTLR anywhere                                                                          | Lite is far smaller and faster to start, but every grammar extension must be hand-ported. It keeps parity by diffing JSON against engine.                                                |
| Compilation / typing  | `PureModel` + `CompileContext` + per-element handlers build a legend-pure M3 graph; function typing is driven by Pure's own metamodel               | `PureModelContext.from` builds typed records; `SpecCompiler` with ~70 per-construct checkers and an `InferenceKernel` types queries into a sealed `TypedSpec` HIR | Lite's typing is explicit, testable Java. The trade-off is that each native function's typing rule is hand-written, where engine gets it from the Pure signature.                        |
| Plan & SQL generation | Written in Pure (router, `pureToSQLQuery.pure`, `dbExtension.pure` per DB), compiled to Java                                                        | Java: `StoreResolver` (mapping → physical), `Lowerer` (→ dialect-free SQL tree), `SqlDialect.render`                                                              | Lite has a single "fold" authority that decides when a SELECT can be extended or must be nested, which keeps SQL flat. Engine's SQL gen is extensible in Pure but much harder to follow. |
| Execution             | `PlanExecutor` runs a tree of `ExecutionNode`s: SQL nodes, TDS/relation instantiation, graph-fetch nodes, in-memory and Java-codegen platform nodes | `exec/Executor` runs one SQL statement over JDBC. Graph fetch and M2M are compiled to SQL that builds JSON (`json_object`, `json_group_array`)                    | "100% push-down" is the design rule: no rows are processed in the JVM. Graph results are built by the database and streamed through as bytes.                                            |
| Databases             | ~20 relational extensions (Snowflake, Databricks, BigQuery, Postgres, SQL Server, Sybase, Oracle, Trino, Spanner, DuckDB, H2…)                      | DuckDB (primary), H2, Postgres (added Oct 2026), SQLite; plus "engine-style" renderers used to match engine's SQL text in tests                                   | Lite is not a drop-in for GS production stores today.                                                                                                                                    |
| Other stores          | Service store, flat-data, Mongo, Elastic, external formats, persistence, function activators, GraphQL, SQL-to-Pure…                                 | These grammars _parse_ (for parser parity) but none execute. The keywords appear only in `lexer/`, `parser/`, `model/` and `protocol/`                            | Lite is relational-only.                                                                                                                                                                 |
| Extension model       | ServiceLoader extensions across 50+ `xts-*` module families                                                                                         | Closed: sealed hierarchies, dialect classes, `DialectCapability` flags. ArchUnit enforces 23 dependency rules                                                     | Lite favours exhaustiveness checks over pluggability.                                                                                                                                    |
| Milestoning           | Full (business/processing/bitemporal)                                                                                                               | Supported in the resolver (`resolver/TemporalContext`, `TemporalFrame`)                                                                                           | Present, with less battle-testing.                                                                                                                                                       |
| Runtime footprint     | Large Dropwizard server, hundreds of jars                                                                                                           | JDK `HttpServer`; one deploy jar; the core compiles against no jar, with exactly three JDBC drivers. The same planner also runs as WASM in a browser              | Lite can run on a laptop or in a browser tab.                                                                                                                                            |

### Engine endpoints lite serves

From `core/…/server/LegendHttpServer.java` and `PureV1Api.java`: `grammar/grammarToJson/{lambda,model}`, `grammar/jsonToGrammar/lambda` (+batch), `compilation/{compile,lambdaRelationType,lambdaReturnType}`, `execution/{generatePlan,execute}`, the `/pure/v1/query` saved-query store, `server/v1/currentUser`, plus `/lsp`, `/engine/diagram` and `/health`. The model travels as text (`{"_type":"text","code":…}`). It does **not** serve SDLC, Depot, data space analytics, mapping coverage analytics or the other analysis endpoints your Query app calls (the design doc lists them as G6 and G9, "not added").

## 3. Compilation

One driver, `com.legend.Compiler`, owns the order of eleven phases. Phases A–F run once per model and produce a `ModelContext`. Phases G–K run once per query. The table below is the order from `core/README.md`.

| Phase         | Step             | What happens                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**  |                  |                                                                                                                                                                                                                                                                                                                                                           |
| A             | Lex              | `Lexer.tokenize`: text → `TokenStream` (int arrays internally; JDK-only package)                                                                                                                                                                                                                                                                          |
| B             | Parse elements   | `ElementParser`: classes, enums, associations, functions, databases, mappings, runtimes, connections and services become sealed `PackageableElement` records named after engine's protocol classes. Function bodies and derived properties are parsed eagerly into value specs.                                                                           |
| C             | Parse specs      | `SpecParser`: expressions become `LambdaFunction`, `AppliedFunction`, `ColSpec`, `GraphFetchTree`… (engine names, verbatim)                                                                                                                                                                                                                               |
| D             | Resolve names    | `NameResolver.resolve`: imports and simple names become fully qualified paths against the platform prelude                                                                                                                                                                                                                                                |
| E             | Normalize        | `ModelNormalizer`: the key design move. **Mappings are desugared into synthesized Pure functions**, so a class mapping becomes "a function that returns this class's rows". The legacy mapping DSL then flows through the same machinery as user functions.                                                                                               |
| F             | Compile elements | `PureModelContext.from`: typed `TypedClass`, `TypedMapping`, `TypedDatabase`… Elements reference each other by FQN string, not live pointers, so loading stays lazy. Function bodies are _not_ type-checked here; they are checked on demand.                                                                                                             |
| **Per query** |                  |                                                                                                                                                                                                                                                                                                                                                           |
| G             | Compile spec     | `SpecCompiler` / `Typer` dispatches each native to a checker (`FilterChecker`, `GroupByChecker`, `OverChecker`, `PivotChecker`, `GraphFetchChecker`…). Each returns a typed node with its type, multiplicity and, for relations, a column schema (`RelationType`). Overloads resolve in `Overloads`; lambda parameters are inferred in `InferenceKernel`. |
| G½            | Inline           | `UserCallInliner`: β-inlines user function calls so the backend never sees a user call                                                                                                                                                                                                                                                                    |

The rule that gives the design its shape is **"the frontend does all typing."** If a type is missing downstream, the fix goes in the frontend. The lowerer may not infer anything. Errors carry a phase (`PARSE, RESOLVE, NORMALIZE, MODEL, TYPE, MAPPING, LOWER, EXECUTE`) rather than a stack of Pure frames.

Compared with engine: engine's `PureModel` compiles everything (including function bodies, via `buildPureFunctions`) into a mutable M3 graph. Lite's README explicitly calls that out as a violation it does not carry forward.

## 4. SQL generation

| Phase       | Step             | What happens                                                                                                                                                                                                                                                                                    |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Midend**  |                  |                                                                                                                                                                                                                                                                                                 |
| H           | Store resolution | `StoreResolver` rewrites the logical query against the mapping: class sources, property substitution, association joins, navigation trees (`NavMaterializer`), graph-fetch emission, milestoning context. Its post-condition is enforced: no `TypedGetAll` or user call may survive this phase. |
| I           | Lowering         | `Lowerer` turns `TypedSpec` into a sealed, dialect-free SQL tree (`sql/SqlQuery`, `SqlSelect`, `SqlExpr`). It is helped by `Scalars`, `Aggregates`, `Windows`, `Pivots`, `JsonEmission` and, importantly, `Fold`.                                                                               |
| **Backend** |                  |                                                                                                                                                                                                                                                                                                 |
| J           | Render           | `SqlDialect.render` is the only place SQL text exists: `AnsiSqlRenderer` → `DuckDb`, `H2`/`H2Modern`, `Postgres`, SQLite via `Lexicon`, plus capability adapters (`QualifyToSubselect`, `LateralExplodeToUnion`, `FoldToListReduce`…)                                                           |

### The "fold" rule keeps SQL flat

`lowering/Fold.java` is the single authority for one question: can this pipeline step extend the current SELECT, or must the current SELECT be wrapped as a subquery first? The answer comes from SQL's fixed evaluation order (FROM → WHERE → GROUP BY → HAVING → window → QUALIFY → SELECT → DISTINCT → ORDER BY → LIMIT). For example, a filter after a limit doesn't commute, so it isolates. The file notes that engine's plan generation re-derived this per operator and drifted. The golden tests in `lowering/LowerRelationTest.java` show the result:

```
// Pure
#>{test::DB.T_PERSON}#
  ->filter(x|$x.AGE > 20)
  ->groupBy(~FIRM, ~total : x|$x.AGE : y|$y->sum())
```

```sql
-- DuckDB: one SELECT
SELECT t0.FIRM, SUM(t0.AGE) AS total
FROM T_PERSON AS t0
WHERE t0.AGE > 20
GROUP BY t0.FIRM
```

```sql
-- filter → select → sort → limit also folds into ONE flat SELECT
SELECT t0.NAME, t0.AGE FROM T_PERSON AS t0
WHERE t0.AGE > 30 ORDER BY t0.AGE DESC NULLS FIRST LIMIT 2
```

### Mappings, associations and graph fetch

- **Associations:** to-one and to-many navigation in `project` become `LEFT OUTER JOIN`s. In `filter` they become `WHERE EXISTS (…)`, which avoids row explosion. Self-joins are aliased.
- **Model-to-model:** because mappings are synthesized functions (phase E), an M2M chain A→B→C→table substitutes down to a single relational query. Engine would typically run part of this in memory.
- **Graph fetch:** the entire object tree is one SQL statement of correlated subqueries building JSON (`json_object` for to-one, `json_group_array` for to-many, any depth). In "snapshot" mode the database returns one row holding the whole JSON array. In "streaming" mode it returns one `json_object` per row, and the executor writes the bytes straight through (`StreamingIntegrationTest.java:440-450`).

## 5. Execution

A request to `POST /api/pure/v1/execution/execute` carries the model as text and a lambda. It is parsed and compiled through phases A–J, and the SQL runs over the connection that the runtime names (`->from(runtime)` or a runtime pointer in the request). Parameters arrive as engine's `parameterValues` and are bound as `let`s. `generatePlan` returns an engine-shaped plan carrying the SQL. In lite the plan is a single SQL envelope (`plan/QueryPlan`, `PlanText`), not a tree of heterogeneous nodes.

**Three execution planes**

- **In the tab:** the WASM planner runs in a Web Worker and writes the SQL. DuckDB-WASM in the same tab executes it. No server at all; saved queries go to IndexedDB.
- **Warehouse:** SQL goes to the native DuckDB/Postgres warehouse as the signed-in user, with per-user history.
- **Server:** legend-lite's JVM server (or, by design, real legend-engine) plans and executes.

**WASM planner**

- `planner.Wasm` is compiled by TeaVM; `planner.JvmMain` calls the same class on the JVM.
- Differential tests compare WASM answers to JVM answers on every push, including refusals and the timezone database.
- Failure is a return value (`"OK\n"+sql` or `"ERR\n"+class+message`) to avoid TeaVM exception bridging.

**Receipts.** Every plane issues a receipt per query (`datacube/src/receipt.ts`) saying which engine ran it, the SQL, and the warehouse's own statement id. It is evidence of where a query actually ran, rather than the tab describing itself.

## 6. Compatibility and testing

> **These numbers come from the repo's own docs.** I didn't run the Bazel gates. `core/README.md` says to regenerate rather than quote, and the figures below are dated.

| Harness            | What it checks                                                                                | Reported result                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Parser equivalence | Lite's parser vs engine's ANTLR parser, byte-identical protocol JSON                          | 22,725 / 22,725 elements; 43/43 rejection parity (README, 2026-08-06)                    |
| PCT on DuckDB      | Upstream Pure Compatibility Tests, five suites                                                | 1,109 run / 36 ledgered / 0 skipped (2026-08-06)                                         |
| PCT on H2          | Relation suite on H2 2.4.240                                                                  | 469 tests, 26 expected failures, each pinned by message (GATES.md, 2026-10-02)           |
| PCT on Postgres 16 | All five suites, embedded Postgres                                                            | 1,249 tests; expected failures driven from 267 down to 112 over the last week of commits |
| Relational corpus  | Engine's relational tests, ported                                                             | 2,575 run / 2,298 pass (2026-08-06)                                                      |
| WASM differential  | Browser planner = JVM planner                                                                 | Gated in CI                                                                              |
| Browser lane       | Playwright drives the DataCube and Query sites, live warehouse vs snapped DuckDB-WASM answers | Linux CI                                                                                 |

## 7. Legend Query: gap analysis

Lite's Query (`query/`) was designed on 2026-09-30 and shipped v1 on 2026-10-01. It deliberately mirrors your look and routes (legend-art tokens, the same icons, `/edit/:id`, `/extensions/dataspace/…`). Its builder emits V1 lambda JSON, never Pure text, and is round-trip tested against the WASM parser. It is about 6.6K lines of plain TypeScript. Your `legend-application-query` and `legend-query-builder` together are about 181K.

**Key:** 🟧 **Yours only** — legend-studio has it, lite doesn't · 🟩 **Lite only** — lite has it, yours doesn't · 🟪 **Differs** — both, materially different · ⬜ **Parity** — both, broadly equivalent

| Area                                                |               | legend-studio (yours)                                                                                                                                                                    | legend-lite                                                                                                                                                          |
| --------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execution location                                  | 🟩 Lite only  | Always legend-engine                                                                                                                                                                     | Configurable per page: WASM planner + DuckDB-WASM in the tab with no server, the warehouse, or a server (`query/demo/config*.json`, `src/backend/browser-engine.ts`) |
| Model source                                        | 🟧 Yours only | Depot/SDLC projects by GAV, versions, `latest`/snapshot                                                                                                                                  | `.pure` files sent as text; Depot listed as M3 "todo"                                                                                                                |
| Data products, Lakehouse, ingest                    | 🟧 Yours only | Data product query creator, Lakehouse producer/consumer, ingest flows (`legend-application-query/src/components/data-product`, `ingest`)                                                 | Out of scope by design                                                                                                                                               |
| Services                                            | 🟧 Yours only | Clone service query, load project service, update service query, productionizer (`CloneQueryServiceSetup.tsx`, `QueryProductionizerSetup.tsx`, `UpdateExistingServiceQuerySetup.tsx`)    | Opens a service's query to run; no productionizing                                                                                                                   |
| Data space                                          | 🟪 Differs    | Full viewer powered by engine's data space analytics endpoint                                                                                                                            | Viewer built by reading the model client-side (description, contexts, docs, quick start); no analytics endpoint (G9)                                                 |
| Explorer                                            | 🟪 Differs    | Property tree, derived/qualified props, subtypes, search, preview, **mapped-only via model coverage**                                                                                    | Same tree, derived and subtype nodes, preview data, property search (partial); no mapped-only filter (G6)                                                            |
| Projection, filter, post-filter, OLAP               | ⬜ Parity     | Full                                                                                                                                                                                     | Projection columns, AND/OR filter tree with exists, post-filter, window functions, derivation columns                                                                |
| Aggregation                                         | ⬜ Parity     | Count, distinct, sum, avg, min, max, std dev, percentile, joinStrings, wavg                                                                                                              | Same set; percentile and wavg were added after v1                                                                                                                    |
| Parameters, constants, milestoning                  | ⬜ Parity     | Full, including bitemporal and propagation                                                                                                                                               | Present (`builder/milestoning.ts`, `ui/constants.ts`, `ui/params.ts`); newer and less tested                                                                         |
| Watermark, calendar aggregation, functions explorer | 🟧 Yours only | Yes                                                                                                                                                                                      | Not present (M3 "todo")                                                                                                                                              |
| Text mode & unsupported queries                     | ⬜ Parity     | Pure editor, form↔text round trip, unsupported-query editor                                                                                                                             | Show/edit Pure, parse back to the form, run/save unsupported queries                                                                                                 |
| Results grid                                        | 🟪 Differs    | AG Grid TDS result with cell actions, keyboard shortcuts and CSV export behind a data-leakage attestation (`legend-query-builder/src/components/result/QueryBuilderResultPanel.tsx:329`) | Virtualized plain grid (sort, copy, Filter By/Out, CSV), plus a one-click **Grid \| DataCube** switch that embeds DataCube over the same query                       |
| Plan view                                           | 🟧 Yours only | Execution plan tree + SQL viewer (`legend-query-builder/src/components/execution-plan`)                                                                                                  | Executed SQL only                                                                                                                                                    |
| Saved queries                                       | 🟪 Differs    | Engine query store                                                                                                                                                                       | Same `/pure/v1/query` contract, backed by IndexedDB (no server) or lite's server; create/save as/rename/delete/history/diff/undo                                     |
| Lineage, entitlements / data access, SQL playground | 🟧 Yours only | Yes (`components/lineage`, `data-access`, `sql-playground`)                                                                                                                              | No                                                                                                                                                                   |
| AI                                                  | 🟧 Yours only | Query agent chat (`legend-query-builder/src/components/QueryAgentChat.tsx`)                                                                                                              | No                                                                                                                                                                   |
| Extensibility & telemetry                           | 🟧 Yours only | Plugin system (`QueryBuilder_LegendApplicationPlugin_Extension`), telemetry                                                                                                              | None; one app, no plugin points                                                                                                                                      |
| Footprint                                           | 🟩 Lite only  | React/MobX, graph manager, full Legend graph in the browser                                                                                                                              | Static site; no framework; builds in seconds; runs offline                                                                                                           |

**Takeaway:** lite's Query isn't a threat to yours on features. It covers the core "pick a source, build, run, save" loop and none of the GS-specific surface. Its interesting idea is the **no-server plane**: typing, plan and "show SQL" are instant because they run in the tab.

## 8. DataCube: gap analysis

Lite's DataCube started as a port of yours. Its own census (`datacube/docs/UPSTREAM_CENSUS.md`, 2026-09-25) reads your source file by file, then went past it. It replaces AG Grid with its own virtualized grid (`grid/grid.ts`) and React/MobX with plain classes, and adds ECharts for charts. Each row below was checked in both codebases.

| Area                   |               | legend-studio (yours)                                                                                                                                                 | legend-lite                                                                                                                                                                                                                         |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts (plot, treemap) | 🟩 Lite only  | "Show Plot…" and "Show TreeMap…" menu items exist but are disabled WIP (`legend-data-cube/src/stores/view/grid/DataCubeGridMenuBuilder.tsx:1133-1143`)                | Bar, line, scatter, pie, heatmap, treemap via ECharts. A chart is the cube's own query regrouped, so the database aggregates. Clicking a mark filters the grid (`datacube/src/chart-spec.ts`, `chart-render.ts`, `chart-option.ts`) |
| Dashboards             | 🟩 Lite only  | None                                                                                                                                                                  | A board of tiles on a snap grid (drag, resize, keyboard) holding a grid and charts. Charts follow the grid or are frozen; "Open in grid" edits a chart's grouping (`layout/board.ts`, `layout/tile-layout.ts`, `page/cube-page.ts`) |
| Heatmap                | 🟩 Lite only  | Menu entry is disabled WIP (`DataCubeGridMenuBuilder.tsx:1111`)                                                                                                       | Per-column heatmap in the column menu and column editor                                                                                                                                                                             |
| Selection statistics   | 🟩 Lite only  | Config flag exists; the checkbox is `disabled` with a WIP badge (`components/view/editor/DataCubeEditorGeneralPropertiesPanel.tsx:240-248`)                           | Working; the selection is a rectangle of cells, not rows, so it fits pivots (`datacube/src/selection.ts`)                                                                                                                           |
| Drill-through          | 🟩 Lite only  | Double-click drills down the dimensional tree in multidimensional mode only (`stores/view/grid/DataCubeGridState.ts:323`)                                             | Double-click a number to see the rows behind it (`drillLambda` in `datacube/src/query.ts`, `app.ts`)                                                                                                                                |
| OLAP ad-hoc mode       | 🟪 Differs    | Multidimensional grid mode, marked WIP: drill-down/drill-out over a dimension tree (`DataCubeEditorDimensionsPanel.tsx:619`)                                          | Full Essbase-style ad-hoc analysis: Zoom In (next/all/bottom level), Zoom Out, Keep Only, Remove Only, pivot to POV, member selection dialog (`datacube/src/adhoc/*`, `datacube/docs/AD_HOC_ANALYSIS.md`)                           |
| Aggregates             | 🟩 Lite only  | sum, avg, count, min, max, uniq, first, last, var, std, strjoin; `median` and `wavg` are commented out (`stores/core/DataCubeQueryEngine.ts:176-205`)                 | Adds median, weighted average (with a weight column), min/max on dates and text (`datacube/src/ui/panel-column.ts:75-81`)                                                                                                           |
| Export formats         | 🟪 Differs    | CSV, Excel (via AG Grid `exportDataAsExcel`); HTML, Plain Text, PDF, Specification and all Email entries are WIP (`DataCubeGridMenuBuilder.tsx:560-655`)              | CSV, real OOXML `.xlsx` with typed cells, number formats, merged frozen headers; aligned plain text; hand-written PDF; HTML (`export-xlsx.ts`, `export-doc.ts`, `export-rich.ts`)                                                   |
| Sharing                | 🟪 Differs    | Saved cubes in the engine query store, opened by id                                                                                                                   | Same store contract, _plus_ a share link that carries the whole page (query, config, charts, layout) deflated into the URL fragment, with no server (`share/link.ts`, `share/link-p1.ts`)                                           |
| Save format            | 🟧 Yours only | Canonical `PersistentDataCube` / `DataCubeSpecification` in the engine query store (`legend-application-data-cube/src/stores/builder/LegendDataCubeBuilderStore.tsx`) | Uses the same record and endpoints, but the `content` is its own `CubeDocument`, so it can't open your specs (`cube-store.ts`)                                                                                                      |
| Local cache / snapshot | 🟪 Differs    | `CachedDataCubeSource` + DuckDB plumbing; the grid's Cache toggle is WIP (`components/view/grid/DataCubeGrid.tsx:367`)                                                | "Snap mode": freeze the rows behind the view into DuckDB-WASM and keep a stable, timestamped denominator for reconciling numbers (`snap.ts`)                                                                                        |
| JSON columns           | 🟩 Lite only  | None found                                                                                                                                                            | Infers a Variant column's shape and offers each field (and array counts, first values) as a generated calculated column (`json-shape.ts`, `ui/json-fields.ts`)                                                                      |
| Sources                | 🟪 Differs    | Legend query, user-defined function, freeform TDS, local CSV, Lakehouse producer/consumer (`legend-application-data-cube/src/stores/builder/source/*`)                | CSV, Parquet, remote https/s3 Parquet and Iceberg, warehouse and Postgres tables, Legend queries, samples; no Lakehouse or Depot                                                                                                    |
| Execution              | 🟪 Differs    | Pure → legend-engine (DuckDB only for local files and cache)                                                                                                          | Three planes; planning in the tab via WASM; per-query receipts                                                                                                                                                                      |
| Undo/redo              | ⬜ Parity     | `DataCubeSnapshotService.undo/redo` with keyboard bindings (`components/DataCube.tsx:67-75`)                                                                          | Undo covering every action, with keyboard shortcuts                                                                                                                                                                                 |
| Embedding              | 🟧 Yours only | A library embedded by Query, Studio, REPL and Marketplace; extensible engine abstraction (`DataCubeEngine`)                                                           | A standalone app, also embedded by lite's Query                                                                                                                                                                                     |
| Code editor            | 🟧 Yours only | Engine-backed typeahead in calculated-column editors (`getQueryTypeahead`)                                                                                            | Its own in-scope completion list                                                                                                                                                                                                    |
| Accessibility          | 🟩 Lite only  | AG Grid defaults                                                                                                                                                      | ARIA treegrid with full keyboard navigation                                                                                                                                                                                         |

## 9. DataCube features to add to yours

Ranked by value for effort. Effort assumes your architecture: MobX stores, the `DataCubeEngine` abstraction, AG Grid Enterprise, `LayoutService` windows, and legend-engine as the backend. Several of these fill slots your code has already reserved as WIP menu items.

| #   | Feature                                                                                   | Effort | Engine change?         |
| --- | ----------------------------------------------------------------------------------------- | ------ | ---------------------- |
| 1   | [Selection stats](#1-selection-stats)                                                     | S      | No                     |
| 2   | [Median and weighted average](#2-median-and-weighted-average)                             | S–M    | Check engine functions |
| 3   | [Column heatmap](#3-column-heatmap)                                                       | M      | No                     |
| 4   | [Drill-through to the rows behind a number](#4-drill-through-to-the-rows-behind-a-number) | M      | No                     |
| 5   | [Charts: plot and treemap](#5-charts-plot-and-treemap)                                    | M–L    | No                     |
| 6   | [The WIP exports](#6-the-wip-exports-html-plain-text-pdf-and-a-better-excel)              | M      | No                     |
| 7   | [Share link in the URL](#7-share-link-in-the-url)                                         | M      | No                     |
| 8   | [Snap mode](#8-snap-mode)                                                                 | M–L    | No                     |
| 9   | [JSON field explorer](#9-json-field-explorer)                                             | M      | Needs Variant support  |
| 10  | [Dashboards](#10-dashboards)                                                              | L      | No                     |
| 11  | [OLAP ad-hoc analysis mode](#11-olap-ad-hoc-analysis-mode)                                | XL     | No                     |

### 1. Selection stats

- **Why:** select a block of cells and see sum, average, count, min and max in the status bar, as in Excel. Users notice this immediately.
- **In lite:** `datacube/src/selection.ts` models the selection as a cell rectangle (not rows) and computes stats as pure functions over the visible leaf columns.
- **Yours today:** `showSelectionStats` is already in `DataCubeConfiguration.ts:282`; the checkbox is disabled (`DataCubeEditorGeneralPropertiesPanel.tsx:246`).
- **How:** enable the flag. Listen to AG Grid's `rangeSelectionChanged` / `getCellRanges()` and aggregate numeric cells client-side into a status-bar item next to the row count.

### 2. Median and weighted average

- **Why:** weighted average is everywhere in finance (price × quantity); median is the robust alternative to mean.
- **In lite:** `ui/panel-column.ts:75-81, 307`: weighted average takes a weight column as an aggregation parameter.
- **Yours today:** `MEDIAN` and `wavg` are commented out in the operator enum (`DataCubeQueryEngine.ts:183, 202`).
- **How:** add `DataCubeQueryAggregateOperation` subclasses under `stores/core/aggregation/`, and a `weightColumn` on the column configuration. Confirm that `median()`/`wavg()` are available in the Pure relation API on your engine version.

### 3. Column heatmap

- **Why:** outliers jump out of a pivot without any charting.
- **In lite:** a per-column toggle in the column menu and column editor; colours come from theme tokens (`grid/screen-colours.ts`).
- **Yours today:** "Heatmap › Add to / Remove from" exists and is disabled (`DataCubeGridMenuBuilder.tsx:1111`).
- **How:** add `heatmap` to the column configuration and snapshot. Colour cells with an AG Grid `cellStyle` function scaled to the column's min/max. With the server-side row model, get min/max from the loaded block, or from a cheap extra aggregate query.

### 4. Drill-through to the rows behind a number

- **Why:** "Why is this subtotal 4.2M?" is answered with one double-click.
- **In lite:** `drillLambda` in `datacube/src/query.ts` takes the cube's query, adds the cell's group-by path (and pivot column values) as equality filters, drops the grouping, and opens the detail rows.
- **Yours today:** double-click only drills the tree in the WIP multidimensional mode (`DataCubeGridState.ts:323`).
- **How:** on `cellDoubleClicked` in a grouped or pivoted view, clone the current snapshot, convert the row path into filter nodes, clear the vertical and horizontal pivots, and open it in a new `LayoutService` window as a child DataCube.

### 5. Charts: plot and treemap

- **Why:** fills your "Show Plot…" and "Show TreeMap…" slots. Lite's key decision is that a chart is a _view of the cube_, not a second engine: it reuses the cube's query regrouped by the chart's x and split, so the database aggregates and filters stay consistent.
- **In lite:** `chart-spec.ts` (a plain JSON spec, so it can be saved), `chart-option.ts`, and `chart-render.ts` (the only file that touches ECharts). Clicking a mark filters the grid.
- **Yours today:** disabled WIP menu items (`DataCubeGridMenuBuilder.tsx:1133-1143`).
- **How:** add a chart spec to `DataCubeConfiguration`. Build the chart query with the existing snapshot → Pure path (`DataCubeQueryBuilder`), with the chart's dimensions as the group-by, and render in a window. Library choice: AG Charts pairs naturally with AG Grid Enterprise, or ECharts as lite uses. Either one is a new dependency to justify.

### 6. The WIP exports: HTML, plain text, PDF, and a better Excel

- **Why:** these are already in your menu as placeholders. Plain text, aligned for pasting into chat or a ticket, is cheap and popular.
- **In lite:** one export model of the grid as shown (`export-model.ts`) feeds every format. `export-xlsx.ts` writes typed numbers and dates with Excel format codes matching the grid's formats, plus merged and frozen header rows. `export-doc.ts` writes plain text and a WinAnsi-encoded PDF.
- **Yours today:** CSV and AG Grid Excel work; HTML, Plain Text, PDF, Specification and all Email entries are WIP (`DataCubeGridMenuBuilder.tsx:560-655`).
- **How:** start with HTML and plain text from AG Grid's displayed rows. Map your number-format config to Excel format codes in the `exportDataAsExcel` `excelStyles`. PDF is the costliest to do well.

### 7. Share link in the URL

- **Why:** send a colleague exactly what you're looking at without saving a cube first.
- **In lite:** `share/link.ts`: the page JSON (query, configuration, open rows, charts, layout, and the source _by identity_, never data) is deflated with a frozen preset dictionary and base64url-encoded after `#p1.`. The fragment never reaches a server. Unknown versions are refused by name.
- **Yours today:** sharing means saving to the query store and sharing the id.
- **How:** serialize your `DataCubeSpecification`, deflate it (lite uses fflate; check whether a compressor is already in your lockfile), and add a route that reads the fragment. Version the format from day one.

### 8. Snap mode

- **Why:** lite reframes your cache toggle as a user-facing idea: "I reconciled against the 09:00 snap." It's fast, and the numbers don't move under the analyst while they work.
- **In lite:** `snap.ts` freezes the rows behind the current view into DuckDB-WASM, plans against them locally, and shows the snap's time.
- **Yours today:** `CachedDataCubeSource`, `initializeCache`/`disposeCache` on the engine, and a WIP Cache toggle (`DataCubeGrid.tsx:367`).
- **How:** finish the toggle: show the snapshot timestamp in the status bar, add a "re-snap" action, and warn on size. Most of the plumbing already exists.

### 9. JSON field explorer

- **Why:** semi-structured columns become usable without writing Pure.
- **In lite:** `json-shape.ts` infers a document shape from a sample, classifying numbers from text so ids past 2^53 aren't mangled. `ui/json-fields.ts` lists each field and generates the calculated column's Pure, which is then compiled like any other.
- **How:** fits your extended-columns editor. Depends on Variant support in the Pure relation API on your engine version.

### 10. Dashboards

- **Why:** one page of a grid plus charts that follow it. This is the most "product" feature lite has.
- **In lite:** `layout/tile-layout.ts` is a pure, node-testable layout model (no overlaps, static tiles, responsive repack). `layout/board.ts` draws it with CSS grid. `page/cube-page.ts` wires charts to a grid through a narrow `ChartSource` interface.
- **How:** needs charts (item 5) first. Then a board view beside your existing windowed layout, and a page document in your specification.

### 11. OLAP ad-hoc analysis mode

- **Why:** Essbase / Smart View users will recognize it: zoom in and out by level, keep only or remove only members, a point-of-view bar, member selection.
- **In lite:** `datacube/src/adhoc/` (`session.ts`, `outline.ts`, `member-selection.ts`, `mode.ts`), spec in `datacube/docs/AD_HOC_ANALYSIS.md`. Every number is still a database query.
- **Yours today:** the WIP multidimensional mode, with dimensions, a dimensional tree, and drill-down/drill-out, is the natural foundation.
- **How:** treat lite's spec as the target for completing your multidimensional mode, rather than porting code.

## 10. Questions worth asking Neema

- Is the goal for legend-lite to **replace legend-engine for some workloads**, or to be a fast, portable reference implementation that engine converges toward?
- Is the WASM no-server plane meant for production use with GS models, or is it for demos and offline work? How would entitlements and data access work there?
- What is the plan for databases beyond DuckDB, H2 and Postgres (Snowflake, Databricks, Sybase), given that SQL generation is hand-written per dialect?
- Should your DataCube adopt lite's features in place (your WIP slots), or is the intent for lite's DataCube to become the new one? This matters for where you invest.
- Would he want lite's DataCube to read and write your `DataCubeSpecification`? Its census calls the save format its biggest gap, and it would make the two interoperable.

## 11. How this was checked

legend-lite was cloned at `16c8120` (2 Oct 2026) and read directly. The comparison used your legend-studio working tree and your local legend-engine checkout. Every gap-table row and every "yours today" claim cites a line checked by hand in both repos. Lite's census and design docs were used as leads only, and their claims were re-checked in code. Several were already out of date: for example, constants, milestoning, percentile and wavg landed in lite's Query after its design doc listed them as gaps.

Limits: I didn't build or run either project. The test numbers in section 6 are quoted from lite's docs. The engine checkout is from April 2026, so newer engine features may be missing from section 2. A multi-agent cross-check was attempted twice but hit the account's session limit before any agent finished, so this report was produced in a single pass.
