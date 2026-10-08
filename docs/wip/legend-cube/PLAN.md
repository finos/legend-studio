# Legend Cube — Implementation Plan

> **Status:** approved 2026-10-05 · branch `cubeV1` (rebased on master `0665e6f4c`, where the spec landed as
> `docs/design/WIP-CUBE-SPEC.md` in #5589)
> **Inputs:** [docs/design/WIP-CUBE-SPEC.md](../../../docs/design/WIP-CUBE-SPEC.md), the planning brief, and an investigation of
> `legend-studio` + `legend-engine` (HEAD `93d92b4`) with ~1,500 checks against a live engine on `localhost:6300`.
> **Evidence markers:** ✅ verified live against the engine · 📄 traced in code · 💭 inference, to be verified in the
> milestone that needs it.
> **Implementation status** is tracked in [PROGRESS.md](PROGRESS.md), not here.

---

## 0. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Source                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| D1  | Saved cubes will live in a **new dedicated Cube store** in `legend-engine-application-query`. **Not in v1.** v1 defines and tests the saved spec format (codec + round trip) only; actual saving and the engine store come after the POC works end to end.                                                                                                                                                                                               | user                               |
| D2  | The slice runs **locally** against a **Cube-owned Northwind fixture sent as an inline model** (no depot). Entry points and the sources modal get expanded later, once designed. v1 scope: one model, one Database element, one runtime per query.                                                                                                                                                                                                        | user (default)                     |
| D3  | **ag-grid Enterprise license is available** in every deployment. Use `@finos/legend-lego/data-grid` (enterprise modules).                                                                                                                                                                                                                                                                                                                                | user                               |
| D4  | NULL semantics: **joins use SQL semantics** (NULL keys never match); **negated filters include NULL rows** (made explicit by the emitter, §8.4: the engine does it only for columns it types `[0..1]`; documented in the UI); **Count = non-null count** of the column.                                                                                                                                                                                  | user (default; wording 2026-10-06) |
| D5  | Engine-driven changes to authoritative sections are accepted: Slice is `[start, stop)`; Join gains **FULL OUTER (in the slice)**; window aggregates with a sort use the SQL default (running) until frames exist; Difference keeps spec semantics (emulated); Concat across different precise types is rejected (widen autofix later).                                                                                                                   | user (default)                     |
| D6  | Post-slice source order: services → Pure functions → data products → ingest. Data products and ingest are built against mocks until a lakehouse-enabled engine is available. Services snapshot their converted lambda and check for drift.                                                                                                                                                                                                               | user (default)                     |
| D7  | Route **`/cube`** inside Legend Query (URL `/query/cube`), hard-wired in the Query router. New module(s) `legend-cube` / `legend-cube-builder` (§3). Further entry points, the sources modal and the final look are revisited in M3.                                                                                                                                                                                                                     | user + recommendation              |
| D8  | Cube **works around** Studio and engine defects in its own code and depends on none of them being fixed. Upstream fixes are separate, non-blocking PRs and issues (Appendix B).                                                                                                                                                                                                                                                                          | user (default)                     |
| D9  | Execution is a **Pure relation-function chain** over store accessors (`#>{db.schema.table}#`), built as **protocol JSON** (never Pure text). Legend SQL is only a possible future "SQL source" node.                                                                                                                                                                                                                                                     | recommendation (§8.1)              |
| D10 | Precise primitives are modeled **inside the host-free domain**. The host adapts the engine's relation-type JSON at the boundary, in a package-local `v1/` folder.                                                                                                                                                                                                                                                                                        | recommendation (§5)                |
| D11 | **No feature flag.** `/query/cube` is always mounted in Legend Query. (M1.0 first shipped a `TEMPORARY__enableLegendCube` option; it was removed the same day.)                                                                                                                                                                                                                                                                                          | user                               |
| D12 | **Types: Cube's own registry for the slice, legend-graph's types from M2.0**, for consistency with the rest of Legend. M2.0 first fixes legend-graph's precise primitives (own PR), then rebases `CubeType` on legend-graph's `GenericType` and narrows the core rule to "metamodel only, no `V1_*`, no UI or app packages" (a §2.2 departure). Until then the type seam stays narrow (§4.1) so the switch stays internal. Replaces D10 from M2.0.       | user + recommendation              |
| D13 | **First merge after M1.8a, as one PR** (2026-10-07), so new sources and operations can then be built in parallel. M1.8b (canvas and editors) joined the same PR before it merged (user, 2026-10-07: it is on the critical path). Show Pure's "numbers as 0" bug is fixed before it. The working docs live in `docs/wip/legend-cube/` (PLAN, PROGRESS, and ISSUES for the known issues later PRs fix); the legend-graph issue list stays out of the repo. |

---

## 1. Scope

### 1.1 Milestone 1: the slice

Thin vertical slice, working live on a developer machine:

- **Sources:** relational database tables from an inline model (Cube Northwind fixture, or a pasted Pure model).
- **Transforms:** **Join** (Inner, Left Outer, Right Outer, Full Outer; binary from day one) and **Filter**.
- **Types:** full precise-primitive support (`Varchar(n)`, `SmallInt`, `Numeric(p,s)`, `Timestamp`, …).
- **Path:** pick tables → canvas → live schema inference and validation → lambda → live execution → results grid →
  saved-spec codec (export/import JSON as a dev affordance; no store).
- **Hosting:** Legend Query route `/query/cube`, always mounted (no feature flag, D11).

### 1.2 Not in the slice

Every other transform (Sort, Group, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Difference, Partition,
Extend). The Join rename autofix (it needs the Rename node; it lands in M2). Every other source kind. The depot and
project catalog. Persistence to any server. Drill-down, server-side grid mode, export, column formatting. Publishing (§15
is out of scope altogether). Legacy V0 import (none, ever).

### 1.3 After the slice

Section 11.3 lists the milestones, in the recommended order.

---

## 2. Architecture overview

```
legend-application-query            (Legend Query app; hard-wired route /cube; implements CubeHost)
   │  depends on
   ▼
@finos/legend-cube-builder          (React UI, MobX state, Legend engine adapter in src/graph-manager/protocol/pure/v1/,
   │                                  source catalogs, grid, canvas)
   │  depends on                    → legend-graph, legend-application, legend-art, legend-lego, legend-shared,
   ▼                                  @xyflow/react, @dagrejs/dagre, react-dnd, mobx, ag-grid (via legend-lego)
@finos/legend-cube                  (HOST-FREE core: types, schema, query graph, inference + validation, transforms,
                                      filters, Cube IR + emitter, saved-spec codec). Zero @finos deps; no React, no MobX.
```

The four artifacts and how they flow:

```
              decode/encode (core)                   emit (core)            v1 seam (builder)        engine
CubeSpec JSON ◄────────────────────► Query graph ─────────────► Cube IR ─────────────────► protocol JSON ──► execute
(saved, v1)                          (truth, immutable)          (host-free AST)            lambda + SI stamps    lambdaRelationType
                                          │                                                                         │
                                          └──── UI state (builder; mostly derived, never the source of truth) ◄──────┘ rows, types, errors
```

- The **query graph** is the only source of truth. Everything else is derived from it, or round-trips through it.
- The **executed lambda** is derived one way and never parsed back.
- **UI state** is derived (layout) or ephemeral. Only presentation metadata is saved (§10.4).

---

## 3. A. Code organization

### 3.1 Packages

| Package (folder)                                              | Purpose                                                                                                       | Dependencies                                                                                                                                                                                                                                | Template to copy                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@finos/legend-cube` (`packages/legend-cube`)                 | Host-free core. Spec §2.2 `cube-domain`, plus the IR emitter and the spec codec.                              | **none** at runtime. Dev: `@finos/legend-dev-utils`, `@jest/globals`, `jest`, `typescript`, `eslint`, `rimraf`, `npm-run-all`, `cross-env`.                                                                                                 | `packages/legend-storage` (headless) |
| `@finos/legend-cube-builder` (`packages/legend-cube-builder`) | UI and Legend adapter. Spec §2.2 `cube-engine` + `cube-sources` + `cube-ui` + `cube-persistence`, as folders. | `@finos/legend-cube`, `legend-graph`, `legend-application`, `legend-art`, `legend-lego`, `legend-shared`, `@xyflow/react@12.4.4`, `@dagrejs/dagre@1.1.4`, `react-dnd@16.0.1`, `mobx@6.13.6`, `mobx-react-lite@4.1.0`, `react@19.0.1` (peer) | `packages/legend-data-cube` (UI lib) |

The dependency lists are the target. Each step adds the dependencies it first uses, so nothing is declared unused: M1.0
declares only `@finos/legend-cube`, React and React DOM in the builder.

Why two packages and not five (spec §19.3):

- The rule that the core has **no host imports** is the spec's most important structural rule (§2.2). A package
  boundary enforces it best.
- Each extra package costs about 11 config files, root edits, a changeset and a release line. Engine, sources, UI
  and persistence are folders inside `legend-cube-builder` and can be split later if needed.

**Who depends on whom.**

- `legend-application-query → legend-cube-builder → legend-cube`.
- **`legend-query-builder` does not depend on Cube in v1**, for three reasons:
  1. Routes live in `legend-application-query`. The query builder is a library with no routes.
  2. `legend-query-builder` is consumed by Studio, the Data Cube app, data-space and others. They would all inherit
     the canvas stack.
  3. Keeping the edge out leaves `legend-cube-builder` free to reuse query-builder pieces later (parameter value
     editors, the saved-query loader for a "Legend Query" source). That would be a cycle if the query builder
     depended on Cube.
- If "Open in Cube" from the query builder (inside Studio) is wanted later, add the edge then, as
  `legend-query-builder → legend-data-cube` already does. `legend-cube-builder` must never import
  `legend-query-builder` after that.
- No library package depends on `legend-application-*` (AGENTS.md).

### 3.2 Folder layout

```
packages/legend-cube/src/
  types/        CubeType, type registry (precise primitives), families, comparison classes, display
  values/       LiteralValue, coercion + validation per type
  schema/       SchemaColumn (name, type, nullable), Schema
  graph/        QueryNode, Connection, Query (invariants, operations, ids), CubeDocument (context + query + meta)
  inference/    buildSchemasAndValidity, validation combinators, sentinels, query-level rules
  nodes/        registry; sources/RelationalTableSource; transforms/Join, Filter; UnknownNode
  filter/       Filter tree, operators, availability matrix, builder helpers (§8.5)
  messages/     §16 catalogue (verbatim) + additions
  ir/           Cube IR (host-free Pure AST), emitter per node, join algorithm, debug printer
  spec/         CubeSpec v1 codec, Meta, rest-preservation, migrations
  utils/        internal helpers, e.g. the exhaustive-switch assertion
  index.ts
packages/legend-cube-builder/src/
  graph-manager/CubeEngine.ts       CubeEngine port + CubeModelOutline / CubeResult / CubeEngineError (no V1_* symbols)
  graph-manager/protocol/pure/CubeEngineBuilder.ts
                                    buildCubeEngine(config, tracerService): CubeEngine. The ONLY place that constructs
                                    V1_LegendCubeEngine (precedent: QueryBuilder_PureGraphManagerExtensionBuilder.ts)
  graph-manager/protocol/pure/v1/   V1_CubeLambdaSerializer (IR → protocol JSON + sourceInformation stamps),
                                    V1_CubeRelationTypeAdapter (relation-type JSON → CubeType),
                                    V1_CubeModelOutlineBuilder (parsed model → databases, flags, runtimes),
                                    V1_CubeExecutionResultReader (lossless), V1_CubeEngineErrors (payload → node error),
                                    V1_LegendCubeEngine (implements the port; builds its own client; imports only the
                                    port, legend-graph, legend-shared and @finos/legend-cube)
  stores/       CubeEditorState, CubeExecutionState, CubeNodeEditorState (the side panel), LocalModelCatalog (the bundled
                model texts; talks only to the port; loadModel parses a model context once and returns its databases and
                runtimes as plain data), CubeHost interface, editors/ (node drafts and their registry, §7.4), fixtures/
                (Cube Northwind model as a TS string)
  components/   CubeEditor (layout), CubeNodeIcon (node icons), canvas/, palette/, editors/ (Join, Filter, Source, and
                the editor registry), source-picker/, grid/
  __lib__/      labels, help text (§17.9), command config (§3.5), test ids
  __test-utils__/  Cube-local axios engine helpers for engine-backed tests (§3.4)
  style/index.scss
```

**The repo's `@finos/legend/enforce-module-import-hierarchy` lint rule** (error level) forbids imports in **both**
directions between `stores/`/`components/` and `graph-manager/protocol/*/v*/`
([enforce-module-import-hierarchy.js](../../../packages/eslint-plugin/src/rules/enforce-module-import-hierarchy.js)) 📄.
That is why the port sits in `graph-manager/`, the factory sits just outside `v1/`, and `stores/` and `components/`
never import from `v1/`. The Query host calls `buildCubeEngine` from the builder's index, so no `V1_*` symbol appears
in `legend-application-query`.

### 3.3 Guarding the core's purity

The core gets four layers of protection, because `tsc` resolves _undeclared_ workspace packages through the root
`node_modules/@finos` symlinks 📄. All four have been in place since M1.0 ✅. Each was checked with a probe file that
imports `mobx` and reads `window`: lint, the build and the test all reject it.

1. **No dependencies.** `packages/legend-cube/package.json` declares no runtime, peer or optional dependencies. Its only
   dev dependencies are tooling: `@finos/legend-dev-utils`, Jest, TypeScript, ESLint and the script helpers. The test
   in item 4 checks this.
2. **Relative imports only (ESLint).** A root `eslint.config.js` block covers the non-test files under
   `packages/legend-cube/src/**`.
   - `no-restricted-imports` rejects every specifier that doesn't start with `./` or `../`. That is stricter than a
     list of host packages and needs no upkeep.
   - `no-restricted-globals` flags `window`, `document`, `localStorage`, `sessionStorage`, `navigator`,
     `location`, `fetch`, `XMLHttpRequest`, `process`, `console`, `setTimeout`, `setInterval` and
     `structuredClone`, for feedback while typing.
3. **ECMAScript globals only (build).** `packages/legend-cube/tsconfig.json` sets `lib: ["esnext"]` and
   `types: ["node"]`, because the tests need Node. `tsconfig.build.json` also sets `types: []` and leaves out the
   test folders.
   - So `yarn build` fails on **any** browser or Node global outside tests, not just the names above: `URL`,
     `TextEncoder`, `crypto`, `queueMicrotask` and the like are out too.
   - The core needs none of them. Write plain ECMAScript instead; for example, copy values without
     `structuredClone`.
4. **A unit test** (`src/__tests__/LegendCubeHostFree.test.ts`) runs in CI even when lint is skipped.
   - It parses each non-test source file and rejects any module reference that isn't relative: static imports and
     re-exports (type-only ones too), `import()`, `require()`, `import x = require()` and triple-slash directives.
   - It compiles the non-test sources against the ECMAScript library with no ambient types, and checks the package's
     dependencies.
   - Each check also runs against small bad fixtures, so the test proves it can fail.

### 3.4 Build, test and lint conventions

What the repo actually enforces:

- **Per package:** `package.json`, `tsconfig.json`, `tsconfig.build.json`, `tsconfig.publish.json`,
  `_package.config.js`, `jest.config.js`, `.npmignore`, `README.md`, `CHANGELOG.md`, `src/index.ts`. The builder
  also needs `style/index.scss` and the `build:sass`/`dev:sass` scripts.
- **Root:** both packages are referenced in `tsconfig.json` and `tsconfig.build.json`. Each dependent package
  references them in both of its tsconfigs. `yarn check:ts` only sees a new package once it is `git add`-ed 📄.
- **Tests:**
  - Core: `getBaseJestProjectConfig` (node environment). Builder: `getBaseJestDOMProjectConfig`.
  - Engine-backed tests are named `*.engine-roundtrip-test.ts`. CI runs them against the docker engine.
  - `fetch` is blocked in Jest (`legend-dev-utils/jest/blockFetch.js`), and `V1_EngineServerClient` uses `fetch`.
    So engine tests use axios against the hard-coded `http://localhost:6300/api`
    ([EngineTestSupport.ts](../../../packages/legend-graph/src/graph-manager/__test-utils__/EngineTestSupport.ts)) 📄.
  - **How the engine tests are wired:**
    - Engine tests drive the real `V1_LegendCubeEngine`. They spy its `V1_EngineServerClient` methods and route
      them to Cube-local axios helpers in `legend-cube-builder/src/__test-utils__/`, with `axios` as a devDependency
      as in legend-graph. The precedent is
      [LegendDataCubeStoreTestUtils.tsx:470-503](../../../packages/legend-application-data-cube/src/components/__test-utils__/LegendDataCubeStoreTestUtils.tsx:470).
    - Cube-local helpers are needed because `EngineTestSupport` has no `/lambdaRelationType/batch` helper, and its
      `execute` helper returns already-parsed JSON. That would bypass the lossless result reader M1.7 must test.
    - The helpers cover:
      - `grammarToJson/model` and `grammarToJson/lambda` (the A.11 golden and the printIR-parse comparison);
      - `lambdaRelationType/batch` (a plain JSON POST);
      - `compilation/compile` (the corpus compile check; a `text` context works ✅);
      - `jsonToGrammar/lambda`;
      - `GET /api/server/v1/info` (the engine commit, logged by Part A);
      - `execute` (`responseType: 'text'`), returning `{ ok: true, status: 200, text: async () => body }` so the
        lossless reader runs exactly as in the browser.
- **CSS:**
  - From M1.8b, the canvas imports `@xyflow/react/dist/style.css` from its `.tsx` file, as Studio's database
    diagram does, so the stylesheet loads with Cube's lazy chunk and not in Query's global sheet: xyflow 12 and
    the lineage viewer's reactflow 11 share the `.react-flow__*` class names (decided in M1.8b S13).
  - Legend Query's bootstrap `style/index.scss` imports `@finos/legend-cube-builder/lib/index.css`.
  - Tailwind only scans `../legend-*/src/**/*.tsx`: the package folder must start with `legend-`, and Tailwind
    classes go in `.tsx` files 📄.
- **Release hygiene:**
  - New files carry `Copyright (c) 2026-present, Goldman Sachs` (from the template, not copied from a neighbour).
  - New packages start at `0.0.1` with a `patch` changeset. `legend-application-query` also gets a `patch` entry.
- **Not enforced:**
  - `yarn constraints` is a no-op: the rules sit in `.yarn/constraints.pro`, which Yarn 4 does not read 📄.
    Version alignment is by convention, so pin the exact versions already in `yarn.lock` (§3.6).
  - There is **no lint rule for package dependency direction** 📄. §3.3 covers the core.

### 3.5 Legend Query integration (slice)

- **Route:**
  - `CUBE: '/cube'` is in `LEGEND_QUERY_ROUTE_PATTERN`
    ([LegendQueryNavigation.ts:76](../../../packages/legend-application-query/src/__lib__/LegendQueryNavigation.ts:76)) and
    mounted in [LegendQueryWebApplication.tsx](../../../packages/legend-application-query/src/components/LegendQueryWebApplication.tsx:146)
    since M1.0. M1.8a only swaps the route element for a Query-side wrapper that builds the host, loaded lazily
    (Settled before M1.8).
  - Query's `baseUrl` is `/query/`, so the URL is **`/query/cube`** 📄.
  - Plugin page entries are not used: they force an `/extensions/` prefix 📄.
  - `/cube/:cubeId` is reserved for saved cubes (M8).
- **No feature flag** (D11): the route is always mounted.
- **Keyboard shortcuts:** Legend binds keys only through plugins' `getExtraKeyedCommandConfigEntries()`, collected
  at app start 📄. F9 is already bound in Query to the query builder's compile command, which is only registered
  while the query builder is mounted.
  - The builder exports `LEGEND_CUBE_COMMAND_CONFIG` (execute: F9; undo: Control+KeyZ / Meta+KeyZ).
  - Query contributes it via `getExtraKeyedCommandConfigEntries()` on a core application plugin. This is the only
    plugin hook Cube uses. Query has two: `Core_LegendQuery_LegendApplicationPlugin` (`src/application/`) and
    `Core_LegendQueryApplicationPlugin` (`src/components/`); before M1.8b neither overrode the hook, and Query's
    test helper installs only the second. **M1.8b (S20) added the override to `Core_LegendQuery_LegendApplicationPlugin`**,
    the one the app installs first (a new Query key binding must be merged into that override's entries), and a Query test shows that F9 on `/cube` reaches Cube's Execute with the query builder's plugin
    also binding F9 (the query builder's Compile is registered only while it is mounted).
  - The Cube page registers the commands with `applicationStore.commandService`, as the query builder's
    `useCommands` does.
  - The undo command's `trigger` returns `false` while focus is in an input, textarea or contenteditable.
- **Host code:** `legend-application-query/src/components/cube/` and `src/stores/cube/` hold a thin
  `LegendQueryCubeHost`. It implements `CubeHost` (defined in the builder) from Query's application store:

  - engine server client config (Query's `engineServerUrl`, as at
    [QueryEditorStore.ts:631](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts:631));
  - notifications and alerts;
  - telemetry;
  - the bundled model catalog.

  The engine URL exists only on Query's config 📄, which is why the host injects it.

- **Entry links** (landing-page action, editor menu item, deep links) are **not** in the slice. They are designed in M3.
- **Look (provisional):**
  - Legend Query's look: legend-art components, resizable panels, `ContextMenu`, `Dialog`.
  - Tailwind utilities for layout and legend-art colour tokens. Root CSS class `.legend-cube`; the `.data-cube`
    class and the cube icon belong to Data Cube.
  - Components stay thin so the look can change in M3.

### 3.6 UI libraries (all already in `yarn.lock`; no new third-party packages)

| Need          | Library (version)                                                      | Precedent                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas        | `@xyflow/react` 12.4.4 (MIT)                                           | Studio database diagram [DatabaseDiagramCanvas.tsx](../../../packages/legend-application-studio/src/components/editor/editor-group/database-editor/DatabaseDiagramCanvas.tsx)                     |
| Layout        | `@dagrejs/dagre` 1.1.4 (MIT)                                           | [DatabaseDiagramHelper.ts](../../../packages/legend-application-studio/src/components/editor/editor-group/database-editor/DatabaseDiagramHelper.ts) (left-to-right, centre → top-left conversion) |
| Drag and drop | `react-dnd` 16.0.1 (MIT); `DndProvider` already wraps every Legend app | query builder, legend-lego                                                                                                                                                                        |
| Grid          | ag-grid 35.0.0 via `@finos/legend-lego/data-grid` (enterprise, D3)     | [DataGrid.tsx](../../../packages/legend-lego/src/data-grid/DataGrid.tsx)                                                                                                                          |
| State         | `mobx` 6.13.6, `mobx-react-lite` 4.1.0                                 | repo-wide                                                                                                                                                                                         |

Not used: `reactflow` 11 (legacy, lineage viewer only), elkjs (not installed; EPL), Data Cube's floating-window layout
manager.

### 3.7 Housekeeping found along the way (separate, optional)

- [AGENTS.md:120](../../../AGENTS.md:120) says DataCube consumes metamodel only, but `legend-data-cube` uses `V1_*` throughout,
  outside `v1/` folders 📄. Cube follows the stricter rule: V1 symbols appear only under
  `legend-cube-builder/src/graph-manager/protocol/pure/v1/`, as `legend-query-builder` does. AGENTS.md should be
  clarified separately.
- `.yarn/constraints.pro` is dead; see Appendix B.

---

## 4. Domain model (`@finos/legend-cube`), detailed for the slice

Everything in this section is host-free and test-driven. Spec sections are cited where behaviour is kept **verbatim**.

### 4.1 Types

See §5 for the rationale. In summary:

```ts
type TypeFamily =
  | 'BOOLEAN'
  | 'STRING'
  | 'INTEGER'
  | 'FLOAT'
  | 'DECIMAL'
  | 'NUMBER'
  | 'STRICT_DATE'
  | 'DATETIME'
  | 'DATE'
  | 'STRICT_TIME'
  | 'VARIANT'
  | 'ENUM'
  | 'OPAQUE';

abstract class CubeType {
  abstract readonly path: string;
  equals(o: CubeType): boolean;
  toString(): string;
}
class PrimitiveType extends CubeType {
  path;
  params: readonly number[];
  info: PrimitiveTypeInfo;
} // interned by (path, params)
class EnumType extends CubeType {
  path;
  values: readonly string[];
} // equal iff same path (spec §3.1)
class OpaqueType extends CubeType {
  path;
  params: readonly number[];
} // unknown engine types; carried, never compared
```

- `PrimitiveTypeInfo` comes from a static registry (§5.3) and holds the short name, family, parent, parameter arity
  and integer range.
- Primitives are interned singletons per `(path, params)`, which keeps spec §3.1's "singleton" intent.
  `Varchar(5)` and `Varchar(40)` are distinct values.
- Enum value qualification helpers stay as in §3.1 (`qualifyEnumValue` / `unqualifyEnumValue`).
- **Equality is structural** (spec §3.1): same family and same full name, which for an enumeration is its path. Type
  guards go by the family, never `instanceof`, so types also work across copies of the module.
- **The seam (D12).** Code outside `types/` uses only the type API: `family`, `equals`, `displayName`,
  `fullName`, `path`, `params`, the type guards, and the functions in `types/` and `values/`. It never reaches
  into `info` or builds types ad hoc: types come only from `resolveCubeType`, `PrimitiveType.get` and
  `new EnumType` (in the engine adapter, the spec codec and test helpers). That keeps the M2.0 switch to legend-graph's
  types internal to `types/`.

### 4.2 Schema

- `SchemaColumn { name: string (non-empty); type: CubeType; nullable: boolean }`. **`nullable` is new**: outer joins
  and later aggregations need it, and the engine reports it wrongly (§4.7, §5.7).
- `Schema` keeps the §3.2 operations: `lookup`, `type`, `names`, `equals`.
  - `equals` is order-sensitive and compares names and types. Nullability is ignored, matching the engine's
    `concatenate` ✅.
  - Concat's output (M4) is therefore schema1 with `nullable = nullable1 || nullable2` per column, as the engine
    merges it ✅.
  - **New:** a schema asserts unique column names, because the engine rejects duplicates everywhere ✅.
  - Source schema **drift detection** compares name, type **and** nullability, not `equals`.

### 4.3 Query graph

Spec §4 is kept verbatim (`QueryNode {key, id, type, ports}`, `Connection`, `Query {nodes, connections, selected}`, the
five invariants, every operation and every `canX` predicate), plus the following fixes and extensions:

| Change                               | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acyclicity invariant (6)**         | §5.1 says cycles are impossible. They aren't: `connect(F1,F2)` then `connect(F2,F1)` satisfies invariant 3 📄. `canConnect` and `connect(…, port)` reject a target that is the source or upstream of it. `canMove` is **unchanged** from §4.4: move isolates the node first, so it cannot create a cycle, and a stricter rule would forbid moves the spec allows. The constructor asserts the graph is acyclic; `visit()` keeps an in-progress set. |
| **`connect(source, target, port?)`** | The canvas lets users drop on a specific Left or Right handle. With no port, behaviour is spec's "first free port".                                                                                                                                                                                                                                                                                                                                 |
| **Per-type `generateId`**            | §4.4's global max cannot produce Appendix C's ids (`join101` + `filter101`) 📄. Take `max(100, ids of nodes of that type) + 1`; the collision fallback is unchanged.                                                                                                                                                                                                                                                                                |
| **Port labels in metadata**          | §17.3 pitfall 4. Join's `portLabels` getter, `['Left', 'Right']` (inherited from `BinaryNode`).                                                                                                                                                                                                                                                                                                                                                     |

Settled in M1.2 (spec §4.4 leaves these open or assumes unary nodes):

- **Port invariant (7):** a connection must target one of its target's ports. Port capacity stays out of the
  constructor, as in the spec.
- **Healing** (`remove`, `move`): the node's first connected input, in port order, feeds its output's target on the
  same port. A binary node's other input is dropped.
- **`move`** heals like `remove` before splicing, since the spec only says "disconnect". Moving a node after the
  selected node selects it, as `add` does; otherwise the selection is unchanged.
- **Nodes that don't accept new inputs** (`acceptsNewInputs`, false for Unknown, §4.10): `canAdd(…, after)`,
  `canMove`, `canConnect(*, it)` and `canSwapInputs` are false. Changes that keep its ports are allowed: healing into
  it on removal, and splicing a node in front of it.
- **`replace(node)`** swaps the node with the same id for a new node object (spec §4.1's key check) and needs every
  port in use. Every operation asserts its `canX` and throws.
- **`generateId`** counts only ids that are the type followed by digits, for nodes of that type (stricter than the
  spec's lenient `parseInt`). Past safe integers it falls back to the scan, which covers 1–10000.
- **Undo** creates a new object identity, as §17.4 requires: `query.clone()`.
- **`swapInputs`** also applies the node's `withSwappedInputs()`, so settings that name inputs by side follow them
  (added in M1.3 for Join, §4.7). The node it gives must keep its id.
- `CubeDocument` holds `{ context, query, meta }`, where `context = { model: ModelContext; runtime?: string }` is
  query-level (§6.2), and the model is the engine's model context as plain JSON (§6.2.2).

### 4.4 Inference and validation engine

- §5 is kept verbatim: `buildSchemasAndValidity`, port-ordered input schemas, the three sentinel messages,
  `isSchemasError`, and the `validate` / `validateAllItems` combinators.
- Two additions:
  - **Query-level rules pass** (new; runs before the per-node pass, and its errors are added to the offending
    nodes). v1 has one rule: all relational sources must address the same Database element as the first source.
    Message: `Sources from different databases are not supported yet; "<db>" differs from "<db0>".`
  - **Host-supplied issues** (engine errors mapped back by node id, §8.7) live in a separate map and do not take
    part in schema propagation. The UI merges them for display.
- Settled in M1.2:
  - A node with a rule error is invalid, so it has no schema and downstream nodes report `ERR_SCHEMAS`. Rule errors
    come first in its list, before a sentinel or its own errors. The rule takes the first relational source in
    `query.nodes` order, and every relational source counts, connected or not.
  - A node that validates but gives no schema gets `ERR_OTHER`, the converse of "invalid ⇒ no schema".
  - `isIncompleteError` joins `isSchemasError` (which stays `ERR_SCHEMAS` only).

### 4.5 Node contracts and registry

This replaces the per-class statics of spec §4.1/§6.1 with registries that the palette, context menu and codec all
read from (§17.2's single source of truth).

```ts
interface NodeDefinition<N extends QueryNode> {
  type: string;
  label: string;
  icon: string;
  beta: boolean; // menu metadata (§4.1)
  ports(node: N): readonly string[]; // per instance: static for known types, synthetic for Unknown (§4.10)
  portLabels?: readonly string[];
  create(id: string): N;
  decode(json: NodeSpecJson): N;
  encode(node: N): NodeSpecJson; // spec codec (§10.3)
  emit(node: N, inputs: IR.RelationExpr[], ctx: EmitContext): IR.RelationExpr; // §8
  isolationBoundary?: boolean; // true for window-producing nodes (§8.6), unused in slice
}
interface SourceDefinition<S extends SourceNode> extends NodeDefinition<S> {
  fromCoordinates(id: string, coordinates: unknown): S; // unresolved source from the picker
  resolve(node: S, result: SourceResolution): S; // new node with schema or error (replaces resolveV1)
}
```

Node instances implement spec §5.2 `validate(inputSchemas, errors)` / `schematize(inputSchemas)` plus `describe()`.

As built in M1.2: a `NodeDefinition {type, label, icon, beta}` with `TransformDefinition {kind: 'transform', create}`
and `SourceDefinition {kind: 'source', fromCoordinates, resolve, queryRules?}`. `decode`/`encode` arrive with the
codec (M1.6) and `emit` with the IR (M1.5). Port labels live on node instances (`portLabels`, Left/Right for binary
nodes). The registry is built by `createNodeRegistry()`, not held as a module-level singleton, and reserves the
`unknown` type.

### 4.6 Relational table source (`type: 'relational'`)

- **State:** `{ database: string /* element path */; schema: string; table: string; resolution }`.
  `resolution = unresolved | { schema: Schema } | { error: string }`.
- **Validation:** spec §6.2 validates only that the schema exists (`Required schema of this source could not be
resolved.`). A resolution error is reported verbatim from the engine (first line).
- **`describe()`:** `Table "<table>" from schema "<schema>"` (§6.2), or `(unknown)` when unresolved.
- **No parameters.** Coordinates are validated at construction (non-empty strings).
- **As built in M1.2:** `resolution` is `unresolved | resolved {schema} | failed {message}`. `describe()` is
  `(unknown)` only while unresolved; a failed source still shows its table, so the canvas names the broken one. The
  same-database rule (§4.4) lives with the source.

### 4.7 Join (`type: 'join'`, ports `['leftTds','rightTds']`)

- **State:** `{ leftColumns: string[]; rightColumns: string[]; joinType: 'INNER' | 'LEFT_OUTER' | 'RIGHT_OUTER' |
'FULL_OUTER' }`. The default is `LEFT_OUTER` (§7.11). `FULL_OUTER` is new (D5).
- **Validation order:** §7.11 steps 1–5, verbatim messages.
  - Step 4 uses the new comparison-class rule (§5.4) instead of §3.1's "numeric or identical".
  - Step 5 is the duplicate-column rule, verbatim (`getDuplicateJoinColumns`, positional matching).
- **Output schema:** `buildJoinSchemaColumns` verbatim (left keys, right keys, remaining left, remaining right,
  deduplicated by name). New nullability and merged-key rules:

| Join type   | Columns from the left input | Columns from the right input | Same-named key (deduplicated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INNER       | as input                    | as input                     | left column (value and type)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| LEFT_OUTER  | as input                    | **nullable**                 | left column                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RIGHT_OUTER | **nullable**                | as input                     | **right** column (the left value is NULL for unmatched rows ✅; legacy TDS did the same ✅)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| FULL_OUTER  | **nullable**                | **nullable**                 | `coalesce(left, right)`. **Nullable if either key is nullable:** a NULL key never matches (D4), so its row comes out unmatched with the other side NULL, and the coalesce is NULL. The engine still reports `[1..1]` here (507 NULL merged keys on `ORDERS.SHIP_REGION` ⟗ a NOT NULL key ✅), so conformance tests cannot catch this rule. Type = equal type, else the least common ancestor in the registry: `Varchar(15)`+`Varchar(2)` → `String`, `Numeric(10,2)`+`Numeric(12,4)` → `Decimal`, `Int`+`SmallInt` → `Integer`, `SmallInt`+`Double` → `Number` ✅ (§8.4 step 5) |

- **`describe()`:** `Join additional input` (§7.11). **`swapInputs`:** §4.4.
- **Autofix** (`renameInputs`): deferred to M2, which brings the Rename node. The fix must generate collision-free
  names (§21).

Settled in M1.3 (the spec leaves these open; the user confirmed the first three on 2026-10-05):

- **Swapping inputs swaps the key columns too.** Spec §4.4 only flips the connections, which leaves a join whose key
  names differ checking its left keys against the new left input, so it always turned invalid. Nodes now have a
  `withSwappedInputs()` hook (default: the node itself) that `Query.swapInputs` applies; Join returns a copy with
  `leftColumns` and `rightColumns` exchanged and the same join type. So a swap turns a LEFT join around (the other
  input's rows are kept) and stays valid. It applies with a single input too.
- **Within a key pair (step 4)** both columns are checked for presence, then their types only when both exist. Every
  pair is checked (`validateAllItems`); steps 1, 2, 3 and 5 each stop at the first failure, in spec order.
- **A blank key name** reports the generic `Left join column does not have a name.` (or `Right …`).
- **Step 5** lists the duplicate names in left input order. `getDuplicateJoinColumns` keeps the spec's `extra`
  argument for Difference; `buildJoinSchemaColumns`' `exclude` set waits for Difference (M6).
- **A key may repeat** (`[a, a]` ⋈ `[a, b]`); each name is still one output column.
- **INNER keeps nullability as input**; it does not infer that matched keys are non-null.
- **The FULL merged key** keeps the left type when the two types are equal (for an enumeration, the left one's
  values), else takes their least common ancestor. Compatible types always have one; otherwise it throws.
- `schematize` re-validates and gives `undefined` for an invalid join, so it never builds a schema with duplicate
  names. The helpers the emitter needs are exported: `getSameNamedJoinKeys`, `buildJoinSchemaColumns`,
  `getMergedJoinKeyType`.
- The palette entry is "Join Another Input" (spec §7.0), icon `join`. Join types are labelled Inner, Left Outer,
  Right Outer and Full Outer, in that order.

### 4.8 Filter (`type: 'filter'`)

- **Tree** (§8.1): `ColumnComparisonFilter {key, columnName, operator, value?}`, `CompositeFilter {key, operator: 'And'
| 'Or', rules}`, `NotFilter {key, rule}`. Values are typed `LiteralValue | LiteralValue[]` (§4.9), not `any`.
- **Operators:** the 16 in §8.2, with verbatim descriptions and negation pairs. Availability is **by type family**
  (§5.5).
- **Validation** (§8.3 plus the fix for the §21 type-check gap):

  1. The column exists (label `Filter column`).
  2. **New:** the operator is available for the column's type:
     `Filter operator "<op>" is not supported for column "<c>" of type <T>.`
  3. The value has the right shape (§8.3 verbatim: set operators need a non-empty array, empty operators need
     nothing, everything else needs a value; message `Filter value is required.`).
  4. **New:** each value is valid for the column type (§5.6).

  Composite and Not validation is as in §8.3.

- **Builder helpers** (§8.5) are pure functions in the core:

  - normalize the root to `CompositeFilter(And, …)` and unwrap a single rule on emit;
  - a column change resets the operator to Equal and clears the value when the type family changes;
  - an operator change clears the value when moving into or out of empty-operators or set-operators.

  The family-based reset replaces "type differs": changing between `Varchar(5)` and `Varchar(40)` keeps the value.

- **`describe()`:** `Filter by <toString()>` on the canvas. A **redacted** variant (column and operator only) is used
  for telemetry and logs (§21 "filter toString leaks values").

Settled in M1.4 (the spec leaves these open; the user confirmed them on 2026-10-05):

- **Values** are `LiteralValue | InvalidValue`, or a list of them for In/NotIn, so unparseable text is kept for its
  message (§4.9). The saved spec (M1.6) must store `{kind: 'invalid', text}` as well.
- **Validation order** within a comparison, stopping at the first failure: the column (a blank one reports
  `Filter column does not have a name.`), the operator, the value's shape, then each value. In the operator message
  `"<op>"` is the operator's description (`Filter operator "contains" is not supported …`) and `<T>` the type's
  display name. A list on a single-value operator, a single value on In/NotIn, or an empty list all report
  `Filter value is required.` A value on IsEmpty/IsNotEmpty is ignored. Groups check every rule, lists every item.
- **StrictTime** offers only IsEmpty and IsNotEmpty, like Variant and unknown types, since it takes no values.
- **Negation** uses the paired operator when there is one; otherwise a Not wraps the rule, including a single
  comparison such as `not (x is greater than 5)`. So §10.3's "`not` wraps composites only" becomes "composites and
  comparisons without a negated operator" (M1.6).
- **Rule keys** survive edits (`withColumn`, `withOperator`, `withValue`, `withRules` and the helpers), so editor rows
  keep their identity; new rules and new Not or group wrappers get fresh keys.
- **A blank row** has the column `''`, shown as `(blank)` (the spec's `ColumnComparisonFilter("(blank)")`).
- **Normalize/unwrap** act on the top level only; nested single-rule groups are kept. `undefined` normalizes to one
  blank row, so it does not round-trip.
- **Column change:** the operator and value are kept when the new column takes the same values: the same family and,
  for enumerations, the same enumeration. Otherwise the operator resets to Equal (or, for a type without Equal such
  as Variant, its first operator, IsEmpty) and the value clears. (The plan said family only; two different
  enumerations share the ENUM family, so they reset too.) When kept, text that was invalid is read again for the
  new type (300 is out of range for TinyInt but valid for SmallInt). The codec (M1.6) should do the same against the
  resolved schema on load.
- **Construction** refuses an unknown operator, group operator or value shape, as Join refuses an unknown join type,
  and the Filter node refuses anything that is not a filter rule (by shape: `kind`, `validate`, `toRedactedString`);
  every other invalid state (unknown or blank column, unavailable operator, missing or ill-typed value, empty group,
  no filter) is constructible and reported by validation. The codec (M1.6) keeps filters it cannot decode as
  unsupported ("This filter is not supported yet.").
- **Operator change** keeps the value when the new operator takes the same shape (none, one, or a list).
- **Descriptions:** a comparison reads `<column> <operator description> <value>`, with strings and invalid text in
  double quotes, other values as typed, and lists as `(a, b)`; groups join rules with `and` / `or`, nested groups of
  two or more rules in parentheses; a Not reads `not (…)`; nothing reads `(blank)`. The redacted form replaces each
  value with `?`; `describeRedacted()` is on every node (the description by default).
- `Filter.schematize` re-validates, like Join's, and passes its input schema through when valid. A core predicate,
  `isExactFloatComparison`, drives the editor's floating-point hint (§5.5).
- The palette entry is "Filter by Column" (spec §7.0), icon `filter`, before Join (menu order).

### 4.9 Literal values

```ts
type LiteralValue =
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'integer'; value: string } // canonical digits; BigInt-safe; never a JS number
  | { kind: 'float'; value: string }
  | { kind: 'decimal'; value: string }
  | { kind: 'strictDate'; value: string } // YYYY-MM-DD
  | { kind: 'dateTime'; value: string } // YYYY-MM-DDTHH:MM:SS[.f{1,9}] — seconds mandatory
  | { kind: 'enum'; value: string };
