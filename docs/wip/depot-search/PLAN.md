# Depot Search — Implementation Plan

> **Status:** draft for review, 2026-10-21 · branch `depot-search` (from finos `master` `022f425d3`)
> **Inputs:** the 2026-10-21 design session, the
> [mockup](https://claude.ai/artifact/C9YHTvFMtpWp5hbqXfVgvx) (private until shared), prototype scripts in
> `../legend-cube-evidence/depot-search/` (outside this repo) and a code survey of `legend-studio`,
> `legend-engine` and `legend-depot`.
> **Evidence markers:** ✅ verified (prototype or live engine) · 📄 traced in code · 💭 inference, to be checked in
> the step that needs it.
> **Assumes:** the engine fix [finos/legend-engine#5404](https://github.com/finos/legend-engine/pull/5404)
> (`array_size` of a JSON list on DuckDB 1.4) merges and reaches the engine Studio uses.

---

## 0. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                | Source                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| D1  | Search is a **new mode of the existing Depot dashboard** (`/studio/extensions/depot`), next to today's data product view, in `@finos/legend-extension-application-studio-depot-dashboard`.                                                                                                              | user                                                                           |
| D2  | **Latest release of each project only.** Snapshots come later.                                                                                                                                                                                                                                          | user                                                                           |
| D3  | **Data comes from Depot's summary, then one call per project version.** The bulk `/classifiers/{path}/entities` call is too slow and fails for some classifiers.                                                                                                                                        | user                                                                           |
| D4  | **Elements are queried in DuckDB in the browser** (DuckDB-WASM), one table per loaded classifier, the element's content as a JSON column that Pure sees as `Variant`. Engine only generates the plan; the plan's SQL runs in the browser. This is how DataCube's local-file source works today.         | user + prototype                                                               |
| D5  | **Users write Pure relation queries** (`#>{…}#->filter(…)->select(…)`), not JavaScript, JSONPath or SQL.                                                                                                                                                                                                | user                                                                           |
| D6  | **Results open in an embedded DataCube grid**, with sorting, filters, grouping (Vertical Pivots) and export coming from DataCube.                                                                                                                                                                       | user                                                                           |
| D7  | **No changes to DataCube** (`legend-data-cube`, `legend-application-data-cube`) in this work. Search uses DataCube's public API only and carries its own copy of the DuckDB code. Optional DataCube changes are listed in §6.3 and need the user's go-ahead each.                                       | user ("don't break anything")                                                  |
| D8  | **Off by default**, enabled per deployment through the plugin's own config (§5.1).                                                                                                                                                                                                                      | recommendation                                                                 |
| D9  | **Result columns of type `Variant` are converted to JSON text** (`->toJson()`) before DataCube sees them, because DataCube's filter editor throws on `Variant` columns (§6.2). A query that selects `content` just works and shows the JSON. No DataCube change.                                        | recommendation (Q3; user asked what it meant, convert recommended, 2026-10-21) |
| D10 | `V1_*` code stays in a `v1/` folder inside the extension (AGENTS.md). DataCube's engine API is itself `V1_*`-based, so the DataCube engine for Search lives there too.                                                                                                                                  | AGENTS.md                                                                      |
| D11 | Load limits: `concurrency` 8, `maxElements` 20,000, deny list `Class`, `Function`, `Enumeration`, `Association`, `Profile` (revisited after S4).                                                                                                                                                        | user (Q1)                                                                      |
| D12 | **Element panel = lookup by path** outside the grid (§4.6). No DataCube change for click-a-row (C1 not planned).                                                                                                                                                                                        | user (Q2)                                                                      |
| D13 | **One PR**: this plan and the implementation together in finos/legend-studio#5754, retitled when the code lands.                                                                                                                                                                                        | user (Q4)                                                                      |
| D14 | **One demo video, at the end** (M6.2). Each milestone still ends with a check in the browser.                                                                                                                                                                                                           | user (Q5)                                                                      |
| D15 | **DuckDB's JSON extension location is configurable** (`search.duckDBExtensionRepository`). The browser build of DuckDB does not include JSON support; it downloads it from `extensions.duckdb.org` on first use (S1). Deployments that can't reach that site host the extension files and set this URL. | M1 finding (§11)                                                               |

---

## 1. Scope

### 1.1 In

- Pick an element type (classifier), load the latest release of every project's elements of that type, see progress,
  retry failures, cancel.
- Load several classifiers; each becomes a table. Queries can join them.
- Write a Pure relation query with typeahead; see engine errors with line and column.
- Run it: results in DataCube. Show the generated SQL.
- Look up one loaded element by path and see its JSON, with "Open in Studio" (§4.6). This replaces the mockup's
  click-a-row panel, which would need a DataCube change (§6.3 C1).

### 1.2 Out (later)

Snapshots and workspace snapshots · caching loaded classifiers across visits · saving or sharing a search ·
server-side search in Depot (Depot's own code calls a generic query endpoint "the bigger plan") · the optional
DataCube changes in §6.3.

---

## 2. Architecture

```
Classifier picker ──► Depot summary (latest releases) ──► group by project version
        │                                                        │
        │                       pool of N requests ◄─────────────┘
        │                       /projects/{g}/{a}/versions/{v}/classifiers/{classifier}
        ▼                                        │
 engine classifier map                           ▼
                                   DuckDB-WASM table  releases."<Classifier>"
                                   (groupId, artifactId, versionId, path, classifierPath, content JSON)
                                                 │
Pure query ──► engine: parse, relation type, generatePlan (DuckDB, clientVersion vX_X_X)
                                                 │ SQL
                                                 ▼
                                   DuckDB-WASM runs SQL ──► TDS result ──► embedded DataCube
```

What runs where:

| Piece                          | Where            | Talks to                                                                   |
| ------------------------------ | ---------------- | -------------------------------------------------------------------------- |
| Classifier list                | browser          | engine `GET /pure/v1/protocol/pure/getClassifierPathMap` 📄                |
| Element summary                | browser          | Depot `GET /classifiers/{path}?scope=RELEASES&summary=true&latest=true` 📄 |
| Element content                | browser          | Depot `GET /projects/{g}/{a}/versions/{v}/classifiers/{path}` 📄           |
| Storage and query execution    | browser (DuckDB) | nothing                                                                    |
| Parse, typeahead, column types | engine           | `grammarToJson`, `completeCode`, `lambdaRelationType` 📄                   |
| SQL                            | engine           | `generatePlan` with a DuckDB connection 📄                                 |

### 2.1 What the prototype proved (synthetic data, local engine, DuckDB-WASM 1.31.0 under Node)

- ✅ 20,002 elements load into DuckDB-WASM in ~170 ms (`read_json` with explicit columns, `content` as `JSON`).
- ✅ `$e.content->get('fileGenerations')->toMany(@Variant)->size() > 1` → engine SQL → runs in 69 ms; 11,942 rows,
  the expected count. A group by takes 55 ms.
- ✅ Old-format elements (references as plain strings) and missing fields need no special handling.
- ✅ Engine errors come back with source positions (e.g. `The column 'entiy' can't be found in the relation (…)`).
- ✅ The one SQL incompatibility found (DuckDB 1.3 vs 1.4, `array_size`) is fixed by #5404.

---

## 3. Data loading

### 3.1 The calls

1. **Summary:** `depotServerClient.getEntitiesSummaryByClassifier(path, { scope: RELEASES, summary: true, latest: true })`
   📄. Returns `{groupId, artifactId, versionId, path, classifierPath}` per element. The same options are used by
   `DataSpaceEditorState` 📄. 💭 That `latest=true` returns exactly one version per project is not visible in this
   repo; checked in S4. **This route is not in open-source legend-depot** ✅ (its only classifier routes are
   `/entitiesByClassifierPath/{path}` and the per-version one below), so Search, like today's data product view,
   needs a Depot that serves `/classifiers/{path}?summary=true`. Local development uses the mock Depot (M3.1).
2. **Content:** group the summary rows by `(groupId, artifactId, versionId)` and call
   `depotServerClient.getVersionEntities(g, a, v, path)` 📄 once per group. It returns `Entity[]` without
   coordinates, so the group key supplies them. No new Depot client method is needed.

### 3.2 Load control

The current dashboard starts every request at once (`fetchEntities` fires up to 3,000 flows, each also calling
`getProject`, uncached) 📄. Search does not copy that:

- **Pool:** at most `concurrency` requests in flight (config, default 8).
- **Cap:** refuse to load more than `maxElements` (config, default 20,000) without an explicit confirmation that shows
  the count from the summary. The summary itself is one request, so the count is known before any content is fetched.
- **Failures:** collected per project version with the reason; "Retry failed" re-queues only those.
- **Cancel:** stops scheduling; requests already in flight finish and are dropped.
- **Classifier allowlist:** the picker offers the engine's classifier map (§5.3) minus a deny list of high-volume types
  (`Class`, `Function`, `Enumeration`, `Association`, `Profile`, `SectionIndex`), configurable.

### 3.3 Loading into DuckDB

- One table per classifier in schema `releases`, named after the classifier's simple name
  (`releases."GenerationSpecification"`); a clash gets a numeric suffix.
- Columns: `groupId`, `artifactId`, `versionId`, `path`, `classifierPath` (`VARCHAR`), `content` (`JSON`).
- Load path: build the rows in JS, `registerFileText`, then
  `CREATE TABLE … AS SELECT … FROM read_json('<file>', format='array', columns={…, content: 'JSON'})`. ✅ in the
  prototype. Column types are always spelled out; DuckDB's auto-detection would turn `content` into a `STRUCT`, which
  the result conversion cannot read 📄.
- Reloading a classifier replaces its table. Removing a classifier drops it.

---

## 4. Query and results

### 4.1 The model Studio builds (never shown to the user)

As in DataCube's local-file source (`_synthesizeMinimalModelContext`) 📄, built as protocol JSON:

- Database `depot::Depot`, schema `releases`, one table per loaded classifier; `content` declared `JSON`, which engine
  types as `Variant` ✅.
- A DuckDB `RelationalDatabaseConnection` (test auth, placeholder path) and runtime `depot::Runtime`.
- Plans are generated with `clientVersion: vX_X_X`, as DataCube does for DuckDB (the DuckDB protocol models are not in
  `v1_33_0`) 📄.

### 4.2 The query editor

- A Pure code editor (`@finos/legend-code-editor`), prefilled with `#>{depot::Depot.releases.<Table>}#` for the
  selected table.
- Typeahead: engine `completeCode` with the model above 📄.
- "Fields seen in content": the distinct top-level keys of the loaded `content` (one DuckDB query), clickable to insert
  `->get('<key>')`.
- Examples menu with a few starter queries per common classifier.

### 4.3 Running

1. Parse the text (`grammarToJson`); engine errors are shown in the editor at their position.
2. Refuse a trailing `->from(…)` (Search adds the runtime itself) with a clear message.
3. Get the column types (`lambdaRelationType`). Any `Variant` column is converted to JSON text (D9): the source
   query gets `->extend(~<col>__json: x | $x.<col>->toJson())`, the original column is dropped and the new one renamed
   back, so the user sees the column they asked for. 💭 That this chain generates SQL DuckDB-WASM runs is checked in
   S3.
4. Hand the query to DataCube as its **source** and remount DataCube with a new key (DataCube cannot change source in
   place 📄).
5. DataCube calls back `executeQuery` with its own operations added; Search generates the plan, checks it is a simple
   plan with exactly one SQL node and no templating, runs the SQL in DuckDB and returns a TDS result 📄.

### 4.4 The DataCube engine for Search

`DepotSearchDataCubeEngine extends DataCubeEngine` and `DepotSearchDataCubeSource extends DataCubeSource`, in
`src/stores/search/v1/`. Method by method (templates: `LegendDataCubeDataCubeEngine` for local files,
`QueryBuilderDataCubeEngine` for a host-owned query) 📄:

| Method                                                          | Implementation                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `processSource`                                                 | §4.3 steps 1–3; columns from `lambdaRelationType`                     |
| `parseValueSpecification` / `getValueSpecificationCode`         | engine `grammarToJson` / graph manager `valueSpecificationToPureCode` |
| `getQueryTypeahead`                                             | `completeCode` with the source's model                                |
| `getQueryRelationReturnType` / `getQueryCodeRelationReturnType` | `lambdaRelationType` with the source's model                          |
| `executeQuery`                                                  | `generatePlan` (vX_X_X) → SQL guard → DuckDB → TDS                    |
| `buildExecutionContext`                                         | `->from(depot::Runtime)`                                              |
| logging, telemetry, timings                                     | routed to Studio's application store services                         |
| caching, export overrides                                       | not overridden; `enableCache` not set                                 |

### 4.5 Results UI

Embedded `<DataCube specification engine />` in a sized panel, as Studio already embeds DataCube for the query
builder (`QueryDataCubeViewer`) 📄. DataCube's CSS and Tailwind classes are already part of Studio's build 📄. Above it,
the run status (rows, engine time, DuckDB time) and "Show SQL".

### 4.6 Element lookup

A path field with completion over the loaded elements (from DuckDB), showing the element's coordinates, its content
JSON, "Copy JSON" and "Open in Studio" (`generateViewVersionRoute`, already used by the dashboard 📄). Independent of
DataCube.

---

## 5. Page plumbing

### 5.1 Config and gating (D8)

Plugin config, read in `DepotDashboard_LegendStudioApplicationPlugin.configure()` (today a no-op) 📄 and passed to the
page through the route's renderer. Studio's runtime `config.json`:

```json
"extensions": {
  "@finos/legend-extension-application-studio-depot-dashboard": {
    "search": {
      "enabled": true,
      "concurrency": 8,
      "maxElements": 20000,
      "duckDBExtensionRepository": "https://<allowed host>/duckdb-extensions",
      "excludedClassifiers": ["meta::pure::metamodel::type::Class"]
    }
  }
}
```

`AbstractPluginManager.configure` matches the key to the plugin's name 📄. The local dev config written by
`legend-application-studio-bootstrap/scripts/setup.js` turns it on.

### 5.2 Engine access on the page

The page's `BasicGraphManagerState` is never initialized today, so its engine client has no URL 📄. Search initializes
it the way `WorkspaceSetupStore.initializeEngine` does (engine URL, query URL, compression, cookie auth) 📄, **without**
`disableGraphConfiguration`, which would also skip the protocol serialization setup the model JSON needs 📄.

This happens **only in Search**: a separate Search store creates and initializes its own graph manager the first time
the user opens Search mode. The data product view's provider, store and graph manager are not touched, so:

- an engine that is down or misconfigured shows an error in Search only; the data product view loads as today;
- the existing dashboard tests keep passing unchanged (their base-store mock provides only `depotServerClient` 📄, so
  reading config or the engine in the shared provider would break them).

### 5.3 Classifier list

Engine `getClassifierPathMap` (`V1_EngineServerClient`) 📄, fetched once, labels derived from the protocol type,
`SectionIndex` dropped, then the deny list (§3.2). No Studio list of element types is usable here: they need an
`EditorStore` and give UI labels, not classifier paths 📄.

### 5.4 Package changes

- Dependencies: `@finos/legend-data-cube`, `@finos/legend-code-editor`, `@duckdb/duckdb-wasm` **1.31.0** and
  `apache-arrow` **19.0.1** (the same versions the DataCube app uses, so `yarn.lock` gains no second copy). Then
  `yarn check:pkg` for tsconfig references.
- A `*.wasm` module declaration (copied from the DataCube app).
- The DuckDB code is loaded with a dynamic `import()` when Search starts, so the data product view and its tests never
  load it. Production webpack puts all of `node_modules` in one vendor chunk 📄, so the DuckDB and Arrow JavaScript
  ships in Studio's startup bundle anyway: ✅ +≈260 KB minified (vendor +195 KB, index +64 KB) on ≈16.7 MB, about
  1.6% (S1). The Search code itself (15 KB), the DuckDB workers (0.8 MB) and the `.wasm` files (34–39 MB) are separate
  and only fetched when Search opens. Keeping DuckDB out of the startup bundle would need a change to the shared
  webpack config (all apps), which this plan does not make.
- Changeset: `patch` for the extension (a library package with a changelog).

---

## 6. DataCube: what we use, what we copy, what we leave alone

This section is the answer to "don't break DataCube".

### 6.1 Changes to DataCube in this plan: none

No file in `packages/legend-data-cube` or `packages/legend-application-data-cube` is edited. Concretely:

| Area                               | How Search avoids touching it                                                                                                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DataCube library code              | Used only through its public exports: `DataCube`, `DataCubeEngine`, `DataCubeSource`, `DataCubeSpecification`, `generateBaseSpecification`, the `_function`/`_elementPtr` builders, `DataCubeFunction`, `DataCubeExecutionError`. |
| DataCube app's DuckDB engine       | Not exported by the app 📄, so Search carries its own copy (§6.4). The app keeps its file untouched.                                                                                                                              |
| DataCube app's type mapping        | Not used. Search's copy maps DuckDB's `JSON`, `UBIGINT` and `BOOLEAN` itself; the app's mapper (which throws on these) stays as is 📄.                                                                                            |
| DataCube's styles, Tailwind config | Already in Studio's build; nothing added 📄.                                                                                                                                                                                      |
| Shared webpack config              | Not changed. `.wasm` is already handled as an asset for every app 📄.                                                                                                                                                             |
| `@duckdb/duckdb-wasm` version      | Pinned to the DataCube app's version; upgrading it stays the DataCube app's decision.                                                                                                                                             |
| DataCube tests                     | Not changed. `yarn test:group data-cube` is run anyway before each push as a guard.                                                                                                                                               |

What could still break, and how we'd know:

- **DataCube changes its public API later** → the extension stops compiling; `yarn check:ts` in CI catches it before
  merge. The Search engine is one class, so the fix is local.
- **Studio's bundle grows** (DuckDB JavaScript, §5.4) → measured in S1, before any merge; if it is significant we load
  it differently or ask before going further.

### 6.2 Known DataCube limits we work around (not fix)

| Limit                                                                                            | Workaround in Search                                     |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| A `Variant` column shows as text, but its filter editor throws (`_defaultPrimitiveTypeValue`) 📄 | Convert `Variant` result columns to JSON text (D9)       |
| A DataCube's source cannot change in place 📄                                                    | Remount with a new key on every Run                      |
| `spec.query` only accepts DataCube's own operation sequence 📄                                   | The user's query is the source, not the spec query       |
| Only simple plans with one SQL node can run in the browser 📄                                    | Guard in `executeQuery` with a clear error               |
| No row-click or row-menu hook in `DataCubeOptions`; `DataCubeAPI` has no selection 📄            | Element lookup outside the grid (§4.6)                   |
| `Number(bigint)` loses precision above 2^53 in the result conversion 📄                          | Acceptable for counts and sizes; noted in the user guide |

### 6.3 Optional DataCube changes (each needs the user's go-ahead; none is required)

| #   | Change                                                                                                                       | Files                                                                                                  | Risk to existing DataCube users                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | An optional `getRowContextMenuItems` (or `onRowSelected`) in `DataCubeOptions`, to bring back the mockup's click-a-row panel | `stores/DataCubeOptions.ts`, the grid's context-menu builder                                           | Low: additive and optional; hosts that don't pass it see no change. Needs tests that the default menu is unchanged.                                                                                                                                 |
| C2  | Filter editor skips columns it cannot filter (e.g. `Variant`) when picking a column or a default condition                   | `stores/view/filter/DataCubeFilterEditorState.tsx`, `DataCubeFilterEditor.tsx`                         | Low: those paths throw today. Must not touch each operation's `isCompatibleWithColumn`, which saved-spec parsing also uses.                                                                                                                         |
| C3  | Move the DuckDB engine out of the DataCube app into a small shared package both use, removing §6.4's copy                    | `legend-application-data-cube/src/stores/LegendDataCubeDuckDB*.ts`, three app tests' `jest.mock` paths | Moderate, limited to the DataCube app: a pure move, but its local-file, cache and Iceberg paths must be re-verified. Not into `legend-data-cube` itself: every consumer's Jest run and the VS Code bundle would then hit `import.meta` and `.wasm`. |

### 6.4 What is copied (≈400 lines) and from where

From `legend-application-data-cube/src/stores/`: DuckDB `initialize` (bundles, worker URLs, `builtin_httpfs = false`),
`runSQLQuery` and its Arrow-to-TDS conversion, `dispose`, the `*.wasm` declaration; from `LegendDataCubeDataCubeEngine`:
model synthesis, plan generation with `vX_X_X` and SQL extraction, the parse/typeahead/relation-type calls with their
400-to-`V1_ParserError`/`V1_EngineError` mapping. Not copied: CSV ingestion, cache, Iceberg, Lakehouse, `disposeCache`
(which quotes `"main.cache1"` as one identifier and so drops nothing 📄). Each copied file starts with a comment naming
its origin, so a later C3 can fold them back.

---

## 7. Testing

- **Unit (core group):** the loader (summary → groups → pool → failures → retry → cap → cancel) with spies on the Depot
  client; the classifier list; the DataCube engine (Variant refusal, `from()` refusal, plan guard, SQL extraction) with
  spies on the engine client. Jest's `blockFetch` means every call is spied 📄.
- **DuckDB in Jest:** `jest.mock` the DuckDB module, as all three DataCube app tests do; babel-jest cannot parse
  `import.meta` 📄. Loading it with `import()` keeps the existing `DepotDashboard.test.tsx` unaffected.
- **Pipeline:** the prototype scripts (engine + DuckDB-WASM under Node) are re-run against the real model Search
  builds, from the evidence folder; no Node DuckDB test in Jest (no precedent 📄).
- **Browser:** each UI step is checked in Studio's dev server against the mock Depot (§8 M3), then on real Depot
  (user).
- **Guards before every push:** `yarn workspace @finos/legend-extension-application-studio-depot-dashboard test`,
  `lint:js --max-warnings=0`, `yarn check:ts`, `yarn test:group data-cube`.

---

## 8. Milestones

Every UI milestone ends with a check in the browser; the demo video comes once, at the end (M6.2, D14). One draft PR
from `depot-search` (D13), pushed after each milestone.

### M0 — Plan (this document)

| Step | Deliverable         | Done when                       |
| ---- | ------------------- | ------------------------------- |
| M0.1 | This plan, draft PR | User has reviewed §0, §6 and §9 |

### M1 — Spikes (no product code merged)

| Step | Deliverable                                                                                                                                                                                | Done when                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| S1   | DuckDB-WASM inside Studio's dev build: worker and `.wasm` load from `/static`, JSON functions work with no request to `extensions.duckdb.org`, bundle size before/after (`bundle:analyze`) | Numbers recorded; decision on loading (§5.4)                            |
| S2   | Engine from the `/depot` page: graph manager initialized, `getClassifierPathMap`, `lambdaRelationType` and a DuckDB `generatePlan` with vX_X_X                                             | All four calls succeed from the browser                                 |
| S3   | The prototype's queries end to end in the browser, with engine #5404 built locally; the `Variant` → `toJson()` conversion (D9) runs in DuckDB-WASM                                         | Same counts as the prototype                                            |
| S4   | Real Depot (user): `latest=true` semantics; element and project counts for the classifiers we plan to offer                                                                                | Counts recorded; defaults for `maxElements` and the deny list confirmed |

### M2 — Shell

| Step | Deliverable                                                                            | Done when                                          |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| M2.1 | Plugin config (§5.1) and the dev config                                                | Search hidden without config, shown with it; tests |
| M2.2 | Mode switch (Data Products · Search) on the dashboard; the data product view unchanged | Existing dashboard tests pass unchanged            |
| M2.3 | Engine initialization on the page (§5.2)                                               | Engine calls work; data product view still loads   |
| M2.4 | Classifier picker (§5.3) with the deny list                                            | Tests with a spied classifier map                  |

### M3 — Loading

| Step | Deliverable                                                                                                                                       | Done when                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| M3.1 | Mock Depot: `/classifiers/:path` (summary) and `/projects/:g/:a/versions/:v/classifiers/:path`, with a few dozen sample generation specifications | Routes answer in `yarn dev:mock-depot-server` |
| M3.2 | Loader store (§3.1, §3.2): summary, grouping, pool, cap with confirmation, failures, retry, cancel                                                | Unit tests for each                           |
| M3.3 | DuckDB module (copied, §6.4) and table loading (§3.3), loaded with `import()`                                                                     | Tables created in the browser; Jest mocks it  |
| M3.4 | Loading UI: progress, failures, loaded-classifier cards (reload, remove), columns list                                                            | Checked in the browser against the mock Depot |

### M4 — Query and DataCube

| Step | Deliverable                                                                        | Done when                                                   |
| ---- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| M4.1 | Model synthesis (§4.1)                                                             | Unit test of the model JSON; engine accepts it (S2)         |
| M4.2 | `DepotSearchDataCubeSource` and `DepotSearchDataCubeEngine` (§4.4) with the guards | Unit tests per method and guard                             |
| M4.3 | Query editor with typeahead and engine errors (§4.2)                               | Errors shown at their position                              |
| M4.4 | Run → embedded DataCube (§4.5), run status, Show SQL                               | The prototype's queries give the same counts in the browser |

### M5 — Lookup and helpers

| Step | Deliverable                           | Done when                           |
| ---- | ------------------------------------- | ----------------------------------- |
| M5.1 | Element lookup (§4.6)                 | Open in Studio lands on the element |
| M5.2 | Fields seen in content; examples menu | Checked in the browser              |

### M6 — Finish

| Step | Deliverable                                                               | Done when                                                  |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| M6.1 | Verification on real Depot (user) with the deployed engine carrying #5404 | User signs off                                             |
| M6.2 | Demo video                                                                | Sent and attached to the PR                                |
| M6.3 | Changeset, guards (§7), PR description                                    | Ready for review (marked ready only when the user says so) |

---

## 9. Questions and answers

| #   | Question                                                                                                          | Answer (2026-10-21)                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Q1  | Load limits (concurrency 8, 20,000 elements, deny list)                                                           | Yes (D11)                                                            |
| Q2  | Element panel: lookup by path, or DataCube change C1 for click-a-row                                              | Lookup by path (D12)                                                 |
| Q3  | `Variant` result columns: refuse, or convert to JSON text                                                         | Explained; convert recommended (D9), pending the user's confirmation |
| Q4  | One PR, or the plan merged first                                                                                  | One PR (D13)                                                         |
| Q5  | Demo video per UI milestone, or one at the end                                                                    | One at the end (D14)                                                 |
| Q6  | Can Studio users' browsers reach `extensions.duckdb.org`? If not, where can the DuckDB extension files be hosted? | Open (D15)                                                           |

--- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Q1 | Defaults: `concurrency` 8, `maxElements` 20,000, deny list `Class`, `Function`, `Enumeration`, `Association`, `Profile` | As listed, revisited after S4 |
| Q2 | Element panel: path lookup outside the grid (§4.6), or DataCube change C1 for click-a-row | Path lookup; C1 later if wanted |
| Q3 | `Variant` result columns: refuse (D9), or auto-convert them to JSON text | Refuse |
| Q4 | PR shape: this plan and the implementation in one PR, or the plan merged first | One PR, plan first |
| Q5 | Demo videos: one per UI milestone (M2–M5) plus the final walkthrough, or the final one only | One per UI milestone |

---

## 10. Risks

| Risk                                                                                                      | Mitigation                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Depot load from many small requests                                                                       | Pool, cap, deny list, one load per user action (§3.2)                                 |
| The summary route (`/classifiers/{path}`) is not in open-source legend-depot                              | Same dependency as today's data product view; mock Depot for local development (§3.1) |
| Browser memory for large classifiers                                                                      | Cap with confirmation; measured in S4                                                 |
| Studio's engine lacks DuckDB / vX_X_X plan support, or #5404 not yet deployed                             | S2 checks it; DataCube's local-file source depends on the same                        |
| DuckDB's JSON extension is downloaded from `extensions.duckdb.org` (✅ S1); blocked networks break Search | D15: configurable extension location; hosting the files is a deployment task          |
| Studio bundle size: +≈260 KB minified at startup (✅ S1)                                                  | Accepted unless the user objects; `import()` keeps the rest on demand                 |
| The extension already imports `V1_*` outside `v1/` (data product view)                                    | Not made worse: new `V1_*` code goes in `v1/` (D10); the old imports are out of scope |
| `package.json` says `UNLICENSED` with a gitlab.gs.com repository URL                                      | Out of scope; flagged for a separate fix                                              |

---

## 11. M1 spike results (2026-10-21)

Environment: Studio dev server from this branch on `:9021` (`/studio/extensions/depot`), a mock SDLC (`:6110`) and mock
Depot (`:6210`) from `../legend-cube-evidence/depot-search/env/`, and a second local engine on `:6301` built with #5404
(the user's engine on `:6300` was left as is). The spike code (a temporary panel with S1–S3 buttons) is not committed.

| Spike | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1    | ✅ DuckDB-WASM starts inside Studio (≈470 ms); the worker loads from Studio's `/static`; 2,002 synthetic elements load in 58 ms (403 ms the first time, which includes downloading the JSON extension); a JSON query returns the expected counts in 9–10 ms. ❗ With extension autoloading off, `read_json` does not exist: **JSON support is downloaded from `extensions.duckdb.org`**, not built in (→ D15, Q6). The DataCube app has the same dependency whenever its queries use JSON. Startup bundle +≈260 KB minified (§5.4). |
| S2    | ✅ The Search store initializes its own graph manager from the `/depot` page; `getClassifierPathMap` returns 37 element types; `lambdaRelationType` types `content` as `meta::pure::metamodel::variant::Variant`; `generatePlan` (DuckDB, vX_X_X) gives a single SQL query in 62–229 ms.                                                                                                                                                                                                                                            |
| S3    | ✅ The engine's SQL runs in DuckDB-WASM in the browser: the `fileGenerations->toMany(@Variant)->size() > 1` filter returns 1,201 rows (expected, including an old-format element) in 11 ms; the `Variant` → `toJson()` conversion (D9) returns `content` as a JSON string column (2,002 rows, 6 ms); a `->get('name')->to(@String)` filter works (5 ms).                                                                                                                                                                            |
| S4    | ⏳ Needs the user: `latest=true` semantics and element/project counts on real Depot.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