```

Editor text goes through `parseValue(text, type): LiteralValue | { kind: 'invalid'; text: string } | undefined`.

- **Empty input:** empty trimmed input becomes `undefined`, which fails with `Filter value is required.` STRING is the
  exception: its text is kept **untrimmed**, and `''` is valid.
- **Unparseable text:** kept as `{kind: 'invalid', text}`, shown marked (§17.7), and failing with
  `Filter value "<text>" is not a valid <T>.` Spec §17.7 instead turns it into `undefined`, which would lose the
  text the message needs; Appendix A records the change.
- **Numbers** are canonicalized to the JSON number grammar `^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$`: strip `+` and
  leading zeros, `.5` → `0.5`, `5.` → `5`, `-0` → `0`. The lossless serializer rejects non-canonical tokens such as
  `+5`, `007` and `.5`, and JS `Number()` silently reads `0x10` as 16 ✅. `LiteralValue` only ever holds canonical
  strings, and the v1 serializer asserts the grammar.
- **Kind check:** validation also rejects a value whose `kind` differs from the column family's kind (same message).
  This covers each item of an In/NotIn list, stale kinds after schema drift, and hand-edited specs.
- **Range:** Integer is **not** limited to JS safe integers, because BigInt columns exist.

### 4.10 Unknown node

Spec §7.16 is kept: no schema, invalid, and `describe()` → `Unknown Transform "<id>"`. Two fixes for §21's "Unknown
cannot be re-saved":

- **Ports:** the node gets **instance-level ports**, one synthetic port per raw input (`in0…inN-1`). Its edges are
  then real Connections, so invariants 2–3, remove-heal and layout all apply. Spec §7.16's `ports = []` would drop
  them, and an edited document could no longer be reopened.
- **No rewiring:** `canConnect(*, unknown)` and `swapInputs` are false, because its port semantics are unknown.
- **Encode:** writes the raw JSON back verbatim, except `id` and `inputs`. Those are regenerated from the live
  connections, with `null` for a port that is now empty.

So a query from a newer client can be opened, inspected, edited around and re-saved without losing anything. It
still cannot execute.

### 4.11 Messages

- The §16 catalogue is kept verbatim, in one file.
- **New messages:**
  - `Filter operator "<op>" is not supported for column "<c>" of type <T>.`
  - `Filter value "<v>" is not a valid <T>.`
  - `Filter value "<v>" is out of range for <T>.`
  - `Sources from different databases are not supported yet; "<db>" differs from "<db0>".`
- **Help text** (§17.9) moves to the builder's `__lib__`.

---

## 5. Types: precise primitives (requirement section)

### 5.1 Where they exist (findings)

- **Engine definitions** 📄✅: `legend-pure-m3-precisePrimitives-5.105.0` (engine `pom.xml:125` pins Pure 5.105.0),
  `platform_precise_primitives/precisePrimitives.pure`. 13 types:

| Precise type                                                                       | Extends    | Parameters           |
| ---------------------------------------------------------------------------------- | ---------- | -------------------- |
| `TinyInt`, `UTinyInt`, `SmallInt`, `USmallInt`, `Int`, `UInt`, `BigInt`, `UBigInt` | `Integer`  | –                    |
| `Varchar`                                                                          | `String`   | `(x)`                |
| `Float4`, `Double`                                                                 | `Float`    | –                    |
| `Numeric`                                                                          | `Decimal`  | `(precision, scale)` |
| `Timestamp`                                                                        | `DateTime` | –                    |

There is **no** precise `Date`, `Time` or `Decimal`. Constraints are advisory: `cast(@Varchar(3))` emits no SQL
CAST, and the rows violate the declared type ✅.

- **Relational column → Pure type** (`legend-engine-xts-relationalStore/legend-engine-xt-relationalStore-generation/
legend-engine-xt-relationalStore-grammar/src/main/java/org/finos/legend/engine/language/pure/compiler/toPureGraph/
RelationalCompilerExtension.java:1005-1100`) ✅:

| DB column                         | Pure type                              | DB column                | Pure type                                     |
| --------------------------------- | -------------------------------------- | ------------------------ | --------------------------------------------- |
| `VARCHAR(n)`                      | `Varchar(n)`                           | `DATE`                   | `StrictDate` (plain)                          |
| `CHAR(n)`                         | **`Varchar(1)`** (engine bug, `:1030`) | `TIMESTAMP`              | `Timestamp`                                   |
| `TINYINT/SMALLINT/INTEGER/BIGINT` | `TinyInt/SmallInt/Int/BigInt`          | `BIT`, `BOOLEAN`         | `Boolean` (plain)                             |
| `FLOAT`                           | `Float4`                               | `OTHER`, `ARRAY`         | `String` (values may come back as numbers ✅) |
| `REAL`, `DOUBLE`                  | `Double`                               | `JSON`, `SEMISTRUCTURED` | `meta::pure::metamodel::variant::Variant`     |
| `DECIMAL/NUMERIC(p,s)`            | `Numeric(p,s)`                         | `BINARY`, `VARBINARY`    | **HTTP 500 for the whole table's accessor**   |
| view column (any)                 | **`Varchar(0)[0..1]`**                 | NOT NULL / primary key   | `[1]`, otherwise `[0..1]`                     |

- **Protocol shape:** `{name, genericType:{rawType:{_type:'packageableType', fullPath}, typeVariableValues:[{_type:
'integer', value:n}]}, multiplicity}`. `fullPath` is either `meta::pure::precisePrimitives::X` or a bare base name.
- **The execution result builder is lossy:** it drops parameters, and `relationalType` reads `VARCHAR(1024)` for
  every `Varchar` ✅. **Schemas must come from `lambdaRelationType`.**
- **Studio** 📄:
  - [MetaModelConst.ts:64-82](../../../packages/legend-graph/src/graph/MetaModelConst.ts:64): `PRECISE_PRIMITIVE_TYPE` lists
    paths the engine does not have (`precisePrimitives::Date`, `::Time`, `::Decimal`) and a wrong `Timestamp`.
  - `PrecisePrimitiveType` extends `DataType` and is indexed by short name; there are three disagreeing
    precise→standard maps.
  - [V1_RemoteEngine.ts:779-801](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts:779):
    `getLambdaRelationType` drops `typeVariableValues`. Its batch variant reads `results`, but the engine returns
    `result`, so it throws ✅
    ([V1_LambdaReturnType.ts:87-90](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/compilation/V1_LambdaReturnType.ts:87)).
  - Client-side table typing
    ([STO_Relational_Helper.ts:222-263](../../../packages/legend-graph/src/graph/helpers/STO_Relational_Helper.ts:222))
    disagrees with the engine.
  - The query builder normalizes precise types to standard ones for operators and editors.
  - Data Cube keeps only a path string and hard-codes `Varchar(16777216)`
    ([DataCubeQueryBuilderUtils.ts:284](../../../packages/legend-data-cube/src/stores/core/DataCubeQueryBuilderUtils.ts:284)).
  - **What works:** `V1_relationTypeModelSchema`
    ([V1_TypeSerializationHelper.ts:128](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.ts:128))
    keeps the parameters ✅. `V1_buildRelationTypeFromV1RelationType` even works against an empty `PureModel` ✅.
  - **Literals:** JS `JSON.parse` corrupts large Integer and Decimal values. `parseLosslessJSON` /
    `stringifyLosslessJSON` exist in [FormatterUtils.ts:201](../../../packages/legend-shared/src/format/FormatterUtils.ts:201).

### 5.2 Decision: the domain models precise primitives itself (D10)

- The core cannot import `legend-graph`.
- The host's representations are lossy or wrong (above).
- The engine also returns types that `legend-graph` would mis-resolve (`Variant`; `Timestamp` collapsed with a
  relational class).

So the core owns a small registry. The builder's `v1/` adapter turns raw relation-type JSON into `CubeType`s:
deserialize with `V1_relationTypeModelSchema` from `legend-graph`, then map `fullPath` + `typeVariableValues` +
`multiplicity` directly. Unknown paths become `OpaqueType` instead of failing. Later, user-defined primitives can
resolve to a family through the model's generalization 💭.

### 5.3 Registry (core)

| Path (canonical)                                                                               | Short      | Family                             | Parent                 | Params | Range / format                               |
| ---------------------------------------------------------------------------------------------- | ---------- | ---------------------------------- | ---------------------- | ------ | -------------------------------------------- |
| `Boolean`                                                                                      | Boolean    | BOOLEAN                            | –                      | 0      | `true`/`false`                               |
| `String`                                                                                       | String     | STRING                             | –                      | 0      | any                                          |
| `meta::pure::precisePrimitives::Varchar`                                                       | Varchar    | STRING                             | String                 | 1      | length advisory (no check, §5.6)             |
| `Number` / `Integer` / `Float` / `Decimal`                                                     | …          | NUMBER / INTEGER / FLOAT / DECIMAL | Number (except Number) | 0      | Integer capped at the Java long range (§5.6) |
| `meta::pure::precisePrimitives::{TinyInt,UTinyInt,SmallInt,USmallInt,Int,UInt,BigInt,UBigInt}` | …          | INTEGER                            | Integer                | 0      | signed or unsigned width range               |
| `meta::pure::precisePrimitives::{Float4,Double}`                                               | …          | FLOAT                              | Float                  | 0      | finite                                       |
| `meta::pure::precisePrimitives::Numeric`                                                       | Numeric    | DECIMAL                            | Decimal                | 2      | decimal syntax                               |
| `Date` / `StrictDate` / `DateTime`                                                             | …          | DATE / STRICT_DATE / DATETIME      | Date (except Date)     | 0      | ISO date / datetime with seconds             |
| `meta::pure::precisePrimitives::Timestamp`                                                     | Timestamp  | DATETIME                           | DateTime               | 0      | as DateTime                                  |
| `StrictTime`                                                                                   | StrictTime | STRICT_TIME                        | –                      | 0      | reserved                                     |
| `meta::pure::metamodel::variant::Variant`                                                      | Variant    | VARIANT                            | –                      | 0      | –                                            |

The adapter also accepts short names on input (`Varchar` → canonical), because the metamodel round trip shortens
paths 📄.

### 5.4 Join compatibility (replaces §3.1 `areCompatibleTypes`; affects §7.11 step 4, and later §7.12)

- Two key columns are compatible iff they fall in the same **comparison class**:
  - **NUMERIC** = INTEGER ∪ FLOAT ∪ DECIMAL ∪ NUMBER. This keeps the spec's "any numeric joins any numeric", and
    precise widths are irrelevant ✅.
  - **STRING**: `String` and any `Varchar(n)`; lengths are irrelevant ✅.
  - **BOOLEAN**.
  - **STRICT_DATE**.
  - **DATETIME** (`DateTime`, `Timestamp`).
  - Abstract **DATE** is compatible with STRICT_DATE and DATETIME.
  - **ENUM** only with the same enum path.
  - **STRICT_TIME** only with STRICT_TIME (settled in M1.1; no relational column maps to it yet).
  - VARIANT and OPAQUE are never compatible.
- The **StrictDate ↔ Timestamp** pair is rejected: it executes but silently matches only midnight ✅.
- The message stays verbatim.
- **This check is mandatory:** the engine compiles `==` between any two types. A `Varchar` = `SmallInt` join compiles
  and then fails in H2, or is silently coerced ✅.
- **Columns of unknown physical type.** From a relational table accessor, a bare `String` column only comes from
  `OTHER`/`ARRAY`, because `VARCHAR`/`CHAR` always map to `Varchar(n)`. Its values may be numeric (e.g. FREIGHT in the
  shared Northwind model). Joining one to a `Varchar` compiles and then fails in the database ✅.
  - The relational adapter tags such columns **untyped**: string operators stay available, the picker shows "type
    unknown", and the Join editor shows an inline warning on any pair that uses one.
  - They are **not blocked**: the failure is a loud engine error at execute, not silent wrong data, and v1 has no
    cast transform to work around a block.

### 5.5 Filter operator availability (replaces the §8.2 matrix; the operator list itself is unchanged)

| Family (precise members)                                                               | Operators                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| BOOLEAN                                                                                | Equal, NotEqual, IsEmpty, IsNotEmpty (§8.2 row, unchanged) |
| STRING (`String`, `Varchar(n)`)                                                        | §8.2 `String` row, unchanged                               |
| ENUM                                                                                   | §8.2 `Enumeration` row, unchanged                          |
| INTEGER, FLOAT, DECIMAL, NUMBER (all precise ints, `Float4`, `Double`, `Numeric(p,s)`) | §8.2 numeric row, unchanged                                |
| STRICT_DATE, DATETIME (`Timestamp`), DATE                                              | §8.2 date row, unchanged                                   |
| VARIANT, OPAQUE (new)                                                                  | IsEmpty, IsNotEmpty only                                   |

- The matrix is keyed on the family, so precise types inherit the spec's rows. `Decimal` and `Numeric` join the
  numeric row.
- String-only operators must stay out of non-string families: `contains` on a number column silently means
  equality ✅.
- `OTHER` columns are `String` (engine truth), so they get string operators only. Northwind's money columns are fixed
  in the Cube fixture instead (§6.2.4).
- **Exact comparison on FLOAT-family columns** (Equal, NotEqual, In, NotIn on `Float4`/`Double`/`Float`): the
  operators stay available (spec rows unchanged), with an inline hint: "exact comparison on floating-point columns
  may not match".
  - On Northwind's 32-bit `REAL` columns it silently matches nothing: `FREIGHT == 32.38` returns 0 rows although
    order 10248 has 32.38 ✅. Negations match everything.

### 5.6 Value entry and validation (fixes the §21 "filter values not type-checked" gap)

Values are stored as strings (§4.9). Validation per type:

| Family / type            | Accepts                                                                                             | Errors                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INTEGER (precise widths) | `^[+-]?\d+$`                                                                                        | out of the width's range, e.g. `SmallInt` ∉ [-32768, 32767]. Plain `Integer`/`BigInt` are capped at the Java long range: a literal one past the range **silently wraps** in the engine ✅. Unsigned values above 2^63−1 are rejected.                                                                                               |
| FLOAT                    | `^[+-]?(\d+(\.\d*)?\|\.\d+)([eE][+-]?\d+)?$`, finite; no hex/binary/octal, `Infinity`, `NaN` or `_` | not a number                                                                                                                                                                                                                                                                                                                        |
| DECIMAL / NUMBER         | same grammar as FLOAT                                                                               | not a decimal. Precision and scale are **not** enforced (`price > 1.555` on `Numeric(10,2)` is meaningful).                                                                                                                                                                                                                         |
| STRING                   | any string, untrimmed (empty allowed)                                                               | – (no length check: `CHAR(n)` is mistyped `Varchar(1)` and views are `Varchar(0)`, so length errors would block valid input ✅). **Except** a backslash in a StartsWith/EndsWith/Contains value or its negation, which the engine misreads (§8.4, Appendix B): `Filter values for "<operator>" cannot contain a backslash (\) yet.` |
| BOOLEAN                  | exactly `true` / `false`                                                                            | anything else                                                                                                                                                                                                                                                                                                                       |
| STRICT_DATE              | valid calendar `YYYY-MM-DD`                                                                         | invalid date                                                                                                                                                                                                                                                                                                                        |
| DATETIME                 | `YYYY-MM-DDTHH:MM:SS[.f{1,9}]`, seconds required                                                    | missing seconds: the engine silently truncates hour/minute literals to the day ✅                                                                                                                                                                                                                                                   |
| ENUM                     | one of the enum's values                                                                            | anything else                                                                                                                                                                                                                                                                                                                       |
| In / NotIn               | a non-empty list, each item validated                                                               | an empty list: `!in([])` silently drops NULL rows ✅                                                                                                                                                                                                                                                                                |

Accepted numeric text is canonicalized to the JSON number grammar (§4.9). Every value that fails becomes
`{kind:'invalid', text}` with `Filter value "<text>" is not a valid <T>.`

Settled in M1.1:

- **FLOAT:** a number a double can't hold (e.g. `1e400`) is **out of range**, not invalid. DECIMAL and NUMBER
  accept it.
- **DATE** (the abstract `Date`) takes a STRICT_DATE or a DATETIME value; the literal kind follows the text.
- **STRICT_TIME, VARIANT and OPAQUE** take no values.
- **DATETIME** also accepts a trailing `Z` or `+0000` and drops it (user, 2026-10-05): the engine returns timestamps as
  UTC (`2024-02-29T13:45:12.123456000+0000`), so values copied from the results paste into filters. Other offsets are
  rejected.
- `checkValue` returns a structured problem (`required`, `invalid` or `outOfRange`). M1.4's Filter turns it into the
  messages above.

Input affordances follow §17.7, with `Timestamp` as `datetime-local` (with seconds) and `Numeric` as text.

### 5.7 Aggregation and Extend result types (replaces §10.2; used from M4 onward)

Measured with `lambdaRelationType` ✅:

| Aggregation                       | Integer family     | Float family | Numeric(p,s) | StrictDate | Timestamp | Varchar(n) | Boolean | Enum    |
| --------------------------------- | ------------------ | ------------ | ------------ | ---------- | --------- | ---------- | ------- | ------- |
| Count, DistinctCount              | Integer            | Integer      | Integer      | Integer    | Integer   | Integer    | Integer | Integer |
| DistinctValue (`uniqueValueOnly`) | input precise type | input        | Numeric(p,s) | StrictDate | Timestamp | Varchar(n) | Boolean | Enum    |
| Sum                               | Integer            | Float        | Number       | –          | –         | –          | –       | –       |
| Average                           | **Float**          | Float        | Float        | –          | –         | –          | –       | –       |
| Min / Max                         | Integer            | Float        | Number       | StrictDate | DateTime  | Varchar(n) | Boolean | Enum    |
| Rank, DenseRank (window)          | Integer            |              |              |            |           |            |         |         |

- **Nullability:** every aggregate output except Count is nullable, even though the engine reports `[1]` ✅.
- **§10.1 availability:** keep the spec's rows. Min/Max on String and Boolean, and DistinctCount/DistinctValue on
  enums, can be added later (the engine supports them ✅).
- **Extend:** §9.2's local table is wrong against the engine ✅. Extend types come from the engine, typed against
  **only the input schema**: a typed `{t: Relation<(cols)>[1] | $t->extend(~c: λ)}` lambda over an **empty** model
  gives the same type as the real model (163/163 ✅). The type is cached on the node with an input signature, so
  `schematize` stays synchronous and host-free (M6).

### 5.8 How types appear in the lambda, the saved spec and the UI

| Where            | Form                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lambda (slice)   | Mostly not written: accessors carry the types. **Literals are typed by column family**: INTEGER → `{_type:'integer'}`, FLOAT → `float`, DECIMAL/NUMBER → `decimal`, STRICT_DATE → `strictDate`, DATETIME → `dateTime`, ENUM → `EnumPath.VALUE`. Serialized losslessly. **One explicit type:** `->cast(@<common ancestor>)` on a FULL merged key whose types differ (§8.4 step 5), written as a `genericTypeInstance` (§8.3). |
| Lambda (later)   | Further casts only where Cube widens types. The Concat autofix uses a real conversion (`toString()`), not `cast` (§8.8). Pure text uses full paths with parameters, e.g. `meta::pure::precisePrimitives::Varchar(15)`.                                                                                                                                                                                                       |
| Engine responses | `rawType.fullPath` + `typeVariableValues` → `CubeType`; `multiplicity.lowerBound == 0` → `nullable` (but see §4.7 for joins).                                                                                                                                                                                                                                                                                                |
| Saved spec       | Source schema snapshots `{name, type:{path, params?}, nullable}`; literal values `{kind, value}` (numbers as strings, booleans as JSON booleans), text that is not a valid value `{kind: 'invalid', text}`.                                                                                                                                                                                                                  |
| UI               | Short name with parameters (`Varchar(5)`, `Numeric(10,2)`, `SmallInt`) and a nullable marker. A family icon. The full path in a tooltip.                                                                                                                                                                                                                                                                                     |

---

## 6. B. Sources

### 6.1 Source seam (replaces §6.1 details; keeps the idea)

Adding a source kind means two registrations and nothing else; the graph, inference, emitter, grid and codec are
untouched (§6.7's promise):

- **Core:** a `SourceDefinition` (§4.5), covering coordinates, codec, validate, describe, `emit` (an IR relation
  expression, e.g. an accessor), and the execution requirements it contributes (runtime, and later mapping or
  parameters).
- **Builder:** a `SourceKindAdapter` with:
  - a **catalog** (lists candidates for the picker);
  - a **resolver** (gets the schema and parameters through the engine);
  - a **picker tab** component.

Resolution replaces §6.1's single `resolveGraph` call: **one `POST /api/pure/v1/compilation/lambdaRelationType/batch`**
covers every source, keyed by node id, with per-key errors ✅. It returns `{result, errors}`; Studio's own wrapper
expects `results`, so Cube parses the raw response itself.

### 6.2 Relational tables, in depth (slice)

**6.2.1 Coordinates.**

- Each source holds `{database, schema, table}`. `context.model` is a model context (§6.2.2) and `context.runtime` is
  a runtime path, both query-level (one model, one runtime per query, D2).
- **Schema and table names** are stored exactly as the Database protocol's `name`, **quote characters included**: a
  quoted table `"a.b"` is the path `["db", "S1", "\"a.b\""]` ✅. The unquoted `["db","S1","a.b"]` fails with
  "Can't find table" ✅. Quotes are stripped only for display.
- **Column names** come from `lambdaRelationType`, unquoted.
- **Dotted names must never round-trip through Pure text:** `#>{db.S1."a.b"}#` silently resolves to a different
  table ✅. M1.7 adds a quoted, dotted table to the fixture so this path is tested.

**6.2.2 Model context** (Settled in M1.6, user OK 2026-10-06; it replaces a `{kind: 'local', id}` /
`{kind: 'project', …}` reference).

```ts
// the engine's V1_PureModelContext as plain JSON; only the builder's v1/ seam types it
interface ModelContext extends JsonObject {
  readonly _type: string;
}
// slice: { _type: 'text', code: '<Pure grammar>' }  (bundled fixture or pasted model; dev and local only)
// M3:    { _type: 'pointer', sdlcInfo: { _type: 'alloy', groupId, artifactId, version, packageableElementPointers: [] } }
```

- **The cube holds the model, not an id.** A `.cube.json` is self-contained: it runs against any engine (e.g. the
  local one on :6300) with no catalog, and a pasted model survives a reload.
- **The core keeps it opaque.** It checks only that the model is an object with a non-empty string `_type`, and
  re-saves it exactly as read. It never imports a `V1_*` type (D12).
- **The builder reads it.** Its `v1/` seam types it as `PlainObject<V1_PureModelContext>` (precedent: Data Cube's
  `FreeformTDSExpressionDataCubeSource.model`, saved raw). It decides which kinds it can run: `text` in the slice,
  `pointer` from M3. A cube whose model has another `_type` still opens and edits offline from its schema snapshots;
  resolving and running report that the model kind isn't supported.
- **Saved as `text`, never `data`:** smaller, readable, and not tied to the element protocol's version.
- **Costs accepted:**
  - the text counts against the 1 MiB cap (Northwind is about 25 KB); a model too large gives the existing
    "too large to save" error;
  - a cube keeps the model it was made with, so a later fix to the bundled fixture doesn't reach it (snapshot drift
    still flags changed tables);
  - a text model with a LocalH2 connection runs its setup SQL on the engine when executed, as a pasted model does,
    so text models stay dev and local only.

**6.2.3 `LocalModelCatalog` (slice).**

1. Take Pure grammar text: a bundled fixture or a pasted model. Picking one copies its text into the cube as
   `{_type: 'text', code}` (§6.2.2).
2. Parse it once per load with `grammarToJSON_model`
   ([V1_EngineServerClient.ts:405](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts:405)).
   The result is a model-context JSON (`{_type:'data', elements}`).
3. Read `Database` elements (schemas → tables) and `PackageableRuntime` elements from it, in the `v1/` seam.
4. Send the cube's saved `text` context with every typing and execution call. Inline `data` and `text` contexts
   both work for `lambdaRelationType` and `execute`, and need no depot ✅.

**6.2.4 Cube Northwind fixture.** `legend-cube-builder/src/stores/fixtures/CubeNorthwindModel.ts`, a TS string.

- It is a corrected copy of the Database in
  [Northwind.pure](../../../packages/legend-manual-tests/src/__tests__/query-builder/model/Northwind.pure). The shared model is
  left untouched, because the query-builder grammar tests use it.
- Corrections:
  - `ORDERS.FREIGHT`, `ORDER_DETAILS.UNIT_PRICE`/`DISCOUNT` and `PRODUCTS.UNIT_PRICE` become `REAL` (→ `Double`). In
    the shared model they are `OTHER` → `String`, so numeric filters fail to compile ✅. **REAL fixes compilation
    and range comparisons only.**
    - The H2 columns are physically 32-bit `REAL`, whatever the model declares. Exact comparisons silently match
      nothing (`FREIGHT == 32.38` → 0 rows), and boundary comparisons are off ✅.
    - So tests and the Part B script only use range filters away from stored values (e.g. `FREIGHT > 50`).
    - Exact float equality is tested on `ALLTYPES.D` (`DOUBLE`).
  - **Drop the BLOB/CLOB columns** (`EMPLOYEES.NOTES`, `PHOTO`, `CATEGORIES.PICTURE`). `NOTES` serializes as
    **invalid JSON** in every format ✅. The accessor's SQL lists only declared columns, so dropping them is safe.
  - `SHIPPERS.PHONE` becomes nullable.
  - Remove the four bogus `*_REGION` joins (text vs SMALLINT) ✅.
- It has a LocalH2 connection with `testDataSetupSqls: ['call loadNorthwindData()', <CUBETEST DDL + inserts>]` and a
  mapping-less `StoreRuntime`.
- **`CUBETEST.ALLTYPES`** adds the precise types Northwind lacks. Setup runs on every connection checkout, so its
  SQLs begin with `drop schema if exists CUBETEST cascade`.
  - **Columns:** `ID INTEGER PRIMARY KEY`, `TI TINYINT`, `SI SMALLINT`, `BI BIGINT`, `F FLOAT`, `D DOUBLE`,
    `DEC DECIMAL(10,2)`, `NUM NUMERIC(12,4)`, `DT DATE`, `TS TIMESTAMP`, `B BIT`, `VC VARCHAR(20)`.
  - **Rows** (designed for the acceptance filters in §11.2 A.5):
    - **ID 1:** `BI` 4, `DEC` 12.34, `D` 2.5, `TS` `2024-01-02 03:04:05.678`, `B` true, `VC` `'abc'`; every other
      column populated.
    - **ID 2:** `BI` 9007199254740993 (above 2^53, to exercise lossless reading), `DEC` 1.25, `D` 0.1,
      `TS` `2024-01-02 13:00:00`, `B` false, `VC` `'xyz'`; every other column populated.
    - **ID 3:** every nullable column NULL.
  - The scratch fixtures behind the type findings (`ops/types.pure`, `precise/model.pure`, kept in
    `legend-cube-evidence/`) had different rows. These rows are **new** and get verified in M1.7.
- **More `CUBETEST` tables** (Settled before M1.7, user 2026-10-06). The slice has only Source, Join and Filter
  nodes, so some Part A cases need tables shaped for them. All are created after `call loadNorthwindData()`, since
  some copy Northwind columns, and all live in `NorthwindDatabase` (one database per query):
  - **A quoted, dotted table** `"ORDER.LINES"` (e.g. `LINE_ID INT`, `RIGHT_COL VARCHAR(10)`), plus a decoy table
    that a misread dotted path would resolve to, so the "silently another table" hazard (§6.2.1) can fail a test;
  - **problem tables**, one or two rows each: a `BINARY(8)` column, a `CHAR(3)` key, an `OTHER` column, and a view
    over `ALLTYPES`;
  - **narrow copies of Northwind columns** (`CREATE TABLE … AS SELECT`), so the expected counts stay the same:
    `EMP_REGION(EMPLOYEE_ID, REGION)` and `CUST_REGION(CUSTOMER_ID, REGION)` for the REGION join (A.6; joining the
    raw tables breaks Cube's duplicate rule on ADDRESS, CITY, POSTAL_CODE, COUNTRY), `CATEGORY_REGION(CATEGORY_ID,
SHIP_REGION NOT NULL)` copied from `CATEGORY_NAME` for the one-nullable-key FULL join (A.4), and key pairs
    `VARCHAR(15)`/`VARCHAR(2)` and `DECIMAL(10,2)`/`NUMERIC(12,4)` for the parameter-only FULL casts (§8.4).
  - Verified on the engine (2026-10-06, `legend-cube-evidence/m17-probes/fixture-probe.mjs`) ✅: every table types
    in one batch call except `PROBLEM_BINARY`, which fails alone; `CHAR(3)` types as `Varchar(1)`, `OTHER` as
    `String`, the view's columns as `Varchar(0)`; the dotted table's Pure-text path silently reads the decoy, and
    its unquoted path fails with "Can't find table"; `EMP_REGION ⋈ CUST_REGION` gives 15 / 19 / 103 / 107 rows;
    `ORDERS ⟗ CATEGORY_REGION` gives 838 rows, with the 507 NULL-key orders; `KEY_VC15 ⟗ KEY_VC2` 5 rows and
    `KEY_DEC ⟗ KEY_NUM` 3 rows. ALLTYPES reads back as designed, `BI` as `9007199254740993` and `TS` as
    `2024-01-02T03:04:05.678000000+0000`.

**6.2.5 Runtime rule.**

- The engine matches a runtime's connection to a store **by exact element**, and with no match it **silently falls
  back to the first connection** ✅. Northwind queries ran against another database in tests.
- So the picker offers only runtimes whose store keys **exactly** contain the source database.
- Store keys are read from both runtime syntaxes: `connections[].store` and `connectionStores[].storePointers[]` ✅.
- Includes are ignored, and `localEngineRuntime` and dataspace pointers are treated as unresolvable (hidden).

**6.2.6 Schema resolution.** `{nodeId: |#>{db.schema.table}#}` goes into the batch endpoint (no `from()` needed),
and each result maps to a `Schema`.

Problem tables are flagged in the picker rather than crashing the canvas:

| Case                      | Behaviour                                     | Flag shown                           |
| ------------------------- | --------------------------------------------- | ------------------------------------ |
| a `BINARY` column         | the whole table's accessor fails ✅           | shown, "unavailable", not selectable |
| a view                    | every column is `Varchar(0)` ✅               | hidden in v1                         |
| a `CHAR(n)` column        | typed `Varchar(1)` ✅                         | "length unknown"                     |
| an `OTHER`/`ARRAY` column | typed bare `String`, values may be numbers ✅ | "type unknown" (untyped, §5.4)       |

**Settled before M1.7 (user, 2026-10-06): the engine types tables now, a local typer later.**

- M1.7 types tables with the engine, as above: `resolveSchemas` makes one batched `lambdaRelationType` call per
  load, and one per table picked. Downstream schemas are inferred by Cube, so the number of calls doesn't grow with
  the graph.
- Typing tables locally from the `Database` definition (no call per pick; column details for every table up
  front) replaces that one port method later, once legend-graph is fixed (the legend-graph issue list kept outside the repo, groups A,
  B, D and E; M2.0 or after). The Pure text still needs one engine parse per load either way.
- M1.7 records the engine's relation type of every table in the Cube Northwind + ALLTYPES fixture (the quoted,
  dotted table and the problem tables included) as an engine-backed parity test. The local typer must reproduce it
  exactly.

**6.2.7 Picker UI (slice).** A minimal dialog. M3 redesigns it.

1. Pick a model (bundled "Northwind (Cube fixture)" or "Paste Pure model…").
2. Pick a database, then a runtime filtered to it (§6.2.5; the filter needs the database, so it comes first —
   Settled before M1.8). A step with a single choice is picked automatically.
3. Pick schema → a table list with search, column counts and the flags above.

Confirming resolves the table first and then adds the node (§17.8: "lands with its schema populated"). The first
source fixes `context.model` and `context.runtime`; later picks are limited to that runtime's database.

### 6.3 Relational with depot (M3, outline)

The fetch sequence needs no graph build ✅📄:

1. depot `project-configurations` → versions.
2. In parallel: `GET …/versions/{v}/classifiers/meta::relational::metamodel::Database` and
   `…/classifiers/…Database/dependencies?transitive=true`. The responses are `DepotEntity` wrappers (Studio types
   them as `Entity[]`, which is wrong).
3. The same two calls for `meta::pure::runtime::PackageableRuntime`, filtered by §6.2.5.
4. Column types: batch with an **SDLC pointer** model context. Warm calls take 1–7 ms; a `combination` context
   recompiles every call; `*-SNAPSHOT` versions are re-fetched every call ✅.
5. Execute with the same pointer.

`getSchema` with a pointer is **not** used: it takes 3.3 s on 1,216 tables, is uncached, and omits views and
includes ✅.

### 6.4 Services (M9, outline)

**Approach:** no Pure construct references a Service inside a lambda ✅. Cube copies the service's lambda:

1. If it returns TDS, convert it via `POST /api/pure/v1/compilation/autofix/transformTdsToRelation/lambda` ✅.
2. Compile-check the result, since conversion output can fail.
3. Bind parameters with `let`.
4. Rename variables apart so they don't clash with other sources.
5. Add `from(mapping, runtime)` from the single or keyed execution.

**Persist:** `{gav, servicePath, executionKey?, parameterValues}` plus a hash of the converted lambda (D6).

**Unknowns:**

- embedded (non-packageable) runtimes need a synthesized runtime element;
- multi-execution key selection UX;
- parameters with enum or class types.

### 6.5 Pure functions returning a Relation (M9, outline)

A `function f(…):Relation<(…)>[1]` is callable inside the lambda, composes with accessors, and pushes down into a
single SQL statement ✅. Its type comes from the declared signature, and it has parameters. This covers spec §6.5
(PURE Native Function), and probably data-product function access points. It is the cheapest new source.

### 6.6 Data products (M9, outline)

- **Accessor:** `#P{dpPath.accessPointId}#` with a synthesized `LakehouseRuntime(environment, warehouse)` sent as
  `combination[pointer, runtime]`.
- **Schema:** the depot artifact's cached `lambdaGenericType`, which is precise.
- **Not in the open-source engine:** its parser knows only `[GQL, SQL, >, TDS]` ✅. Develop against mocks (D6).
- There are also native and model-access modes based on mappings. They may run on the open-source engine 💭.

**Unknowns:** the meaning of access-point `parameters` (always sent empty today), environment and entitlement
resolution, and which access modes Cube exposes.

### 6.7 Ingest (M9, outline)

- **Accessor:** `#I{ingestPath.dataset}#`, with the same lakehouse constraints.
- **Schema:** from the definition plus milestoning columns. Studio's helper drops sizes, so prefer an engine call.

**Unknowns:** consumer vs producer environment, the meaning of the `metadata` flag, and whether end users should see
ingest datasets directly.

---

## 7. C. Canvas and editors (slice)

### 7.1 Layout (provisional, D7)

The four regions of §17.1 are kept:

- a **sidebar palette**, collapsible, with state in local storage;
- a **graph toolbar**: name (`Unsaved Query`), Undo, Show Pure, Export spec / Import spec (dev);
- the **canvas**: collapsible, at most 60% of the viewport, with `presentation.showGraph` saved;
- a **grid toolbar** + **results grid**.

A resizable **side panel** on the right holds the node editor. A panel replaces the original popover, which removes
§17.5's nested-dismiss problem.

### 7.2 Canvas

- **Layout pipeline**, recomputed on each change as a pure function of `query`:
  1. Build a dagre `Graph({multigraph: true})` with `rankdir: 'LR'`.
  2. Insert nodes **sorted by id** and edges **sorted by `port + source + target`**, keyed by port (§17.3
     determinism, verified for dagre ✅). Invariant 3 means one node never feeds both ports of a Join (a self-join
     is two source nodes of one table), so the multigraph is a safeguard only.
  3. Run layout and convert centres to top-left (fixes §17.3 pitfall 1).
- **Nodes:**
  - Fixed size (200×72), with the icon and the `describe()` text clamped to two lines; the full text is in the
    tooltip. This avoids measuring, which keeps the layout deterministic.
  - React Flow keys nodes by `id`.
  - `nodesDraggable=false`: the user does not position nodes.
  - Zoom, pan, minimap and fit-view come from xyflow (fixes pitfall 5).
- **Binary ports:** one target handle per `node.ports` entry: Join's `leftTds` (upper) and `rightTds` (lower); a
  plain `BinaryNode` has `tds1`/`tds2`. Edges into binary nodes carry
  **visible** "Left"/"Right" labels (fixes pitfall 4). Dagre does not guarantee Left sits above Right, so crossing
  edges are acceptable 📄.
- **Node states:**

| State            | When                                       |
| ---------------- | ------------------------------------------ |
| normal           | valid                                      |
| **selected**     | capture node                               |
| **invalid**      | the node's own errors                      |
| **incomplete**   | `ERR_INCOMPLETE` / `isSchemasError`        |
| **resolving**    | a source schema request is in flight (new) |
| **engine error** | a host issue mapped back by node id (new)  |

The tooltip shows deduplicated errors first, then `describe()` (§17.3).

### 7.3 Interactions

All gestures from §17.4 are kept:

| Gesture                             | Effect                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| click a node                        | open its editor                                                                          |
| Ctrl/Cmd-click                      | make it the capture node                                                                 |
| drag a palette item onto the canvas | add the node, unconnected                                                                |
| drag a palette item onto a node     | add it and splice it in after that node                                                  |
| drag node A onto node B             | `connect`, else `move`                                                                   |
| right-click                         | legend-art `ContextMenu`: palette, then Select / Remove / Swap Inputs (show-but-disable) |
| Ctrl+Z, F9                          | undo, execute                                                                            |

- **New:** dragging from an output handle to a specific input handle calls `connect(source, target, port)`.
- **Live drop targets:** a node highlights only when `canConnect || canMove`.
- **Drag and drop wiring:** react-dnd. The canvas drop handler ignores drops already handled by a node
  (`monitor.didDrop()`). Draggable node bodies carry xyflow's `nodrag` class.

### 7.4 Editor shell

- **Header:** label, help text (§17.9), and the Select link or "(Selected)".
- **Edits are buffered** locally. **Apply** (or closing the panel) emits one replacement node, so there is one undo
  entry per edit (§17.5). Cancel discards.
- **If an upstream node is invalid,** the panel shows the upstream error instead of the editor (§17.5).
- **Column pickers** only offer columns from the actual input schema(s). Each column shows its type label and
  nullable marker.
- **Following the cube** (built in M1.8b S17, narrowing the user's answer to the panel with edits):
  - a panel with unapplied edits whose node is replaced or removed underneath (Undo, a re-check, Remove) closes
    without applying them and says so in the graph region;
  - a panel without edits shows the replacing node (e.g. after Refresh, or after Undo of its own Apply), and closes
    silently when the node is gone;
  - Import, and Undo back over an Import, always close it without applying, since another cube can hold a node with
    the same id.
- **Closing applies** (spec §17.5): clicking another node, or the panel's close button, applies first. Cancel drops
  the edits. A read-only cube never applies.

**The editor contract, for a new node type** (M1.8b S17). Every file is in `@finos/legend-cube-builder`:

1. `stores/editors/Cube<Type>Draft.ts`: a `CubeNodeDraft<N>` subclass, a MobX class holding the editor's state.
   - Its `build()` returns the node Apply stores, or `original` itself while nothing was edited.
   - The panel compares the codec encodings (`definition.spec.encode` plus `rest`), so a node that saves the same
     counts as no change and adds no undo step.
   - It is made once per open, again after each Apply or Swap Inputs, and again when a clean panel follows a
     replaced node, so keys made in it (e.g. filter rows) stay stable while the user edits.
2. Register its factory in `CUBE_NODE_DRAFT_FACTORIES` (`stores/editors/CubeNodeDraftRegistry.ts`). A type with
   nothing to edit (a source) registers an editor but no factory: it gets a read-only draft, and no Apply or Cancel.
3. `components/editors/Cube<Type>Editor.tsx`: an observer component taking `CubeNodeEditorProps`, registered in
   `CUBE_NODE_EDITORS` (`components/editors/CubeNodeEditorRegistry.ts`). It gets:

   - `draft`;
   - `inputSchemas`, in port order and all present: while an input is missing or invalid, the panel shows why
     instead of the editor;
   - `readOnly`;
   - `editorState`, for reads such as the model outline.

   Its edits go to its draft. A button that must change the document calls a `CubeNodeEditorState` method that
   applies the draft first and then rebinds to the new node, as `nodeEditor.swapInputs()` does: calling
   `editorState.applyQuery` (or `editorState.swapInputs`) directly replaces the node under unapplied edits, so the
   panel closes and drops them. A source, which has no draft, may call an `editorState` flow that stays outside the
   undo history (Refresh). The panel lists the edited node's problems (`node.validate`) under it, and owns Apply
   and Cancel.

4. The help text, in `CUBE_NODE_HELP_TEXT` (`__lib__/LegendCubeHelpText.ts`).
5. Its icon name, mapped to an icon in `NODE_ICONS` (`components/CubeNodeIcon.tsx`).
6. A test checks that every registered type has all of these (`CubeNodeEditorRegistry.test.ts`).

The palette, the context menu and the canvas need nothing more: they read the core `NodeRegistry` (label, icon
name, beta).

### 7.5 Join editor

- Join type: Inner, Left Outer, Right Outer, Full Outer.
- Paired rows of (left column from the left schema, right column from the right schema), with type labels. An
  incompatible pair is marked inline using the domain's compatibility check.
- Add or remove rows. The add button is disabled once every column is used (§17.6).
- A Swap Inputs button. It applies the panel's edits and swaps, as one undo step (M1.8b S18).
- When the duplicate-column error fires, the panel lists the offending names. The autofix comes in M2.
- A pair with no column picked on either side is not stored, as a Filter's blank rows aren't (M1.8b S18).
- A key on a column Cube typed as a bare String (OTHER or ARRAY) shows "type unknown" and is not blocked. The editor
  traces the column back to its table and reads the table's `untypedColumns` in the model outline, which it loads
  when it opens.

### 7.6 Filter editor

The §8.5 tree builder:

- Rows of (column, operator, value), And/Or groups, and a Not toggle.
- The operator list comes from §5.5 for the column's family.
- Value widgets per family (§5.6/§17.7), with multi-value entry for In/NotIn. Values are validated inline and stay
  marked as invalid in both display and edit modes.
- Unsupported constructs render "This filter is not supported yet." (§8.5).
- Blank conditions (no column, no value) are dropped wherever they are when the filter is stored, with the groups
  they leave empty. This extends the user's choice for a tree of only blank rows (M1.8b S19): an added row left
  untouched never becomes an error.
- A date-time input that leaves out zero seconds gets `:00` added, since a date-time literal needs its seconds
  (§5.6).

### 7.7 Source panel

Shows the coordinates read-only, the resolved schema as a table (name, type label, nullable), and **Refresh**, which
re-resolves the schema. A refresh that changes the schema shows a warning listing the drift. Refresh reuses the
import re-check (`reresolveSources` with one source): no undo step, the same node when the columns are the same, and
an earlier warning on that table cleared once it re-checks clean (M1.8b S17).

### 7.8 State (builder, MobX)

`CubeEditorState`:

| Field                                             | Contents                                                                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document` (`observable.ref`, immutable)          | the `CubeDocument`                                                                                                                                          |
| `history`                                         | undo: `CubeDocument` snapshots, at most 100; no redo in the slice (Settled before M1.8)                                                                     |
| `analysis` (`computed`)                           | `buildSchemasAndValidity(document.query, registry.queryRules)`: the query-level rules must be passed, the default is none                                   |
| `hostIssues` (`Map<nodeId, {firstLine, detail}>`) | engine errors mapped back to nodes                                                                                                                          |
| `warnings` (`Map<node key, …>`)                   | non-blocking: schema drift and failed re-checks (Settled before M1.8); keyed by node key, so a warning leaves with its node, and comes back with it on Undo |
| `pendingSources` (private, `observable.ref`)      | sources sent to the engine to be typed again; read through `isResolvingSources` and `isPendingSource(node)`                                                 |
| `modelOutlines` (private, by model)               | outlines loaded on demand by `loadModelOutline`, read through `modelOutline`, e.g. for the Join's 'type unknown' warning                                    |
| `execution` (`CubeExecutionState`)                | result, stale flag, stats, error                                                                                                                            |
| `nodeEditor` (`CubeNodeEditorState`)              | the open editor panel: `nodeId`, `draft`, `notice`; ephemeral, not saved (panel sizes stay in the component)                                                |
| `isPaletteCollapsed`                              | kept per user in user data, never in the cube                                                                                                               |

Every edit goes through `applyQuery(next)` (or `applyDocument` for a context change), which pushes onto history.
Import goes through `importDocument`, which pushes history and replaces the document itself, not through
`applyDocument`: it resets the run, the picker, the editor panel and the engine errors (warnings stay, keyed by
nodes the imported cube doesn't share), then re-checks the sources. Domain objects are immutable but not all frozen (only `Query`'s arrays are), so they are held as
`observable.ref` and MobX never observes them deeply.

**Settled before M1.8** (user, 2026-10-07; requirements `m18-requirements`, run `wf_b4b35e14-0fb`, kept in
`legend-cube-evidence/m18-requirements-result.json`). The canvas questions are asked at the start of M1.8b.

- **Before the canvas (M1.8a):** the graph region shows an interim read-only list of the query's nodes (`describe()`,
  errors, host issues, a capture marker) with a **Select** action. The canvas replaces it in M1.8b.
- **Host:** `CubeHost` gives the page the engine, the model catalog and Query's application store (commands, user
  data, clipboard, layout/theme, notifications, alerts, telemetry), as `QueryBuilderState` holds `applicationStore`.
  The engine config and the catalog stay host choices.
- **Picker order:** model → database → runtime filtered to it → schema → table (§6.2.7).
- **Route:** the Cube page loads lazily (`React.lazy` + `Suspense`), so the canvas stack stays out of Query's main
  bundle.
- **Engine errors:** the first line shows in the grid region (detail expandable) and on the failing node's row (later,
  on the canvas node). They clear on the next Execute and on any change to `document.query`. Picker errors stay in
  the picker and Show Pure errors in its dialog; no toasts.
- **Row limit:** default 1,000, kept in user data. A change marks results stale and doesn't re-run. Input commits on
  blur or Enter; a non-integer or a value below 1 is refused inline and the previous value kept. A soft warning shows
  above 100,000, with no hard cap. Truncation text: "Showing the first <limit> rows; the query returned more."
- **Grid display (slice):** headers show the column name, with the type label, nullable marker and full path in the
  header tooltip. Nulls show a muted `(null)`. Integer and Decimal values show their exact text, right-aligned and
  sorted numerically, with no grouping (formatting is M7). Dates and timestamps show as the engine returns them;
  booleans as true/false. Column widths pass through unchanged until M7.
- **Running:** while a query runs, Execute becomes **Stop**, which aborts it; leaving the page or importing aborts it
  too. Only the latest run's result is applied.
- **Telemetry:** the host passes telemetry through; Cube sends no events in M1.8. Events are designed with M3's entry
  points, with redaction from day one.
- **Undo:** `CubeDocument` snapshots, at most 100. Import is one undo step. Source re-resolution never pushes. No
  redo in the slice. A restored query is a new object (§4.3); an edit that left the query alone, such as a
  rename, keeps it, with its rows and engine errors (S6, 2026-10-07).
- **Export/Import spec:** always visible, labelled "(dev)"; it is the only way to save until M8. Import asks no
  confirmation (it can be undone) and never executes; Part B step 8 reads "import it, press F9". The check is that
  `serializeCubeSpec` gives the same text before and after, since nodes get fresh keys on decode.
- **Re-checking tables on import:** a source that fails to re-resolve keeps its saved snapshot and gets a warning
  ("could not re-check this table: …"). Schema drift shows as a non-blocking warning listing the changed columns. The
  answer applies, by node identity, to the cube shown and to the undo snapshots taken while it was pending, so Undo
  never brings back an unchecked table; "resolving source" shows while the cube shown holds a table being typed
  (`m18a-verify` fix, 2026-10-07).
- **Newer-version spec:** opens read-only with a banner. View, Execute and Show Pure work; edits, the picker, Undo
  and Export are disabled. Select (choosing the node to run) still works, and Import replaces the cube (S7, 2026-10-07).
- **Spec without a model or runtime:** opens editable with Execute disabled and a tooltip naming what is missing; no
  fix-up UI in M1.8.
- **Show Pure:** its own dialog with Copy, showing the engine's rendering of what Execute runs, row limit and
  literals included (e.g. `->limit(1001)`). `renderPure` sends the lambda as lossless text (the "numbers as 0" bug,
  fixed in `dcaf0efdb`).
- **Technical (decided without asking):** Query tests use a local fake engine (no `./test` export from the builder
  yet); the core gains small host-free helpers the UI needs (re-reading filter values against a schema, a schema
  diff, the display name of a table, the reason a capture subtree can't emit).

**Settled at the start of M1.8b** (user, 2026-10-07; all on the requirements' recommendation):

- **Palette source item:** "Relational Database Table" opens the source picker when clicked or dropped on empty
  canvas. It can't be dropped onto a node: palette drops onto nodes use `canAdd`, and sources have no ports. The
  palette and the context menu stay one list built from the registry.
- **Removing the last source:** when a Remove leaves the query empty, the same undo entry clears the context (model
  and runtime), so the next pick starts fresh.
- **Filter Apply with only blank rows:** an edited tree of untouched blank rows stores no filter. It counts as no
  change: no undo entry, and the node keeps "Filter cannot be empty."
- **A side-panel edit whose node changed underneath:** the panel records the key of the node it opened from. If that
  node is gone or its key changed (Undo, Remove, Import, re-check), the panel closes, discards its buffer and shows
  a short notice. The question was about a panel with unapplied edits; a panel without edits follows the node
  instead (§7.4).
- **Shortcuts while a Cube dialog is open:** Cube's command triggers return false while any Cube dialog is open
  (picker, Import, Show Pure). Picker and Import results are also re-checked when they are applied.
- **Join "type unknown" warning:** `CubeOutlineTable` gains `untypedColumns`, filled in `V1_CubeModelOutlineBuilder`
  (a port and `v1/` change, no core or saved-format change). The Join editor reads the outline of the document's
  model, loaded through the catalog when needed, once per model.

---

## 8. D. Execution

### 8.1 Decision: relation-function chain (D9)

| Criterion                     | (a) Relation-function chain                     | (b) Legend SQL                                                                                                                         |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Spec coverage                 | All 14 transforms (Difference emulated) ✅      | Same in theory; `EXCEPT`/`INTERSECT` unsupported ✅                                                                                    |
| Inline / unpublished model    | ✅                                              | REST `/api/sql/v1/*` requires depot or SDLC coordinates ✅. Only the `#SQL{}#` island takes an inline model, and only **as a leaf** ✅ |
| Precise types                 | Kept; casts keep parameters                     | SQL `CAST` collapses to base types ✅                                                                                                  |
| Errors mapped to canvas nodes | `sourceInformation.sourceId` echoed per node ✅ | No `sourceInformation` ✅                                                                                                              |
| Compile latency               | 15–23 ms                                        | 2.5–3× slower ✅                                                                                                                       |
| Generating from a DAG         | One function call per node, as structured JSON  | Text emitter, quoting, aliasing                                                                                                        |
| Precedent                     | Legend Data Cube                                | Studio SQL playgrounds only                                                                                                            |

Legend SQL stays useful as a future optional "SQL source" leaf node.

### 8.2 Pipeline

1. Take the capture node's upstream subtree. It is a tree, because invariant 3 forbids fan-out.
2. Each node's `emit(node, inputExprs)` builds the **Cube IR**.
3. Wrap the result: `capture->limit(rowLimit + 1)->from(runtime)`.
4. The builder's `v1/` serializer turns IR into protocol JSON and stamps `sourceInformation` on every node.
5. Execute: `{clientVersion:'vX_X_X', context:{_type:'BaseExecutionContext'}, function, model}`.

**Per-node schema conformance** (tests, and later engine-typed nodes) sends one prefix lambda per node (no `from()`)
to the batch endpoint.

### 8.3 Cube IR (core, host-free)

```ts
type IR =
  | { k: 'func'; name: string; params: IR[]; origin?: Origin }
  | { k: 'property'; name: string; receiver: IR; origin?: Origin }
  | { k: 'var'; name: string }
  | { k: 'lambda'; params: string[]; body: IR[] }
  | { k: 'literal'; value: LiteralValue; origin?: Origin }
  | { k: 'collection'; values: IR[] }
  | { k: 'colSpec'; name: string; fn1?: IR; fn2?: IR }
  | { k: 'colSpecArray'; specs: IR[] }
  | { k: 'storeAccessor'; path: [string, string, string]; origin?: Origin }
  | { k: 'elementPtr'; path: string } // the runtime only (Settled in M1.5) — never for types
  | { k: 'genericType'; path: string; params?: number[] } // type argument, e.g. of cast: genericTypeInstance
  | { k: 'enumValue'; enumPath: string; value: string; origin?: Origin } // JoinKind and enumeration values
  | { k: 'let'; name: string; value: IR }
  | { k: 'block'; statements: IR[] } // for §8.6, unused in slice
  | { k: 'raw'; json: unknown }; // escape hatch (Extend expressions)
type Origin = { nodeId: string; role: string };
```

- The core also has a **debug printer** that renders IR as fully parenthesized Pure-like text, for snapshot tests
  and logs. It is never sent to the engine.
- **Why JSON and not text:** Pure grammar has precedence traps. `a > 1 && b < 3` parses as `(a > 1 && b) < 3`, and
  prefix `!` binds tighter than `>` ✅. Text also mangles dotted names (§6.2.1).

### 8.4 Emission rules (slice)

**Source.** `storeAccessor([database, schema, table])` becomes `{_type:'classInstance', type:'>', value:{path:[…]}}`.

**Filter.** `->filter({row | <expr>})`. Variable names are fixed (`row`; `l`/`r` in join conditions), so they never
collide with column names, which are always accessed as properties.

| Operator                                          | Emitted                                                                                                                                        | SQL behaviour ✅                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Equal / GreaterThan / GTE / LT / LTE              | `equal`, `greaterThan`, `greaterThanEqual`, `lessThan`, `lessThanEqual`(`$row.c`, lit)                                                         | positive comparisons exclude NULLs                                                                       |
| StartsWith / EndsWith / Contains                  | `startsWith`, `endsWith`, `contains`(`$row.c`, string)                                                                                         | `LIKE`, with `%`, `_` and quotes escaped ✅; **not** `\`, so a value with a backslash is refused (below) |
| In                                                | `in($row.c, [lits])`                                                                                                                           | `IN (…)`                                                                                                 |
| IsEmpty                                           | `isEmpty($row.c)`                                                                                                                              | `IS NULL`                                                                                                |
| NotEqual, DoesNotStartWith/EndWith/Contain, NotIn | `not(<positive>)`; on a column Cube infers nullable, `isEmpty($row.c) \|\| not(<positive>)`                                                    | **includes NULLs** (D4): `c IS NULL OR NOT …`                                                            |
| IsNotEmpty                                        | `not(isEmpty($row.c))`                                                                                                                         | `IS NOT NULL` (excludes NULLs, by definition)                                                            |
| And / Or                                          | `and` / `or` (binary, folded left)                                                                                                             | –                                                                                                        |
| Not over a group                                  | **pushed down to the leaves (De Morgan)**: `not(and(a,b))` → `or(not a, not b)`; `not(or(a,b))` → `and(not a, not b)`; double negation cancels | keeps D4 for groups too                                                                                  |

- **Not over a group is never emitted as such.** The engine renders `not(<and/or>)` as SQL `NOT (… OR …)`, which
  drops NULL rows, contradicting D4 ✅. On ORDERS, `!(SHIP_REGION == 'BC' || SHIP_COUNTRY == 'France')` returns 306
  rows; pushed to the leaves it returns 736 = 830 − 17 − 77, the D4 answer ✅.
- A leaf negation of an operator without a negation pair (e.g. `!(x > 5)`) stays `not(<leaf>)`, never the opposite
  comparison (`<=` drops NULL rows).
- **Every negation of a column Cube infers nullable is `isEmpty($row.c) || not(<positive>)`** (M1.5 verification). The
  engine makes `not(…)` NULL-inclusive (`not (x is not null and x > 5)`) only for a column it types `[0..1]` itself,
  and an outer join does not widen its multiplicity (Appendix B). So after an outer join, `!($row.c->contains('a'))`
  on a column NOT NULL in its table became `not c like '%a%'` and dropped every NULL-padded row ✅. With the guard:
  ORDERS ⟕ CUSTOMERS[France], `COMPANY_NAME` DoesNotContain `'a'` returns 768 (was 15); CUSTOMERS ⟕ ORDERS,
  `Not(ORDER_ID > 10500)` returns 255 (was 253); a FULL merged key DoesNotStartWith `'W'` returns 843 (was 336); each
  matches an independent computation ✅. On columns the database declares nullable the guard is redundant and
  harmless (same rows) ✅. NotEqual and NotIn get it too, so Cube does not depend on the engine's `IS DISTINCT FROM`
  (D8). IsNotEmpty is the one negation without it: it excludes NULLs by definition.
- The saved filter shape (§10.3) is unchanged; the push-down is an emitter rule.
- `toOne()` is never inserted in filters: it breaks the NULL behaviour of negations ✅.

**Join.** Algorithm for the inputs `L`, `R`, pairs `(lk_i, rk_i)` and join type `T`:

1. `same = { n | lk_i == rk_i == n }`: the positionally identical keys. The duplicate rule guarantees every other
   shared name is already an error.
2. For each `n` in `same`, rename the side whose value is discarded to a temporary name:

   - INNER / LEFT: the right side's `n` becomes `n__cube_r`;
   - RIGHT: the left side's `n` becomes `n__cube_l`;
   - FULL: both.

   Temporary names must be unique against both schemas, adding a numeric suffix if needed. Each rename is one
   chained `->rename(~old, ~'new')`; the array form returns HTTP 500 ✅.

3. Build the condition: `and(equal($l.lk'_1, $r.rk'_1), …)`. **If Cube infers both keys nullable, wrap the left key
   in `->toOne()`.** That makes the SQL a plain `=`, so NULL keys don't match (D4). The engine default would be
   `IS NOT DISTINCT FROM`.
   - Verified for INNER, LEFT, RIGHT and FULL ✅. On `EMPLOYEES.REGION` ⋈ `CUSTOMERS.REGION`, both nullable, the
     result rows exactly equal an independently computed SQL-semantics join: 15 / 19 / 103 / 107 rows. Plain `==`
     adds 240 NULL×NULL pairs.
   - Plan generation for Postgres, Snowflake and SQL Server also emits a plain `=` ✅.
4. `->join(R', meta::pure::functions::relation::JoinKind.<INNER|LEFT|RIGHT|FULL>, {l, r | cond})`. Each node gets
   its join kind ✅. FULL is native everywhere except H2, where the engine emulates it ✅.
5. FULL only: `->extend(~[n: x | $x.'n__cube_l'->coalesce($x.'n__cube_r')])`. **When the two key types differ,
   append `->cast(@<common ancestor>)`** (§4.7) ✅:
   - **Parameterized types differing only in parameters** (`Varchar(15)` vs `Varchar(2)`, `Numeric(10,2)` vs
     `Numeric(12,4)`): without the cast, the extend types the key as a parameterless `Varchar`/`Numeric`. The
     mandatory trailing `select`, or any later operator, then fails to compile ("Wrong type variables count (0) for
     type: Varchar(x:Integer)") ✅. `cast(@String)` / `cast(@Decimal)` compiles, a downstream filter works, and the
     rows match an independent SQL-semantics FULL join (134 rows).
   - The cast's argument is a `genericType` IR node, serialized as `genericTypeInstance`. A `packageableElementPtr`
     compiles but silently types the result as `PrimitiveType` ✅.
   - **Other differing types:** the engine already unifies them (`Int`+`SmallInt` → `Integer`, `SmallInt`+`Double` /
     `SmallInt`+`Numeric` → `Number`), so the cast is harmless.
   - **Equal types:** keep their type (`Varchar(15)`), so no cast is emitted.
6. Always finish with `->select(~[<§7.11 order>])`. This orders the columns and drops the temporary columns ✅.

**Literals.** Typed by the column family (§5.8) and serialized losslessly: integer and decimal values are written as
raw numeric tokens from strings.

Settled in M1.5 (the plan leaves these open; the user confirmed them on 2026-10-06, with the D4 wording correction):

- **IR as built** (`src/ir/`): the §8.3 union, with `origin` on `func`, `property`, `literal`, `enumValue` and
  `storeAccessor` only; the serializer (M1.7) stamps the other kinds from their nearest ancestor. `RelationExpr` is an
  alias of the IR. Join kinds and enumeration values are both `enumValue` (one serializer rule); `elementPtr` is only
  the runtime.
- **Emitters** are on the registry's definitions (`emit(node, inputs, context)`, context = input schemas in port
  order and the node's own schema). `QueryEmitter` runs inference with the registry's query rules, emits a node's
  upstream tree (`emitRelation`), a typing lambda `{| <relation>}` and the execution lambda
  `{| <relation>->limit(rowLimit + 1)->from(runtime)}`. The limit is one computed integer literal; `rowLimit` must be
  a whole number ≥ 1 and the runtime is required. `canEmit` and `emitRelation` share one check: a node can be emitted
  when it and every node upstream of it are valid and of a registered type; otherwise `emitRelation` throws the
  reason.
- **Join:** temporary names `<n>__cube_l` / `<n>__cube_r`, then `…2`, `…3` until no column of either input (or an
  earlier temporary name) has it; renames chain in key order; key pairs fold left with `and`; one `extend` merges
  every same-named key of a FULL join, with the variable `x`; the cast's type is the merged type's `path` and
  `params`. The emitter checks that the renamed inputs share no name and that the `select` equals the join's
  inferred schema, so a mismatch fails in Cube, not as an engine HTTP 500.
- **Filter:** variable `row`; Not over a group is pushed to the leaves by recursion (a negation flips And/Or, takes a
  paired operator, or stays `not(…)` on an unpaired one); every negation but IsNotEmpty on a nullable column is
  guarded with `isEmpty` (above); a group of one rule emits that rule; enumeration values take their path from the
  column type.
- **No backslash in a LIKE pattern** (re-verification, 2026-10-06): the engine escapes `%` and `_` in the patterns of
  `startsWith`, `endsWith` and `contains` but not the escape character `\` (Appendix B), so on H2 `StartsWith 'CORP\'`
  matched 0 of 11 rows and `StartsWith 'Vin\s'` matched `Vins…`, negations included. No LIKE-free form works on the
  engine today (`substring` does not type-check on `[0..1]`, `indexOf` has no SQL), and pre-escaping in Cube would
  double-escape once the engine is fixed (D8). So the filter **refuses** a backslash in a StartsWith, EndsWith or
  Contains value (and their negations): the rule is invalid with "Filter values for "…" cannot contain a backslash
  (\) yet.", and the emitter throws if it ever sees one. Equal and In keep backslashes. Lift this when the engine is
  fixed.
- **Origin roles:** `accessor`; for a join `rename`, `join` (also its join kind), `condition`, `key`, `toOne`,
  `merge`, `mergeKey`, `coalesce`, `cast`, `select`; for a filter `filter`, `predicate` (including the `isEmpty` and
  `or` of a guard), `column`, `value` (literals and enumeration values); `limit` and `from` carry the capture node's
  id.
- **Debug printer:** valid Pure text, checked against the local engine (2026-10-06): the slice text parsed and returned
  the 19 rows; RIGHT, FULL (with a Not pushed down: 736 orders + the 2 customers without orders) and two-key LEFT
  ran too. Operators are infix with operator operands in parentheses, `!(…)` always parenthesized, everything else
  an arrow call; a body of several statements ends each with `;` (`{| 1; 2;}`: Pure rejects `{| 1; 2}`); names and
  enumeration values are single-quoted when not identifiers, and so are `true`, `false` and the constraint keywords
  `owner`, `externalId`, `function`, `message` and `enforcementLevel` (Pure lexes `~owner:` as one token), which
  Pure does not read as names; strings and quoted names escape `\`, `'`, newline, carriage return and tab (Pure rejects a
  raw line break in a string); floats always have a decimal point (Pure reads `1e3` as an element name), decimals end
  in `D`, dates start with `%`. Three known differences from the JSON, for M1.7's golden comparison: a negative number
  prints as `-3`, which Pure parses as `minus(3)`; a quoted dotted table name (`"a.b"`) prints as stored, which
  Pure splits into two segments; and `-9223372036854775808` (the smallest long) does not parse at all, as with the
  engine's own composer. A redact mode prints every literal, and every enumeration value with the `value`
  role, as `?`.
- **Not reachable from relational tables:** the FULL merged-key casts to `Date` (StrictDate with Date) and to
  `DateTime` (Timestamp with DateTime). Relational columns type as `StrictDate` and `Timestamp` (§5.1), and §5.4
  rejects StrictDate ⋈ Timestamp. M1.7 checks their shape on the engine with hand-built IR; the end-to-end check
  moves to M6, when Extend can produce these types (user, 2026-10-06). Planning verified the Varchar, Numeric and
  numeric ones.

### 8.5 Verified Northwind example (the slice's shape)

This lambda was run on the live engine just now. The Cube emitter must produce the equivalent protocol JSON, with
`row` instead of `x` and `sourceInformation` stamps:

```
|#>{showcase::northwind::store::NorthwindDatabase.NORTHWIND.ORDERS}#
  ->join(
      #>{showcase::northwind::store::NorthwindDatabase.NORTHWIND.CUSTOMERS}#->rename(~CUSTOMER_ID, ~'CUSTOMER_ID__cube_r'),
      meta::pure::functions::relation::JoinKind.INNER,
      {l, r | $l.CUSTOMER_ID == $r.'CUSTOMER_ID__cube_r'})
  ->select(~[CUSTOMER_ID, ORDER_ID, EMPLOYEE_ID, ORDER_DATE, REQUIRED_DATE, SHIPPED_DATE, SHIP_VIA, FREIGHT, SHIP_NAME,
             SHIP_ADDRESS, SHIP_CITY, SHIP_REGION, SHIP_POSTAL_CODE, SHIP_COUNTRY,
             COMPANY_NAME, CONTACT_NAME, CONTACT_TITLE, ADDRESS, CITY, REGION, POSTAL_CODE, COUNTRY, PHONE, FAX])
  ->filter(x | ($x.SHIP_COUNTRY == 'France') && ($x.ORDER_DATE >= %1997-01-01) && ($x.EMPLOYEE_ID->in([1, 4])))
  ->from(showcase::northwind::mapping::StoreRuntime)
```

- **Result:** 19 rows, as a single SQL statement:
  `… inner join … on ("orders_1"."CUSTOMER_ID" = "customers_0"."CUSTOMER_ID__cube_r") … where "SHIP_COUNTRY" = 'France'
and "ORDER_DATE" is not null and "ORDER_DATE" >= DATE'1997-01-01' and "EMPLOYEE_ID" in (1, 4)`.
  The 19 `ORDER_ID`s are {10454, 10459, 10470, 10493, 10511, 10525, 10546, 10584, 10628, 10634, 10671, 10755, 10789,
  10827, 10843, 10850, 10927, 10972, 11076} ✅.
  - Their **order depends on H2's plan**: INNER starts at 10584, while the same query with LEFT starts at 10454 ✅.
  - So tests compare row sets until Sort lands (M2).
- **Relation type** (with the shared model): 24 columns in exact §7.11 order ✅:

  - from ORDERS: `CUSTOMER_ID Varchar(5)[0..1]`, `ORDER_ID SmallInt[1]`, `EMPLOYEE_ID SmallInt[0..1]`,
    `ORDER_DATE StrictDate[0..1]`, `REQUIRED_DATE StrictDate[0..1]`, `SHIPPED_DATE StrictDate[0..1]`,
    `SHIP_VIA SmallInt[0..1]`, `FREIGHT String[0..1]`, `SHIP_NAME Varchar(40)[0..1]`, `SHIP_ADDRESS Varchar(60)[0..1]`,
    `SHIP_CITY Varchar(15)[0..1]`, `SHIP_REGION Varchar(15)[0..1]`, `SHIP_POSTAL_CODE Varchar(10)[0..1]`,
    `SHIP_COUNTRY Varchar(15)[0..1]`;
  - from CUSTOMERS: `COMPANY_NAME Varchar(40)[1]`, `CONTACT_NAME Varchar(30)[0..1]`,
    `CONTACT_TITLE Varchar(30)[0..1]`, `ADDRESS Varchar(60)[0..1]`, `CITY Varchar(15)[0..1]`,
    `REGION Varchar(15)[0..1]`, `POSTAL_CODE Varchar(10)[0..1]`, `COUNTRY Varchar(15)[0..1]`,
    `PHONE Varchar(24)[0..1]`, `FAX Varchar(24)[0..1]`.

  With the Cube fixture, `FREIGHT` becomes `Double[0..1]`.

- **Protocol shapes the serializer must produce:**

  - accessor: `{"_type":"classInstance","type":">","value":{"path":["showcase::northwind::store::NorthwindDatabase",
"NORTHWIND","ORDERS"]}}`
  - column name: `{"_type":"classInstance","type":"colSpec","value":{"name":"CUSTOMER_ID"}}`
  - column list: `{"_type":"classInstance","type":"colSpecArray","value":{"colSpecs":[{"name":…},…]}}`
  - join kind: `{"_type":"property","property":"INNER","parameters":[{"_type":"packageableElementPtr","fullPath":
"meta::pure::functions::relation::JoinKind"}]}`
  - lambdas: `{"_type":"lambda","parameters":[{"_type":"var","name":"l"},…],"body":[…]}`
  - literals: `{"_type":"strictDate","value":"1997-01-01"}`, `{"_type":"integer","value":1}`
  - collection (the In list): `{"_type":"collection","multiplicity":{"lowerBound":n,"upperBound":n},"values":[…]}`.
    The engine's parser always writes `multiplicity`; execution works without it ✅. The serializer emits it, so
    golden comparisons are exact.
  - cast type argument: `{"_type":"genericTypeInstance","genericType":{"rawType":{"_type":"packageableType",
"fullPath":"String"},"typeArguments":[],"multiplicityArguments":[],"typeVariableValues":[]}}`. Precise targets carry
    `typeVariableValues`, e.g. `[{"_type":"integer","value":30}]` for `Varchar(30)` ✅.
  - runtime: a `packageableElementPtr` as the second parameter of `from`.

  M1.7 locks these in with golden tests against the engine's own parse of the Pure text. The comparison strips
  `sourceInformation`, and the golden text includes the capture wrapper (`->limit(rowLimit + 1)`).

- **Slice acceptance variants** (all ✅ with the shared model):
  - France only → 77 rows.
  - LEFT (`CUSTOMERS ⟕ ORDERS`) shows unmatched FISSA and PARIS with null order columns. Cube marks those columns
    nullable; the engine's relation type wrongly says `[1]`.
  - RIGHT (`ORDERS ⟖ CUSTOMERS`) returns 832 rows. FISSA and PARIS have `CUSTOMER_ID` from the right side and a
    NULL `ORDER_ID`.
  - FULL (`CUSTOMERS[COUNTRY == 'France'] ⟗ ORDERS[SHIP_COUNTRY == 'Germany']`, coalesced key) returns 133 rows: 11
    customer-only, 122 order-only, and no NULL merged key.

### 8.6 Window isolation (designed now, used from M5)

A single-form window extend followed by a filter puts the predicate into the same `WHERE`, **before** the window, on
every database. The result is wrong rows: France's count came back as 2 instead of 77 ✅. On SQL Server, Oracle,
Trino, DB2 and Sybase a filter that names the window column is **silently dropped** ✅. The rule:

- Emit window functions in array form (`~[…]`).
- Ranking columns and aggregate columns go in separate `extend`s. One shared extend throws a ClassCastException ✅.
- Bind the output of every window-producing node that is not the sink with `let n_<id> = …;`.
- When any `let` exists, wrap the whole query once as `{| <lets>; <sink> }->from(runtime)`. A `from()` inside a `let`
  fails, and a trailing `from()` after `let`s fails ✅. So **one runtime per query** in this form.

A 156-pair / 92-triple regression matrix with a JS reference gave 0 failures with this rule ✅.
Per-node typing, `sourceInformation`, Pure rendering and lambda parameters all keep working in the `let` form ✅.
Never put a `let` after a Sort: `ORDER BY` inside a CTE is lost, and SQL Server rejects it ✅📄.

### 8.7 Engine port and Legend adapter (builder)

```ts
// `model` is the document's saved model context (§6.2.2), sent as it is
interface CubeEngine {
  loadModel(model: ModelContext): Promise<CubeModelOutline>; // parsed once: databases and runtimes as plain data
  resolveSchemas(
    model: ModelContext,
    accessors: ReadonlyMap<NodeId, AccessorPath>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  typeLambdas(
    model: ModelContext,
    lambdas: ReadonlyMap<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  execute(
    model: ModelContext,
    lambda: IR,
    options?: { abortController?: AbortController }, // the client takes an AbortController, not a signal
  ): Promise<CubeResult>; // {columns, rows, sql[], durationMs}
  renderPure(lambda: IR): Promise<string>; // JSONToGrammar PRETTY, display only
}
```

`V1_LegendCubeEngine` (under `v1/`) implements it with
[V1_EngineServerClient](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts):

| Port method  | Client call(s)                                                                                                                                                                             | Line   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `loadModel`  | `grammarToJSON_model`                                                                                                                                                                      | `:405` |
| typing       | `batchLambdasRelationType`, reading `result ?? results` and deserializing each with `V1_relationTypeModelSchema`                                                                           | `:820` |
| `execute`    | `runQuery(body, { returnAsResponse: true, abortController })`, then `parseLosslessJSON(await response.text())`. Without `returnAsResponse` the client ends in a lossy `response.json()` 📄 | `:856` |
| `renderPure` | `JSONToGrammar_lambda`                                                                                                                                                                     | `:565` |

- **Execution results** are parsed **losslessly** (raw tokens keep their text, e.g. `12.30` ✅). Each cell's JS type
  is decided **per column** from the type the result builder gives (`builder.columns[].type` ✅): Integer and
  Decimal family values are their exact text (`"9007199254740993"`, `"12.30"`, `"5"`), Float family values are
  numbers, dates are strings and booleans are booleans (Settled before M1.7). SQL comes from `activities[]` where `_type == 'relational'`. A 200 response with an unparseable body is reported as
  an execution error, because the engine can stream a stack trace into a 200 ✅.
- **Request bodies** that carry integer or decimal literals are produced with `stringifyLosslessJSON` and passed as
  a pre-stringified string, cast to the client's `PlainObject` parameter type. The client sends string bodies
  verbatim 📄.
- **Error mapping:** every emitted node gets `sourceInformation.sourceId = "cube:<nodeId>:<role>"`, including the
  accessor's `value` object. The engine echoes the **innermost** failing node's stamp in compile errors, including
  per-key in batch ✅. The adapter turns these into `CubeEngineError`s by node id (Settled before M1.7), which M1.8a
  turns into host issues; the first line goes on the node and the full text in the panel. Plan-time and database errors carry no location, so they attach to the capture node.
- **Graph-manager wrappers are bypassed** for typing on purpose: they drop parameters and the batch wrapper throws
  (D8). A tracer service must be set on the client, or every call throws 📄.

**Settled before M1.7** (user, 2026-10-06; requirements `m17-requirements`, run `wf_7f344217-230`, kept in
`legend-cube-evidence/m17-requirements-result.json`). Engine facts probed the same day (`m17-probes/`): a table with
a `BINARY` column fails **alone** in the batch call, the other keys still type ✅; `compilation/compile` accepts a
`text` context ✅; `execute` returns each column's type in `builder.columns` ✅.

- **Fixture:** the extra `CUBETEST` tables of §6.2.4.
- **Date/DateTime casts:** a shape check now, the end-to-end check in M6 (§8.4).
- **Numbers in results:** by type family, per column (above).
- **Row limit:** the adapter returns every row it receives (up to limit + 1); M1.8a's editor state shows `limit`
  rows and the truncation warning. The port never sees the limit.
- **Picker flags** (§6.2.6: BINARY unavailable, views hidden, CHAR length unknown, OTHER type unknown) are read from
  the `Database` definition in `loadModel`'s `CubeModelOutline`, in `v1/`. No extra engine calls, no core or saved
  format change. The parity test still records the engine's answer for those tables.
- **`CubeEngineError`** is a class: `nodeId?`, `role?` (the stamp's emit role), `firstLine`, `detail`, and a `kind` (`compile`, `execution`,
  `unsupportedModel`, `network`). Typing returns one per key; `execute` rejects with one, on the stamped node or
  else the capture node. A whole-call failure gives one for every key.
- **An unsupported model kind** gives _This cube's model kind "<\_type>" isn't supported yet._, from the builder
  (the core never reads the model). `loadModel`, typing and `execute` all give it without calling the engine.
- **Parity test format:** a checked-in JSON file under the builder's tests with the engine's raw terms per fixture
  table (column name, type path, parameters, multiplicity; a failing table stores its error's first line),
  compared exactly, plus a check through the adapter. Not a Jest snapshot, so `-u` can't accept an engine change;
  the failure message says the engine's typing changed.
- **Lambda tests:** offline tests against checked-in expected JSON, plus engine tests (A.11) that compare with the
  engine's own parse of the same Pure text.
- **Engine tests** follow the repo convention: `*.engine-roundtrip-test.ts` runs in a plain `yarn test` and fails
  without an engine; `yarn test:group core` skips it. Nothing skips automatically.

### 8.8 Full mapping: spec constructs → lambda

Engine support codes: **H2** = run live ✅. **PCT** = passes the engine's portability tests on Snowflake, Postgres,
DB2, SQL Server, Databricks, DuckDB, Oracle and Trino unless noted.

**Transforms (§7)**

| Spec           | Lambda construct                                                                                                                                                                                                | Engine support                                                                                      | Fallback / notes                                                                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source (table) | `#>{db.schema.table}#` + one `->from(rt)`                                                                                                                                                                       | H2, PCT                                                                                             | Problem tables flagged (§6.2.6)                                                                                                                                                                                                                                                                                        |
| **Filter**     | `->filter({row \| …})`                                                                                                                                                                                          | H2, PCT                                                                                             | §8.4 table                                                                                                                                                                                                                                                                                                             |
| **Join**       | rename temps → `->join(R, JoinKind.X, {l,r \| …})` → (FULL: coalesce extend) → `->select(~[…])`                                                                                                                 | H2 all 4 kinds; FULL native on 9 databases, emulated on H2                                          | Engine rejects any duplicate name ✅ (hence the algorithm); `->toOne()` for SQL NULL semantics                                                                                                                                                                                                                         |
| Sort           | `->sort([~a->ascending(), ~b->descending()])`                                                                                                                                                                   | H2, PCT                                                                                             | Only meaningful at the sink or before Limit/Drop/Slice (lost inside subqueries) → warning in M2                                                                                                                                                                                                                        |
| Group          | `->groupBy(~[k…], ~[n: x \| $x.c : y \| $y->agg()])`; no keys → `->aggregate(~[…])`                                                                                                                             | H2, PCT                                                                                             | `groupBy(~[], …)` throws NPE ✅; no aggregations → NPE (spec requires ≥ 1 anyway)                                                                                                                                                                                                                                      |
| Restrict       | `->select(~[…])` listed **in input-schema order**                                                                                                                                                               | H2, PCT                                                                                             | `select` keeps the order you list ✅                                                                                                                                                                                                                                                                                   |
| Rename         | one `->rename(~old, ~'new')` per mapping                                                                                                                                                                        | H2, PCT                                                                                             | Array form returns 500 ✅                                                                                                                                                                                                                                                                                              |
| Distinct       | `->distinct()`                                                                                                                                                                                                  | H2, PCT                                                                                             | –                                                                                                                                                                                                                                                                                                                      |
| Drop           | `->drop(n)`                                                                                                                                                                                                     | H2; **fails PCT on SQL Server and DB2** (`limit m,-1`); Sybase emits the same SQL (no PCT module)   | Fallback for SQL Server, DB2 and Sybase: `extend(over([<upstream Sort keys, else first column ascending>]), ~[cube_rn: {p,w,r \| $p->rowNumber($r)}])->filter(rn in range)->select(<input columns>)`; never `over([])`. The emitter folds the feeding Sort's keys into `over()`. Verified on all 10 dialects' plans ✅ |
| Limit          | `->limit(n)`                                                                                                                                                                                                    | H2, PCT                                                                                             | –                                                                                                                                                                                                                                                                                                                      |
| Slice          | `->slice(start, stop)`, range `[start, stop)` (D5)                                                                                                                                                              | H2; **fails PCT on SQL Server** (`limit m,n`); DB2 passes; Sybase emits `limit m,n` (no PCT module) | rowNumber fallback, as Drop, for SQL Server and Sybase                                                                                                                                                                                                                                                                 |
| Concat         | `->concatenate(R)`                                                                                                                                                                                              | H2, PCT (`UNION ALL`)                                                                               | Names, order **and precise types** must match exactly ✅. Column-count mismatch is not caught (NPE at execution) ✅ → Cube validates. Widen autofix uses a real conversion (`toString()`), not `cast`                                                                                                                  |
| Difference     | **No relation function.** Rename `x→x_1`/`x_2`, keys → temps; `join(FULL)`; `extend` (keys `coalesce`; `x_valueDifference: x_1->coalesce(0)->toFloat() - x_2->coalesce(0)->toFloat()`); `select` in §7.12 order | Emulation H2 ✅                                                                                     | **Gap:** legacy `columnValueDifference` is TDS-only and differs from §7.12. Spec semantics kept (D5)                                                                                                                                                                                                                   |
| Partition      | `->extend(over(~[p…], [~s->ascending()]), ~[n: {p,w,r \| $r.c} : y \| $y->agg()])`; ranks in a separate `extend` with `{p,w,r \| $p->rank($w,$r)}`; `let`-isolated (§8.6)                                       | H2, PCT for ranking with ORDER BY and `size()`                                                      | **Gap:** window `count()` loses its OVER clause → emit `size()` ✅. Rank without a sort fails → validation. No partition → `over([sorts])`; neither → `over([])`                                                                                                                                                       |
| Extend         | `->extend(~[n: row \| <expr>])`, expression as `raw` IR from `grammarToJSON_valueSpecification`                                                                                                                 | H2                                                                                                  | Type from engine typing over an empty model (§5.7)                                                                                                                                                                                                                                                                     |
| Unknown        | –                                                                                                                                                                                                               | –                                                                                                   | Not executable (§7.16)                                                                                                                                                                                                                                                                                                 |

**Filters (§8):** §8.4 above. Every operator works on nullable columns directly ✅.

- **Gaps:**
  - enum equality after a class projection compares against the stored source value and returns wrong rows ✅.
    Dormant for tables; workaround `->toOne()->toString() == 'X'` when enum sources arrive.
  - Boolean columns need `== true` as a bare predicate (a nullable bare `$r.B` does not compile) ✅.

**Aggregations (§10):**

| Spec                   | In `groupBy` / `aggregate`             | In a window                               | Notes                                                                                                                        |
| ---------------------- | -------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Count                  | `$y->count()`                          | **`$y->size()`**                          | Non-null count (D4)                                                                                                          |
| DistinctCount          | `$y->distinct()->count()`              | `$y->distinct()->size()`                  | Window form not covered by PCT; likely fails on Postgres, SQL Server, Databricks, Trino 💭 → fallback: `groupBy` + join back |
| DistinctValue          | `$y->uniqueValueOnly()`                | same                                      | SQL `case when count(distinct x)=1 then max(x) end`                                                                          |
| Sum, Average, Min, Max | `sum()`, `average()`, `min()`, `max()` | same                                      | Never emit `1.0*`: the engine already does for `average` ✅                                                                  |
| Rank, DenseRank        | –                                      | `$p->rank($w,$r)`, `$p->denseRank($w,$r)` | Need ≥ 1 sort ✅; never emit a frame with ranking ✅                                                                         |

**Window functions beyond the spec** (available later): `rowNumber`, `ntile`, `percentRank`,
`cumulativeDistribution`, `lag`, `lead`, `first`, `last`, `nth` all work on H2 ✅.

**Extend expressions (§9):**

- Every §9.2 function maps to a Pure function, except six TDS names that **do not exist in Pure** ✅: `stringContains`
  → `contains`, `stringIndexOf` → `indexOf` (on `toOne()`), `stringConcatenate` → `+`/`joinStrings`, `absolute` →
  `abs`, `mostRecentDayOfThisWeek`/`previousDayOfThisWeek` → the one-argument `mostRecentDayOfWeek`/`previousDayOfWeek`.
- `dayOfWeek()` returns an enum and fails at plan time; use `dayOfWeekNumber()` ✅.
- Row-level `mean`/`stdDev*` over lists compile as aggregates and fail on H2 ✅; they move to §10 only.
- `parseDate` accepts only `yyyy-MM-dd HH:mm:ss` on H2 ✅.
- `toDecimal` truncates the scale to 0 on H2 ✅.
- Validate Extend with a `generatePlan` for the real store, to catch plan-time failures (M6).

### 8.9 Gaps summary

| Gap                                                                | Handling                             |
| ------------------------------------------------------------------ | ------------------------------------ |
| No Difference relation function                                    | Emulation                            |
| Window `count()`                                                   | `size()`                             |
| Window filter pushdown                                             | `let` isolation                      |
| Slice on SQL Server and Sybase; Drop on SQL Server, DB2 and Sybase | rowNumber fallback (sorted `over()`) |
| Exact comparison on 32-bit REAL columns                            | Inline hint (§5.5); tests avoid it   |
| Windowed DistinctCount portability                                 | `groupBy` + join                     |
| Engine ignores join/filter value types                             | Cube validation                      |
| Outer-join and aggregate multiplicity                              | Cube infers nullability              |
| `CHAR`/`BINARY`/view typing                                        | Picker flags                         |
| `#P`/`#I` not in the open-source engine                            | Mocks (D6)                           |

Every engine defect is listed in Appendix B.

---

## 9. Results grid (§12–13 adapted)

**Slice:**

- `@finos/legend-lego/data-grid` `DataGrid` (enterprise, D3), client-side row model.
- Columns come from Cube's **inferred** schema, not from the result builder, which is lossy.
- Column ids are positional (`c0…cN`) with `headerName = column name`. ag-grid treats dots in `field` as nested
  paths, and column names may contain dots or spaces.
- Alignment, sorting and formatting follow the type family. Integer and Decimal values arrive as exact text (§8.7).
- **Execution is explicit:** Execute or F9. Edits mark results **stale** (§12.1).
- **Row limit:** user-settable, kept in local storage, default 1,000. Cube emits `->limit(limit + 1)` to detect
  truncation and warn. The original fetched everything and truncated client-side (§12.7).
- **Stats:** duration and SQL, with a copy button.
- **Errors** render inside the grid region, with the first line of the message and expandable detail (§17.13).

**Later (M7):**

- Server-side mode on the enterprise SSRM, with drill-down (§12.2) **derived as lambdas**: filter by the expanded
  keys, `groupBy` the next level, sort, slice. The user's graph is never touched.
- A bounded LRU cache keyed by the derived lambda (fixes §21's unbounded cache).
- Typed group keys with an out-of-band null marker instead of the `"(null)"` string sentinel.
- Export: CSV through the engine (`serializationFormat=CSV`), XLSX through ag-grid's enterprise `ExcelExportModule`.
  The engine has no XLSX format ✅.
- The context menu's quick actions create real nodes.
- Column formatting (§13) with the §21 fixes: red-if-negative wiring, ISO currency codes.

---

## 10. E. Artifacts and save/load

### 10.1 Query graph model

| Aspect     | Answer                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Shape      | `CubeDocument { context: {model: ModelContext; runtime?}; query: Query (nodes, connections, selected); meta: Meta }`, as §4 |
| Owner      | `@finos/legend-cube`. Immutable classes; every edit makes a new `Query`                                                     |
| Round trip | ↔ CubeSpec via the core codec (§10.3). The UI never holds a second copy of the truth                                       |
| Versioning | None of its own; versioned through the spec's `formatVersion`                                                               |
| Storage    | In memory (MobX `observable.ref`) while editing                                                                             |

### 10.2 Executed lambda / value specification

| Aspect     | Answer                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shape      | Cube IR (core) → protocol JSON (builder `v1/`)                                                                                                                                                                                                         |
| Owner      | Core emits it; builder serializes it                                                                                                                                                                                                                   |
| Round trip | **One-way.** Nothing parses lambdas back into graphs, because there is no unique inverse, user-written Pure is limited to Extend expressions, and dotted names don't survive text ✅. Shown read-only via "Show Pure" (`JSONToGrammar_lambda`, PRETTY) |
| Versioning | N/A. Regenerated from the graph every time; deterministic for a given graph and emitter version                                                                                                                                                        |
| Storage    | **Not persisted.** The future Cube store may keep a generated copy for search or impact analysis, but never as the source of truth                                                                                                                     |

### 10.3 Saved spec: `CubeSpec` format v1 (the persisted artifact; D1: defined now, stored later)

```jsonc
{
  "formatVersion": 1,
  "name": "French orders 1997",
  "context": {
    "model": {
      "_type": "text",
      "code": "###Relational\nDatabase showcase::northwind::store::NorthwindDatabase\n(…)…",
    }, // M3: { "_type": "pointer", "sdlcInfo": {…} }
    "runtime": "showcase::northwind::mapping::StoreRuntime",
  },
  "query": {
    "selected": "filter101",
    "nodes": [
      {
        "kind": "relational",
        "id": "relational101",
        "database": "showcase::northwind::store::NorthwindDatabase",
        "schema": "NORTHWIND",
        "table": "ORDERS",
        "schemaSnapshot": [
          {
            "name": "ORDER_ID",
            "type": { "path": "meta::pure::precisePrimitives::SmallInt" },
            "nullable": false,
          },
          {
            "name": "CUSTOMER_ID",
            "type": {
              "path": "meta::pure::precisePrimitives::Varchar",
              "params": [5],
            },
            "nullable": true,
          },
          /* … */
        ],
      },
      {
        "kind": "relational",
        "id": "relational102",
        "database": "…",
        "schema": "NORTHWIND",
        "table": "CUSTOMERS",
        "schemaSnapshot": [
          /* … */
        ],
      },
      {
        "kind": "join",
        "id": "join101",
        "inputs": ["relational101", "relational102"],
        "joinType": "INNER",
        "leftColumns": ["CUSTOMER_ID"],
        "rightColumns": ["CUSTOMER_ID"],
      },
      {
        "kind": "filter",
        "id": "filter101",
        "inputs": ["join101"],
        "filter": {
          "op": "and",
          "rules": [
            {
              "column": "SHIP_COUNTRY",
              "operator": "Equal",
              "value": { "kind": "string", "value": "France" },
            },
            {
              "column": "ORDER_DATE",
              "operator": "GreaterThanOrEqual",
              "value": { "kind": "strictDate", "value": "1997-01-01" },
            },
            {
              "column": "EMPLOYEE_ID",
              "operator": "In",
              "value": [
                { "kind": "integer", "value": "1" },
                { "kind": "integer", "value": "4" },
              ],
            },
          ],
        },
      },
    ],
  },
  "meta": {
    "presentation": {
      "showGraph": false,
      "columnWidths": [{ "column": "COMPANY_NAME", "width": 180 }],
    },
  },
}
```

Rules:

- **Edges are inlined as `inputs`.** Each node lists its port-ordered `inputs: (nodeId | null)[]`, with `null` for an
  unconnected port. There is no connections array; connections are rebuilt as `Connection(inputs[i] → node,
ports[i])`. This is the shape of §14.1's suggestion without the TDS wire types.
- **`kind` is the node type** from the registries. `id` follows the per-type generator.
- **Filters are stored as a tree with explicit `op`** (`and` / `or` / `not`) and comparisons `{column, operator,
value}`. **Negations are stored as negated operators** (`NotEqual`, `NotIn`, …); `not` wraps groups, and comparisons whose operator has no negated one (`{op: 'not', rule}`, Settled in M1.6). This
  replaces the TDS encoding of §8.4.
- **Values are typed** `{kind, value}`, with numbers as strings (lossless, §5.6).
- **Schema snapshots** on sources make offline inference possible on load (§1: no server round trip for editing).
  On load the host re-resolves the schema and diffs it. Drift becomes a node warning, and the fresh schema wins.
- **Forward compatibility:**
  - unknown top-level keys are kept in `spec.rest`;
  - unknown keys on known nodes are kept in that node's `rest`;
  - unknown `meta` keys are kept in `meta.rest` (§13);
  - unknown node kinds become `UnknownNode`, keep their raw JSON and inputs, and are re-saved verbatim.
- **No object keys come from user data:** column names live only in values, arrays use `{name, …}`. The JSON is
  always produced with `JSON.stringify`, and a client-side size cap applies (1 MiB). Each choice prevents a verified
  hazard in the engine's Mongo stores: nulls dropped, keys re-sorted, extended-JSON reinterpreted, and documents that
  can no longer be read ✅.
- **Versioning:**
  - `formatVersion` is an integer.
  - Additive changes don't bump it (unknown fields survive).
  - A breaking change bumps it and adds a `migrate_vN_to_vN+1(json)` step; older documents migrate on load.
  - A document newer than the reader opens **read-only** with a banner.
  - Until the Cube store exists (M8) the format is marked **draft**, so changes stay cheap, but every change still
    goes through the codec's tests.
- **Slice behaviour:**
  - The codec and round-trip tests ship in M1.6.
  - The UI has a dev-only **Export spec** (copy to clipboard or download `.cube.json`) and **Import spec** (paste or
    upload). This lets the POC's state be saved locally and exercises the round trip.
  - There is **no store, no Load dialog and no server save** (D1).
- **What needs a valid query.** Spec §14.4 disables Save while the query is invalid, and §17.11 makes Execute
  require a valid query, i.e. every node valid (§4.4). Taken literally, three things break: `null` inputs could never
  be saved, an Unknown node could never be re-saved, and a stray unconnected node would block Execute. So:
  - **Export spec is allowed for invalid queries.** The format carries `null` inputs and Unknown nodes for exactly
    this reason.
  - **Execute (F9) is enabled iff every node in the capture node's upstream subtree is valid**, including query-level
    rule errors on its sources. Invalid nodes outside that subtree don't block it, since only the subtree is executed
    (§8.2).
  - Server-side **Save** gating is decided in M8.

Settled in M1.6 (the plan leaves these open; the user chose the first five on 2026-10-06, the fifth, the model
context, after reviewing the samples; the rest are defaults shown with the sample specs):

- **Not around a comparison** without a negated operator (e.g. Not(GreaterThan)) is `{op: 'not', rule: {…}}`, the
  same wrapper as around a group. The codec never normalizes the tree: it writes rules as the node holds them.
- **Invalid values** are stored as `{kind: 'invalid', text}` and decoded unchanged. Re-reading them against the
  table types is a separate step after the host re-resolves sources (wired in M1.8a), so load round-trips exactly.
- **What a reader can't understand degrades to the smallest part**, so an older Cube can open a newer document:
  - an unreadable filter rule (unknown `op` or operator, unknown value kind, malformed value, an unknown key on a
    rule or value) becomes an **unsupported rule** that keeps its JSON, is re-saved verbatim and is invalid with
    "This filter is not supported yet."; the rest of the filter stays editable;
  - a known node whose settings can't be read (e.g. `joinType: 'CROSS'`) becomes an **Unknown node** that keeps its
    JSON, its kind and its inputs;
  - a missing or wrongly typed required field (no `database`, a non-array `leftColumns`, a non-boolean `nullable`,
    a known field set to `null`; unknown keys and an Unknown node's JSON keep their nulls) and a model that is not an
    object with a non-empty string `_type` are still **decode errors**. A model of a `_type` the builder can't run is
    not (§6.2.2).
- **Unknown keys are kept on every object**: top level, `context`, `query`, nodes, snapshot columns and
  types, `meta`, `presentation`, width items. Rules and values are the exception above (unsupported), since ignoring
  a key such as `caseInsensitive` would change the rows. A snapshot column's unknown keys (on the column or its
  type) live on the source node by column name; when the host re-resolves the source they stay with the columns that
  still exist.
- **The model is the engine's model context** as plain JSON (§6.2.2): `{_type: 'text', code}` in the slice,
  `{_type: 'pointer', sdlcInfo}` from M3. It is kept whole and re-saved exactly as read. The sample specs hold a
  short stub `code`, since the codec never parses Pure; M1.7 gives them the Cube Northwind text and checks on the
  engine that they compile.
- **Shape:** keys in the order of the §10.3 example, known keys first and unknown ones after them in the order read;
  anything absent or at its default is left out (`name`, `context` before the first source, `runtime`,
  `selected` on an empty query, `schemaSnapshot` when not resolved, `filter`, `value`, `params`, `meta`,
  `presentation`, `showGraph` when true, empty `columnWidths`); `inputs` (with `null`), `joinType` and the key
  lists are always written. An enumeration column's type is `{path, values: [...]}`. Spec JSON is always produced
  with `JSON.stringify`; fixtures are Prettier-formatted and tests compare key order, not whitespace.
- **Decoding** returns `{document, formatVersion, readOnly}`. A broken document throws one error with a JSON path
  (e.g. `query.nodes[2].database`). `formatVersion` is a whole number ≥ 1; an older one migrates step by step; a
  newer one decodes with these rules and is **read-only**. Ids are kept as saved. `name` is top level and
  optional. The 1 MiB cap counts UTF-8 bytes, on import and export.

### 10.4 UI state

| State                                                       | Saved?      | Where                                        |
| ----------------------------------------------------------- | ----------- | -------------------------------------------- |
| Canvas node positions                                       | No: derived | Pure function of the query (§7.2)            |
| Capture node                                                | Yes         | `query.selected`                             |
| Graph panel collapsed (`showGraph`)                         | Yes         | `meta.presentation` (§17.1 [why])            |
| Grid column widths, and later formats and drill-down        | Yes         | `meta.presentation` / `meta.drilldown` (§13) |
| Open editor, panel sizes, zoom and pan, selection highlight | No          | ephemeral                                    |
| Sidebar collapsed, row limit                                | Per user    | local storage (§17.1, §12.7)                 |
| Undo history                                                | No          | session                                      |

### 10.5 How Legend Query persists today, and why Cube doesn't use it

Findings: engine `legend-engine-application-query`, Studio
[Query.ts](../../../packages/legend-graph/src/graph-manager/action/query/Query.ts),
[QueryEditorStore.ts:556-585](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts:556).

- **`content` must be Pure-lambda text.** Legend Query re-parses it on load
  ([QueryEditorStore.ts:2662](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts:2662)).
- **Project coordinates and an execution context are mandatory.** An explicit context needs a mapping, which a
  `#>{}#` lambda does not have.
- **One owner.** **No optimistic concurrency:** the client's version is ignored 📄✅.
- **`GET` rewrites the whole document** to bump `lastOpenAt`, and can lose a concurrent save ✅.
- **Free-form slots are lossy or overwritten:** `gridConfig` drops nulls, re-sorts keys, and is overwritten on every
  Legend Query save.
- A JSON-string taggedValue **would** round-trip losslessly ✅. But Cube queries would then appear in Legend Query's
  loader and Data Cube's picker, and opening one in Legend Query **crashes to a blank page** if it has no execution
  context 📄.
- `PersistentDataCube` is unversioned, hard-deletes, and pollutes Data Cube's lists.
- **Locally, every store endpoint fails** with "MongoDB … not configured" ✅.

**Conclusion (D1):** a dedicated Cube store.

### 10.6 Future Cube store (M8, outline)

- **Where:** a `CubeStoreManager` constructed inside `ApplicationQuery`, next to the Data Cube store, so `Server.java`
  needs no change. It has its own Mongo collection and event collection, configured through Vault keys.
- **Document:** `{id, name, owners[], tags[], formatVersion, content: <spec JSON as a string>, sourceRefs[], audit}`.
  `sourceRefs[]` is denormalized for searches such as "cubes using table X".
- **Semantics (§14.3):**
  - **atomic expected-version check → 409**, with a unique `{id, version}` index;
  - owner-only mutation (403);
  - a validated PATCH;
  - soft delete by default, plus permanent delete;
  - search by name, owner, creator and tags (`$all`);
  - `lastOpenAt` updated with `$set`.
- **Avoid known defects** of `BaseStoredVersionedAssetDao`: reusing an id after delete corrupts its history, and
  updates are not atomic ✅.
- **Studio side:** a serializr class plus client methods, behind a `CubeStore` port. Then add Load and Save dialogs,
  `/cube/:cubeId`, the modified-state asterisk and `beforeunload` (§14.4, §17.10, §17.14).

---

## 11. F. Milestones

### 11.1 M1: the slice

Each step ends green on `GITHUB_BASE_REF=master yarn check:ci` (after `git fetch origin`; the changeset check needs the
base ref), `yarn lint:ci` and the tests. M1.1–M1.6 are **headless and test-driven**; nothing in them needs the engine.

| Step      | Deliverable                                                                                                                                                                                                                                                                                                                                        | Done when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1.0**  | Scaffolding: both packages (§3.1–3.4); the purity lint guard and import-scan test; the `/cube` route rendering a placeholder; changesets                                                                                                                                                                                                           | `yarn build`, all CI checks green; `localhost:9001/query/cube` renders the placeholder                                                                                                                                                                                                                                                                                                                                                                                                           |
| **M1.1**  | Types and values: the registry (§5.3), `CubeType` interning and equality, families, comparison classes (§5.4), `LiteralValue` coercion and validation (§5.6), type display                                                                                                                                                                         | Table-driven tests: every engine type path parses (including short names and `Varchar(0)`); the compatibility matrix; integer width boundaries including Java long ±1 and unsigned; date and datetime formats; Boolean strictness; `parseValue` keeps invalid text as `{kind:'invalid'}`, keeps STRING untrimmed, and canonicalizes numerics (`+5`, `007`, `.5`, `5.`, `-0`, `1e3` accepted and normalized; `0x10`, `Infinity`, `NaN` rejected); kind-mismatch rejection                         |
| **M1.2**  | Graph and inference: `QueryNode`, `Connection`, `Query` with the five invariants **plus acyclicity**; every §4.4 operation, including `connect(…, port)`; per-type `generateId`; `buildSchemasAndValidity` with the sentinels; the query-level rule pass; the node registries; `RelationalTableSource` (with a given schema); `UnknownNode`        | Every invariant violation throws; every `canX` is total; the connect cycle case is rejected, while moving a node after a node further down its own chain is allowed and stays acyclic; propagation is proven with **test-only stub nodes** (a two-port binary stub and a pass-through unary stub): disconnecting a binary input gives `ERR_INCOMPLETE` there and `ERR_SCHEMAS` on every downstream node, with no duplicates; an Unknown node's synthetic ports carry its edges                   |
| **M1.3**  | Join: §7.11 validation steps 1–5 with verbatim messages; comparison-class compatibility; the duplicate rule; output order; nullability and merged-key rules per join type (§4.7); `swapInputs`; `describe`                                                                                                                                         | Appendix C.3's join row, retyped with precise types (`bookId` first; right duplicate dropped); C.5(b) message verbatim; multi-key and partially same-named keys; `Varchar(5)`⋈`Varchar(40)` OK; `Varchar`⋈`SmallInt` and `StrictDate`⋈`Timestamp` rejected; LEFT/RIGHT/FULL nullability matrix, including FULL with exactly one nullable key → merged key nullable                                                                                                                               |
| **M1.4**  | Filter: tree, operator availability by family (§5.5), shape and type validation, §8.5 helpers, `describe` and its redacted form                                                                                                                                                                                                                    | Operator matrix for every registry type; validation messages verbatim plus the new ones; normalize/unwrap round trips; the column- and operator-change reset rules; Appendix C.5(a) literally (`join101` `ERR_INCOMPLETE`, `filter101` `ERR_SCHEMAS`) now that Join and Filter both exist                                                                                                                                                                                                        |
| **M1.5**  | IR and emitter: the IR (§8.3); emit for source, join (§8.4 algorithm: temps, `toOne` for both-nullable keys, FULL coalesce + cast) and filter (operator table, negations, Not-over-group pushed to the leaves, typed literals); the `genericType` node for casts; the capture wrapper (`limit`, `from`); `origin` on every node; the debug printer | Golden debug-printed output for INNER/LEFT/RIGHT/FULL × {same-named key, different names, multi-key} (FULL with differing key types emits the cast), every filter operator × family, and Not over And/Or/nested groups (De Morgan; double negation cancels)                                                                                                                                                                                                                                      |
| **M1.6**  | Spec v1 codec (§10.3): encode and decode, typed values, schema snapshots, `rest` preservation (top level, per node, meta), Unknown passthrough, migration skeleton, the newer-version read-only flag                                                                                                                                               | Round-trip tests over a fixture corpus (no property-testing library is in the lockfile): `decode(encode(doc))` is deep-equal; re-encoding is byte-identical; an unknown node kind and unknown fields survive the round trip; decode a spec with an Unknown node → delete its upstream node → encode → decode succeeds, and rewiring the Unknown's input elsewhere is refused                                                                                                                     |
| **M1.7**  | **Thin end-to-end, headless** (builder): the `v1/` serializer (IR → protocol JSON with `sourceInformation`), the relation-type adapter, the lossless result reader, `V1_LegendCubeEngine`, the Cube Northwind + ALLTYPES fixture, `LocalModelCatalog`. Engine-backed tests (§11.2 part A)                                                          | Acceptance part A passes against `localhost:6300`, and in CI against the docker engine, wired as §3.4 describes (spied client methods → Cube-local axios helpers, so the lossless reader is exercised). The FULL-join cast, the `toOne()` rule and the FULL merged-key nullability are covered by tests. A v1-seam unit test resolves a quoted, dotted table name                                                                                                                                |
| **M1.8a** | **Editor state and page (no canvas yet):** `CubeEditorState`; the `/query/cube` page; source picker (§6.2.7); grid with execute, stale and limit; Show Pure; Export/Import spec (dev); undo                                                                                                                                                        | jsdom tests against a mocked `CubeEngine` port: the runtime list holds only runtimes whose store keys exactly include the chosen database; flagged tables show their flag and a picked table lands with its schema; Execute renders the port's rows, an edit marks results stale, and a `limit + 1` result shows the truncation warning; Show Pure shows `renderPure`'s text; Export then Import gives the same `serializeCubeSpec` text; Execute is disabled iff the capture subtree is invalid |
| **M1.8b** | **Canvas and editors:** canvas (§7.2–7.3), palette, drag and drop, context menu; editor shell + Join, Filter and Source panels; keyboard shortcuts (§3.5)                                                                                                                                                                                          | jsdom tests: one undo entry per Apply; drop-target legality matches `canConnect`/`canMove`; the editor shows the upstream-invalid warning; F9 triggers execute; Join Apply turns the node valid; edges into binary nodes carry visible Left/Right labels                                                                                                                                                                                                                                         |
| **M1.9**  | Slice acceptance and hardening: manual script (§11.2 part B) on `yarn dev:query` + engine; package READMEs; optional Playwright e2e against the real engine (the `legend-application-studio-e2e` pattern, not query-e2e's mocked engine)                                                                                                           | Part B passes; M1 review sign-off                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Ordering note: M1.7 runs before M1.8 on purpose, as §20 says ("prove the engine round trip before building the
canvas"). If the canvas misbehaves, it is the canvas. Layout determinism needs no separate test: inputs are sorted
before layout, so it holds by construction.

### 11.2 Slice acceptance test

**Part A: automated** (`legend-cube-builder/src/__tests__/LegendCubeNorthwind.engine-roundtrip-test.ts`)

- **Setup:** one file, so the tests run serially. Northwind's setup drops and recreates its schema on every connection.
- **Assertions:** check **semantics, not SQL text**, because the CI engine image tag moves with every engine merge ✅.
- **Logging:** log `GET /api/server/v1/info` `git.commit.id` for provenance.

1. **Resolve.** Add sources `ORDERS` and `CUSTOMERS` from the Cube fixture and resolve them with one batch call.
   - `ORDERS` has 14 columns, including `ORDER_ID SmallInt` not nullable, `CUSTOMER_ID Varchar(5)` nullable,
     `ORDER_DATE StrictDate` nullable, and `FREIGHT Double` nullable.
   - `CUSTOMERS` has 11 columns.
   - `ALLTYPES` resolves all 12 columns of §6.2.4: `ID Int` (not nullable), then `TI TinyInt`, `SI SmallInt`,
     `BI BigInt`, `F Float4`, `D Double`, `DEC Numeric(10,2)`, `NUM Numeric(12,4)`, `DT StrictDate`, `TS Timestamp`,
     `B Boolean`, `VC Varchar(20)`, all nullable. The parity test (§6.2.6) records the engine's exact answer.
2. **Join schema.** `join101` (INNER, `CUSTOMER_ID = CUSTOMER_ID`).
   - The Cube-inferred schema has **24 columns in §7.11 order**.
   - Name, order, type path and parameters equal `lambdaRelationType` of the emitted lambda prefix.
   - Nullability: Cube ⊇ engine, so Cube may only widen.
3. **Execute.** `filter101` = `SHIP_COUNTRY Equal "France" AND ORDER_DATE GreaterThanOrEqual 1997-01-01 AND EMPLOYEE_ID
In [1, 4]`, captured and executed.
   - **19 rows**, compared **order-insensitively** as the `ORDER_ID` set in §8.5. The slice has no Sort, so row order
     depends on H2's plan, and it differs between join kinds ✅.
   - France alone gives **77 rows**.
4. **Join kinds.** Each case is chosen so that a wrong merged-key side or a missing coalesce fails it.
   - **LEFT:** `CUSTOMERS LEFT_OUTER ORDERS` returns FISSA and PARIS with null `ORDER_ID`, and Cube marks the order
     columns nullable.
   - **RIGHT:** `ORDERS RIGHT_OUTER CUSTOMERS` on `CUSTOMER_ID` returns **832** rows. FISSA and PARIS have a non-null
     `CUSTOMER_ID` taken from the right side and a null `ORDER_ID` ✅.
   - **FULL:** `CUSTOMERS[COUNTRY == 'France'] FULL_OUTER ORDERS[SHIP_COUNTRY == 'Germany']` on `CUSTOMER_ID`, with
     upstream Filter nodes, returns **133** rows: 11 customer-only and 122 order-only, and the merged `CUSTOMER_ID` is
     never null ✅.
   - **FULL with exactly one nullable key** that contains NULLs: `ORDERS` FULL_OUTER the fixture's
     `CUBETEST.CATEGORY_REGION` on `SHIP_REGION` (NOT NULL there, §6.2.4). The 507 NULL-key orders survive with a
     NULL merged key. Cube marks the key nullable; the engine says `[1]` ✅.
5. **Precise literals** on `ALLTYPES` (rows in §6.2.4):

   - `BI > 15000000000` → [2], with `BI` read back losslessly as `"9007199254740993"`;
   - `DEC > 1.5` → [1];
   - `TS >= 2024-01-02T12:00:00` → [2];
   - `B == true` → [1];
   - `B NotEqual true` → [2, 3] (D4: the NULL row is included);
   - `D == 2.5` → [1] (exact equality on a real `DOUBLE`).

   These expectations follow from the new rows by construction and get verified in M1.7.

6. **D4 NULL semantics:**
   - on ORDERS, `NOT (SHIP_REGION Equal 'BC' OR SHIP_COUNTRY Equal 'France')` returns **736** rows (Not pushed to the
     leaves);
   - `SHIP_REGION NotEqual 'BC'` returns **813** rows (NULL rows included);
   - `CUBETEST.EMP_REGION ⋈ CUBETEST.CUST_REGION` on `REGION` (copies of the `EMPLOYEES` and `CUSTOMERS` columns,
     §6.2.4), both keys nullable, returns **15 / 19 / 103 / 107** rows for INNER / LEFT / RIGHT / FULL, with no
     NULL×NULL pairs ✅.
7. **Negatives, all local (no engine call needed):**
   - `ORDER_DETAILS ⋈ PRODUCTS` on `PRODUCT_ID` gives
     `Duplicate column names between inputs are not supported if they are not part of the join columns: "UNIT_PRICE"`.
   - `CUSTOMERS.CUSTOMER_ID ⋈ ORDERS.EMPLOYEE_ID` gives `Join columns "CUSTOMER_ID" and "EMPLOYEE_ID" must be of compatible types.`
   - `EMPLOYEE_ID Equal "abc"` gives `Filter value "abc" is not a valid SmallInt.` (the raw text is kept, §4.9)
   - `EMPLOYEE_ID Equal 100000` gives the out-of-range error.
8. **Propagation.** Disconnect the right input: `ERR_INCOMPLETE` on the join, `ERR_SCHEMAS` on the filter.
9. **Error mapping.** Resolve with a stale schema snapshot that names a removed column. The engine compile error comes
   back with `sourceId` `cube:filter101:…` and lands on `filter101`.
10. **Spec round trip.** `encode` → `JSON.stringify` → parse → `decode` → re-emit gives deep-equal protocol JSON, and
    executes to the same 19 rows.
11. **Golden shape.** The emitted protocol JSON, with `sourceInformation` stripped, equals the engine's own
    `grammarToJson` of the golden Pure text in §8.5. The golden text is adapted to the fixture and includes the
    capture wrapper (`->limit(rowLimit + 1)`). Collections carry `multiplicity`, as the engine's parser writes it.

**Part B: manual, in the UI**

Prerequisites, detailed in [PROGRESS.md › Environment](PROGRESS.md):

- An engine on :6300, either IntelliJ (`org.finos.legend.engine.server.Server`, no arguments) or the repo's docker
  compose: `cd fixtures/legend-docker-setup/grammar-test-setup && docker compose --file=grammar-test-setup-docker-compose.yml up --detach`.
  CORS from `localhost:9001` was verified for the IntelliJ engine only; check it once for docker.
- `yarn dev:ts` and `yarn dev:query`.

The script avoids exact comparisons on the fixture's 32-bit `REAL` columns (§6.2.4).

1. Open `http://localhost:9001/query/cube` and pick "Northwind (Cube fixture)" and `StoreRuntime`.
2. Add `ORDERS` and `CUSTOMERS` from the picker. They land with schemas; the source panel shows `Varchar(5)?`,
   `SmallInt`, …
3. Drag Join onto the canvas and connect `ORDERS` → Left and `CUSTOMERS` → Right. The join shows incomplete, then
   invalid ("Left join columns cannot be empty.").
4. Set the join columns. The node turns valid and Left/Right labels are visible.
5. Drag Filter onto the join (it splices in after it) and build the three rules. Operator lists differ by type, and
   an invalid value is flagged inline.
6. Make the filter the capture node (Ctrl-click, or Cmd-click on macOS, where Ctrl-click opens the context menu;
   or Select in its context menu or editor header) and press F9. The grid shows 19 rows.
7. Edit the filter: the grid marks results stale. Undo restores the previous state. Show Pure displays the lambda.
8. Export the spec, reload the page, import it and press F9. The same graph and the same results come back.

### 11.3 After the slice (recommended order, outline)

| #    | Milestone                                  | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2.0 | legend-graph types (D12)                   | Fix legend-graph's precise primitives as their own PR to master: resolve by full path as well as short name, fix the `Timestamp` path (now a relational class), deprecate the phantom `Decimal`/`Date`/`Time` precise constants, keep parameters through `getLambdaRelationType`, fix its batch variant. Then rebase `CubeType` on legend-graph's `GenericType`; the core may depend on legend-graph's metamodel (never `V1_*`); update §3.3 and Appendix A (§2.2). Must land before M3, which brings legend-graph-typed sources |
| M2   | Simple unary transforms + Join autofix     | Rename (§7.5 + collision fix; regex replaced, see Appendix A), the **Join rename autofix** (collision-free names), Restrict (input order), Sort (+ "Sort only affects output at the sink" warning), Distinct, Limit, Drop, Slice (`[start, stop)`; sorted rowNumber fallback: Slice on SQL Server and Sybase, Drop on SQL Server, DB2 and Sybase); grid quick actions (Sort by / Filter by X)                                                                                                                                    |
| M3   | Entry points, sources modal, depot catalog | D7 follow-up: entry links (setup action, editor menu, deep links `/cube/new?…`), source-modal redesign, final look; the depot catalog (§6.3) with an SDLC-pointer model context and exact-store runtime filter; SNAPSHOT handling                                                                                                                                                                                                                                                                                                |
| M4   | Group and Concat                           | Aggregations (§10 with the §5.7 result-type rules, availability per family), `aggregate()` for global groups; Concat with precise-strict schema equality + widen autofix; a conformance suite comparing local inference with `lambdaRelationType` for every node type                                                                                                                                                                                                                                                            |
| M5   | Partition (windows)                        | §8.6 `let` isolation, array form, `size()` counts, sort required for ranking, frames decision; a **dialect harness** (`generatePlan` per database type over golden lambdas)                                                                                                                                                                                                                                                                                                                                                      |
| M6   | Extend and Difference                      | Expression editor (Monaco), JSON-canonical expression storage + display text, engine typing over an empty model with cached types, plan-time validation; Difference emulation with §7.12 semantics                                                                                                                                                                                                                                                                                                                               |
| M7   | Grid and presentation                      | Server-side mode (enterprise SSRM) with lambda-derived drill-down, CSV and XLSX export, the context menu, stats, §13 column formatting with the §21 fixes                                                                                                                                                                                                                                                                                                                                                                        |
| M8   | Persistence                                | Engine Cube store PR (§10.6), Studio client, `CubeStore` port, Save/Load/Copy/Paste, `/cube/:cubeId`, modified state, `beforeunload`                                                                                                                                                                                                                                                                                                                                                                                             |
| M9   | More sources                               | Services → Pure functions → data products (mapping modes first; `#P` against mocks) → ingest (`#I` against mocks), with parameter forms (§17.6)                                                                                                                                                                                                                                                                                                                                                                                  |
| —    | Out of scope                               | Publishing and service registration (§15); V0 import                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

M2 comes before M3 because it is cheap, testable headlessly, and gives the POC real breadth while the entry points
and sources modal are designed. M3 can run in parallel if desired.

---

## 12. G. Risks and open questions

### 12.1 Risks

| Risk                                                                                                                              | Impact                                           | Mitigation                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine semantics drift: 55 relational, compiler or relation commits in 30 days; CI uses the moving `:snapshot` image ✅           | Golden tests break, or semantics change silently | Assert semantics (rows, types), not SQL text; log the engine commit per run; keep the window-regression and dialect harnesses as tests; pin the image digest if churn hurts |
| The engine does not type-check `==`, `in` or join keys ✅                                                                         | Runtime database errors or silent coercion       | Mandatory Cube validation (§5.4, §5.6) with negative acceptance cases                                                                                                       |
| Window extend + filter gives wrong rows; QUALIFY silently dropped on 5 dialects ✅                                                | Wrong numbers in production                      | `let` isolation from M5 onward; the dialect harness; file engine issues                                                                                                     |
| Engine multiplicities are wrong for outer joins and aggregates ✅                                                                 | Wrong operator offers, wrong grid nulls          | Cube infers nullability; conformance allows Cube ⊇ engine only                                                                                                              |
| Engine typing bugs: `CHAR(n)`→`Varchar(1)`, `BINARY` 500, views `Varchar(0)`, `OTHER`→`String` with numbers, CLOB invalid JSON ✅ | Bad types, crashes                               | Picker flags; no length validation; the Cube fixture avoids them; a 200 with an unparseable body is treated as an error                                                     |
| Studio library defects (batch `result`/`results`, lossy relation-type metadata, transformer bugs) ✅📄                            | Cube built on broken APIs                        | Cube's own `v1/` seam (D8); upstream PRs separately                                                                                                                         |
| The AGENTS.md V1 rule vs repo reality 📄                                                                                          | Review friction                                  | V1 symbols only under `legend-cube-builder/src/graph-manager/protocol/pure/v1/`; propose an AGENTS.md clarification                                                         |
| Local inference (§5) must equal engine typing as transforms grow                                                                  | Divergence and confusing errors                  | Conformance suite per node type (from M4); engine typing for Extend with caching                                                                                            |
| Saved format changes before the store exists                                                                                      | Stranded exports                                 | Format marked draft until M8; migrations are still written                                                                                                                  |
| Northwind reloads on every connection (≈0.6 s per execute) ✅                                                                     | Slow tests                                       | Compile-only (`lambdaRelationType`, ~20–70 ms) for schema assertions; few executions                                                                                        |
| Data products and ingest are absent from the open-source engine ✅                                                                | M9 slips                                         | Mocks (D6); mapping-based data product modes first                                                                                                                          |
| Single runtime and single database per query (v1, and in the `let` form)                                                          | Some joins not expressible                       | Explicit validation messages; revisit with the depot catalog and services                                                                                                   |
| Grid license assumed (D3)                                                                                                         | Watermark on unlicensed builds                   | The local dev host is `localhost` (no watermark) ✅; the community-only path is documented if ever needed                                                                   |

### 12.2 Open questions (none block M1)

1. **Entry points, sources modal and final look** (D7 follow-up, M3): which Legend Query surfaces link to `/cube`;
   source-modal UX (tabs per kind vs search-first catalog); whether to adopt Data Cube's floating-window style.
2. **Sort not at the sink:** warn (recommended), drop silently, or allow?
3. **Count rows:** add an explicit "Count rows" aggregation alongside the non-null Count?
4. **Views and tables with `BINARY` columns** in the picker. v1 default (§6.2.6): views hidden; `BINARY` tables shown as "unavailable" and not selectable. Revisit with the M3 sources modal.
5. **SNAPSHOT versions** in the depot picker: allow, at a recompile on every call, or resolve to a concrete version?
6. **Multiple databases or runtimes per query:** when, and with what engine support? Today it is a two-step plan with
   no pushdown, or a plan error.
7. **Engine image pinning for CI:** keep `:snapshot` (the repo norm) or pin a digest?
8. **Window frames:** keep the running default (D5) or add explicit frame controls in M5?

---

## Appendix A: Spec deltas, section by section

The user accepted the departures from the spec's guidance sections (§14.4, §17.7, §17.11) on 2026-10-05.

| Spec §               | Status           | Change                                                                                                                                                                                                                                                                                     |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preamble (22–30), §0 | Superseded       | Non-negotiable = §3 (extended), §4–5, §7–10, §16 semantics. Wire = relation lambda (protocol JSON). Storage = CubeSpec v1. Sources = relational tables, then services, functions, data products, ingest                                                                                    |
| §1                   | Kept, nuanced    | "No server round trip for editing" holds for the slice's nodes; Extend typing uses an engine call, cached (§5.7)                                                                                                                                                                           |
| §2.1, §18            | Superseded       | Host auth, config, telemetry                                                                                                                                                                                                                                                               |
| §2.2                 | Kept + narrowed  | The core has no host imports through the slice (§3.3). From M2.0 it may use legend-graph's metamodel types, but still no `V1_*` and no UI or app packages (D12)                                                                                                                            |
| §3.1                 | **Extended**     | Precise primitive registry, families, comparison classes (§5.4); interning per `(path, params)`; unknown → Opaque instead of throwing; `Decimal`, `StrictTime`, `Variant` added                                                                                                            |
| §3.2                 | **Extended**     | `nullable` on columns; unique names asserted; `equals` ignores nullability                                                                                                                                                                                                                 |
| §4                   | Kept + fixes     | Acyclicity invariant; `connect(…, port)`; per-type ids; port labels                                                                                                                                                                                                                        |
| §5                   | Kept + extended  | Query-level rule pass; host issues map (display only)                                                                                                                                                                                                                                      |
| §6.1                 | Idea kept        | Source and transform registries + builder adapters; batch resolution                                                                                                                                                                                                                       |
| §6.2–6.7             | Superseded       | §6 of this plan                                                                                                                                                                                                                                                                            |
| §7.0, `V1:` lines    | Replaced         | Saved shapes (§10.3) + emission table (§8.8)                                                                                                                                                                                                                                               |
| §7.4                 | Kept             | Emit `select` in input order                                                                                                                                                                                                                                                               |
| §7.5 (M2)            | Fixed            | Add a collision check against untouched input columns. Replace the regex `/^[A-Za-z0-9_ ]{1,100}$/u` with: non-empty, trimmed, no `"`, no control characters, length ≤ 128 💭. The engine accepts spaces, hyphens, unicode and `\'`; `"` breaks at execution ✅                            |
| §7.9, §17.9          | Changed (D5)     | `[start, stop)`; help-text copy fixed                                                                                                                                                                                                                                                      |
| §7.10 (M4)           | Extended         | Precise-strict equality; reject with a precise message; widen autofix through real conversions                                                                                                                                                                                             |
| §7.11                | Kept + extended  | FULL OUTER; nullability and merged-key rules (§4.7); step 4 per §5.4; autofix with collision-free names (M2)                                                                                                                                                                               |
| §7.12 (M6)           | Kept, emulated   | Semantics as the spec; join and null rules written down                                                                                                                                                                                                                                    |
| §7.13 (M5)           | Extended         | Rank/DenseRank need ≥ 1 sort; Count emitted as `size()`; running default frame (D5)                                                                                                                                                                                                        |
| §7.14 (M6)           | Extended         | Validate empty names and duplicates among new columns                                                                                                                                                                                                                                      |
| §7.16                | Fixed            | Unknown gets synthetic per-instance ports (keeps its edges and raw JSON); not rewireable; re-saved with regenerated `inputs`                                                                                                                                                               |
| §8.2                 | **Extended**     | Matrix keyed by family (§5.5); VARIANT/OPAQUE row                                                                                                                                                                                                                                          |
| §8.3, §21            | **Fixed**        | Operator availability and value-type validation (§5.6) with new messages                                                                                                                                                                                                                   |
| §8.2, §8.3 (M1.5)    | **Restricted**   | A StartsWith/EndsWith/Contains value (or a negation's) may not contain `\`: the engine does not escape it in LIKE patterns, so the rows would be wrong (§8.4, Appendix B). Temporary; lifted when the engine is fixed. User OK 2026-10-06 (option a: refuse, not pre-escape)               |
| §8.4                 | Replaced         | Emission (§8.4 of this plan) + saved filter shape (§10.3). NULL behaviour documented (D4)                                                                                                                                                                                                  |
| §9 (M6)              | Replaced         | Pure expressions stored as JSON (+ display text); typed by the engine; §9.2 table becomes help only, with Pure names                                                                                                                                                                       |
| §10.1                | Kept (for now)   | Per-family view; extend later (Min/Max on strings etc.)                                                                                                                                                                                                                                    |
| §10.2                | **Replaced**     | §5.7 measured table; every aggregate except Count is nullable                                                                                                                                                                                                                              |
| §11.1                | Idea kept        | `CubeEngine` port (§8.7)                                                                                                                                                                                                                                                                   |
| §11.2–11.3           | Superseded       | –                                                                                                                                                                                                                                                                                          |
| §11.4                | Superseded       | Host HTTP client; keep "truncate and show trace link" behaviour via host                                                                                                                                                                                                                   |
| §12–13               | Idea kept        | §9 of this plan; lambda-derived drill-down; `limit + 1`; typed group keys; §21 fixes                                                                                                                                                                                                       |
| §14, §15             | Superseded / out | §10; publishing out of scope. §14.4 "Save disabled while invalid": Export spec is allowed for invalid queries; server Save gating decided in M8 (§10.3)                                                                                                                                    |
| §16                  | Kept + additions | §4.11                                                                                                                                                                                                                                                                                      |
| §17                  | Guidance         | §7; panel instead of popover; visible Left/Right; xyflow + dagre; deep links as path params (M3/M8). §17.11: Execute needs only the capture subtree to be valid (§10.3). §17.7: uncoercible text is kept as an invalid value with a type message (§4.9), and STRING values are not trimmed |
| §19.1–19.3           | Superseded       | §3 (two packages), §8 (relation functions, not `meta::pure::tds::*`)                                                                                                                                                                                                                       |
| §20                  | Idea kept        | §11 (headless first; join and filter in M1; persistence last)                                                                                                                                                                                                                              |
| Appendix C.4         | Replaced         | §8.5 lambda + relation type; §11.2 acceptance                                                                                                                                                                                                                                              |

## Appendix B: Defects found (upstream, non-blocking, D8)

**legend-studio**

- `V1_LambdaReturnType.ts:87-90` / `V1_RemoteEngine.ts:811`: the batch relation-type call reads `results`; the engine
  returns `result` ✅. It also breaks data-product code today (`DataProductIngestUtils.ts:813`;
  `DataProductViewerState.ts:620-631` swallows the error). The tests mock `results`, which hides it.
- `V1_RemoteEngine.ts:779-801`, `RelationTypeMetadata.ts`: precise type parameters are dropped.
- `MetaModelConst.ts:64-82`: `PRECISE_PRIMITIVE_TYPE` has nonexistent `Date`/`Time`/`Decimal` paths and a wrong
  `Timestamp`. `PrecisePrimitiveType` has no package, so round trips shorten paths.
- `V1_ValueSpecificationTransformer.ts:517`: ColSpec `function2` is built from `function1`. `:460`/`:496` drop the
  ColSpec type; `:397` throws on precise literals.
- `V1_AccessorHelper.ts:358-367`: the schema-qualified table lookup is overwritten at `:367` (wrong table on name clash).
  `STO_Relational_Helper.ts:222-263` diverges from engine typing.
- Legend Query's version-revert modal crashes to a blank page when `lightQuery` is unset (a query without an
  execution context) 📄. Four `LegendQueryApplicationPlugin` types are declared but never used.
- `legend-lego` `DataGrid` always registers enterprise modules. The query e2e README claims a community grid by default.
- Repo: `.yarn/constraints.pro` is never read (`yarn constraints` is a no-op). AGENTS.md's V1 rule doesn't match Data
  Cube. Bootstrap and deployment changeset entries are auto-generated by the release script (AGENTS.md wording).

**legend-engine** (issue write-ups)

- Window `count()` / `distinct()->count()` lose OVER (`pureToSQLQuery.pure:6979-6982`).
- A single-AggColSpec window extend is not isolated (`:4231-4233`), so a following filter is pushed below the window.
  The SQL Server, Oracle, Trino, Sybase and DB2 renderers silently drop `qualifyOperation`.
- `CHAR(n)` → `Varchar(1)` (`RelationalCompilerExtension.java:1030`).
- `BINARY`/`VARBINARY` give a "Match failure" that kills the table accessor.
- View columns are typed `Varchar(0)`.
- Outer joins don't widen multiplicity; aggregates are reported `[1]` but can be null. A consequence: `not(…)` on a
  column NULL-padded by an outer join is rendered without its NULL branch and drops those rows, so Cube guards every
  negation of a nullable column with `isEmpty` (§8.4).
- NPEs: `groupBy(~[], …)`, `groupBy` with no aggregations, `concatenate` with a column-count mismatch.
- `rank` without ORDER BY compiles. Mixing FuncColSpec and AggColSpec in one `extend` throws a ClassCastException.
  `if()` drops type parameters ("Wrong type variables count").
- Exact comparisons on H2 32-bit `REAL` columns silently match nothing (`cast(x as float)` against a REAL), whatever type the model declares.
- H2 CLOB values serialize as invalid JSON (`ValueTransformer`). DateTime literals below seconds precision are
  truncated to the day. `toDecimal` truncates the scale on H2.
- Slice fails PCT on SQL Server (`limit m,n`); drop fails PCT on SQL Server and DB2 (`limit m,-1`); Sybase emits the same SQL but has no PCT module. CTE names are not quoted for keywords on
  SQL Server, DB2 and Sybase.
- `escapeLikeExprDefault` (`extensionDefaults.pure:1061-1070`) escapes `_` and `%` but not the escape character `\`,
  so on H2 a backslash in a `startsWith`, `endsWith` or `contains` value changes what matches; the engine test at
  `testWithFunction.pure:59-61` locks today's SQL in. Cube refuses such values (§8.4).
- Enum equality after `project` compares the source value. Dotted quoted table names split into four path parts and
  resolve the wrong table. A literal one past the long range silently wraps.
- `BaseStoredVersionedAssetDao`: no version check, non-atomic updates, `GET` rewrites the document, and id reuse
  corrupts history.

## Appendix C: Evidence index

**Spec:** [docs/design/WIP-CUBE-SPEC.md](../../../docs/design/WIP-CUBE-SPEC.md).

**Northwind:**

- model: [Northwind.pure](../../../packages/legend-manual-tests/src/__tests__/query-builder/model/Northwind.pure)
- engine DDL and loader: `legend-engine-xts-relationalStore/legend-engine-xt-relationalStore-execution/legend-engine-xt-relationalStore-executionPlan-connection/src/main/resources/org/finos/legend/engine/plan/execution/stores/relational/connection/driver/vendors/h2/h2NorthwindDdl.sql`
  and `…/src/main/java/…/ds/specifications/LocalH2DataSourceSpecification.java:38-74`, `…/vendors/h2/H2Commands.java:73-87`

**Engine relation functions:**

- definitions: `legend-engine-core/legend-engine-core-pure/legend-engine-pure-code-functions-relation/legend-engine-pure-functions-relation-pure/src/main/resources/core_functions_relation/relation/functions/`
  (`transformation/join.pure:18-24` JoinKind, `slice/slice.pure`, `olap/over.pure`, `ranking/*.pure`)
- compile-time types: `legend-engine-core/legend-engine-core-base/legend-engine-core-language-pure/legend-engine-language-pure-compiler/src/main/java/org/finos/legend/engine/language/pure/compiler/toPureGraph/handlers/Handlers.java`
  (join 482-519, concatenate 1852-1871, rename 2379-2405)

**Engine SQL generation:** `legend-engine-xts-relationalStore/legend-engine-xt-relationalStore-generation/legend-engine-xt-relationalStore-pure/legend-engine-xt-relationalStore-core-pure/src/main/resources/core_relational/relational/pureToSQLQuery/pureToSQLQuery.pure`
(routing 11561-11618, join 7900-7975, null-safe equality 9137-9152, window 4231-4297 and 6979-7021).
Legacy TDS: `…/core_relational/relational/tds/tds.pure:30-86`, `tdsExtension.pure:96-148`.
H2 portability manifest: `legend-engine-xts-relationalStore/legend-engine-xt-relationalStore-dbExtension/legend-engine-xt-relationalStore-h2/legend-engine-xt-relationalStore-h2-PCT/src/main/resources/pct-manifests/relational-h2/RelationFunctions_manifest.json`.

**Engine types:** `RelationalCompilerExtension.java:933-1100` (path in §5.1); precise primitives in
`~/.m2/repository/org/finos/legend/pure/legend-pure-m3-precisePrimitives/5.105.0/` (`platform_precise_primitives/precisePrimitives.pure`).

**Engine endpoints:**

- typing: `legend-engine-core/legend-engine-core-base/legend-engine-core-language-pure/legend-engine-language-pure-compiler-http-api/src/main/java/org/finos/legend/engine/language/pure/compiler/api/Compile.java:143-210`
  (`lambdaRelationType`, `/batch` → `LambdaRelationTypesResult.result`)
- query store: `legend-engine-application-query/` (`QueryStoreManager.java`, `DataCubeQueryStoreManager.java`, `Query.java:25-53`)
  and `legend-engine-shared-mongo/…/BaseStoredVersionedAssetDao.java`

**Studio APIs:** [V1_EngineServerClient.ts](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts),
[V1_RemoteEngine.ts](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts),
[V1_TypeSerializationHelper.ts](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.ts),
[FormatterUtils.ts](../../../packages/legend-shared/src/format/FormatterUtils.ts).

**Legend Query:** [LegendQueryNavigation.ts](../../../packages/legend-application-query/src/__lib__/LegendQueryNavigation.ts),
[LegendQueryWebApplication.tsx](../../../packages/legend-application-query/src/components/LegendQueryWebApplication.tsx),
[LegendQueryApplicationConfig.ts](../../../packages/legend-application-query/src/application/LegendQueryApplicationConfig.ts),
[ExistingQueryDataCubeViewer.ts](../../../packages/legend-application-query/src/stores/data-cube/ExistingQueryDataCubeViewer.ts) (embedding precedent).

**Data Cube (neighbour):**

- [DataCubeEngine.tsx](../../../packages/legend-data-cube/src/stores/core/DataCubeEngine.tsx)
- [DataCubeQueryBuilderUtils.ts](../../../packages/legend-data-cube/src/stores/core/DataCubeQueryBuilderUtils.ts)
- [LegendDataCubeDataCubeEngine.ts](../../../packages/legend-application-data-cube/src/stores/LegendDataCubeDataCubeEngine.ts)
- **Reuse:** the xyflow + dagre stack, engine-client calls, and the undo / commit-on-Apply patterns.
- **Keep separate:** snapshot model, filter and aggregate classes, type utilities, grid datasource, persistence.

**Scratch evidence** (this session only; important harnesses become repo tests in M1.7, M4 and M5): live-test
lambdas, the window regression matrix (`g1/`), dialect plan dumps (`g4/`) and the persistence harness
(`persistence-verify/`) are in the session scratchpad.
