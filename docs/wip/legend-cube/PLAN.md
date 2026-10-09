# Legend Cube — Implementation Plan

> **Status:** approved 2026-10-05 · branch `cubeV1` (rebased on master `a32e5c0fb`, where the spec landed as
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
| D5  | Engine-driven changes to authoritative sections are accepted: Slice is `[start, stop)`; Join gains **FULL OUTER (in the slice)**; window aggregates with a sort use the SQL default (running) until frames exist; Difference keeps spec semantics (emulated); Concat across different precise types is rejected, a type next to its ancestor too (the engine accepts it ✅); Convert types casts within numbers, strings or dates (M4, §11.5 Q5).        | user (default)                     |
| D6  | Post-slice source order: services → Pure functions → data products → ingest (data products and ingest moved to M3, §6.7–6.8). Data products and ingest are built against mocks until a lakehouse-enabled engine is available. Services snapshot their converted lambda and check for drift.                                                                                                                                                              | user (default)                     |
| D7  | Route **`/cube`** inside Legend Query (URL `/query/cube`), hard-wired in the Query router. New module(s) `legend-cube` / `legend-cube-builder` (§3). Further entry points, the sources modal and the final look are revisited in M3.                                                                                                                                                                                                                     | user + recommendation              |
| D8  | Cube **works around** Studio and engine defects in its own code and depends on none of them being fixed. Upstream fixes are separate, non-blocking PRs and issues (Appendix B).                                                                                                                                                                                                                                                                          | user (default)                     |
| D9  | Execution is a **Pure relation-function chain** over store accessors (`#>{db.schema.table}#`), built as **protocol JSON** (never Pure text). Legend SQL is only a possible future "SQL source" node.                                                                                                                                                                                                                                                     | recommendation (§8.1)              |
| D10 | Precise primitives are modeled **inside the host-free domain**. The host adapts the engine's relation-type JSON at the boundary, in a package-local `v1/` folder.                                                                                                                                                                                                                                                                                        | recommendation (§5)                |
| D11 | **No feature flag.** `/query/cube` is always mounted in Legend Query. (M1.0 first shipped a `TEMPORARY__enableLegendCube` option; it was removed the same day.)                                                                                                                                                                                                                                                                                          | user                               |
| D12 | **Types: Cube's own registry for the slice, legend-graph's types from M2.0**, for consistency with the rest of Legend. M2.0 first fixes legend-graph's precise primitives (own PR), then rebases `CubeType` on legend-graph's `GenericType` and narrows the core rule to "metamodel only, no `V1_*`, no UI or app packages" (a §2.2 departure). Until then the type seam stays narrow (§4.1) so the switch stays internal. Replaces D10 from M2.0.       | user + recommendation              |
| D13 | **First merge after M1.8a, as one PR** (2026-10-07), so new sources and operations can then be built in parallel. M1.8b (canvas and editors) joined the same PR before it merged (user, 2026-10-07: it is on the critical path). Show Pure's "numbers as 0" bug is fixed before it. The working docs live in `docs/wip/legend-cube/` (PLAN, PROGRESS, and ISSUES for the known issues later PRs fix); the legend-graph issue list stays out of the repo. | user                               |

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
  spec/         CubeSpec v1 codec, Meta, rest-preservation, node codecs; the migrations are a list in CubeSpecCodec
                (CUBE_SPEC_MIGRATIONS, empty in v1)
  utils/        internal helpers, e.g. the exhaustive-switch assertion
  index.ts
packages/legend-cube-builder/src/
  graph-manager/CubeEngine.ts       CubeEngine port + CubeModelOutline / CubeResult / CubeEngineError (no V1_* symbols)
  graph-manager/CubeModelOutlineHelper.ts
                                    getRuntimesForDatabase: the runtimes keyed by exactly that database (§6.2.5)
  graph-manager/protocol/pure/CubeEngineBuilder.ts
                                    buildCubeEngine(config, tracerService): CubeEngine. The ONLY place that constructs
                                    V1_LegendCubeEngine (precedent: QueryBuilder_PureGraphManagerExtensionBuilder.ts)
  graph-manager/protocol/pure/v1/   V1_CubeLambdaSerializer (IR → protocol JSON + sourceInformation stamps),
                                    V1_CubeRelationTypeAdapter (relation-type JSON → CubeType),
                                    V1_CubeModelOutlineBuilder (parsed model → databases, flags, runtimes),
                                    V1_CubeExecutionResultReader (lossless), V1_CubeEngineErrors (payload → node error),
                                    V1_LegendCubeEngine (implements the port; builds its own client; imports only the
                                    port, legend-graph, legend-shared and @finos/legend-cube)
  stores/       CubeEditorState, CubeExecutionState, CubeNodeEditorState (the side panel), CubeSourcePickerState,
                CubeShowPureState, CubeSpecTransferState (Export/Import), LocalModelCatalog (the bundled model texts;
                talks only to the port; loadModel parses a model context once and returns its databases and runtimes as
                plain data), CubeHost interface, editors/ (node drafts and their registry, §7.4), fixtures/ (Cube
                Northwind model as a TS string)
  components/   CubeEditor (layout), CubeButton, CubeNodeIcon (node icons), canvas/, palette/, editors/ (Join, Filter,
                Source, and the editor registry), source-picker/, grid/, show-pure/, spec-transfer/
  __lib__/      labels, help text (§17.9), command config (§3.5), test ids
  __test-utils__/  Cube-local axios engine helpers for engine-backed tests (§3.4), the fake engine, page and canvas
                   helpers for jsdom tests
packages/legend-cube-builder/style/index.scss   built to lib/index.css, which the host imports
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
      [LegendDataCubeStoreTestUtils.tsx:470-503](../../../packages/legend-application-data-cube/src/components/__test-utils__/LegendDataCubeStoreTestUtils.tsx#L470).
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
    ([LegendQueryNavigation.ts:69](../../../packages/legend-application-query/src/__lib__/LegendQueryNavigation.ts#L69)) and
    mounted in [LegendQueryWebApplication.tsx](../../../packages/legend-application-query/src/components/LegendQueryWebApplication.tsx#L142)
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
    [QueryEditorStore.ts:629](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts#L629));
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

- [AGENTS.md:120](../../../AGENTS.md#L120) says DataCube consumes metamodel only, but `legend-data-cube` uses `V1_*` throughout,
  outside `v1/` folders 📄. Cube follows the stricter rule: V1 symbols appear only under
  `legend-cube-builder/src/graph-manager/protocol/pure/v1/`, as `legend-query-builder` does. AGENTS.md should be
  clarified separately. **Test exception** (user, 2026-10-08): the engine-backed tests in
  `legend-cube-builder/src/__tests__/` (`LegendCubeNorthwind`, `CubeSpecCorpus` and `CubeEditorState`
  `.engine-roundtrip-test.ts`) import `V1_*` there. They need both the `v1/` adapter and `stores/` (the Northwind
  fixture, and `CubeEditorState` itself), and the import-hierarchy rule (§3.2), which lints tests too, forbids `v1/`
  from importing `stores/`. Product code keeps the rule.
- `.yarn/constraints.pro` is dead; see Appendix B.

---

## 4. Domain model (`@finos/legend-cube`), detailed for the slice

Everything in this section is host-free and test-driven. Spec sections are cited where behaviour is kept **verbatim**.
M2's unary operations (§11.4) are folded in: the column-name rule in §4.2, row order in §4.4, the nodes in §4.5, the
Join autofix in §4.7, the grid's Filter by rule in §4.8 and the new messages in §4.11. M4's Group and Concat (§11.5)
are folded in the same way: output names and converted types in §4.2, port labels in §4.3, row order in §4.4 and the
nodes in §4.5.

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
    merges it ✅. With Convert types, a column whose types differ takes their least common ancestor (§11.5 Q5).
  - **New:** a schema asserts unique column names, because the engine rejects duplicates everywhere ✅.
  - Source schema **drift detection** compares name, type **and** nullability, not `equals`.
- **Column names** (M2, `schema/ColumnName.ts`; why in §11.4): `isValidColumnName` replaces spec §7.5's
  `/^[A-Za-z0-9_ ]{1,100}$/u` (Appendix A). A name is not empty, is trimmed, has no `"`, no `\` and no control
  character, and has at most 128 code points (`MAX_COLUMN_NAME_LENGTH`). Rename and the Join autofix (§4.7) use it,
  and so do Group's output names (M4); Extend will. `foldColumnName` (NFKC, then case folded through upper case, so
  `ß` meets `SS` and fullwidth letters meet ASCII) is close to how SQL Server, MemSQL and DuckDB compare names, so Cube
  never gives a column a name that folds to another column's: a Rename's new names, the autofix's names, Group's
  output names and the temporary columns (`cube_rn`, `cube_d`, and Convert types' `cube_cast`) are all checked folded.

### 4.3 Query graph

Spec §4 is kept verbatim (`QueryNode {key, id, type, ports}`, `Connection`, `Query {nodes, connections, selected}`, the
five invariants, every operation and every `canX` predicate), plus the following fixes and extensions:

| Change                               | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acyclicity invariant (6)**         | §5.1 says cycles are impossible. They aren't: `connect(F1,F2)` then `connect(F2,F1)` satisfies invariant 3 📄. `canConnect` and `connect(…, port)` reject a target that is the source or upstream of it. `canMove` is **unchanged** from §4.4: move isolates the node first, so it cannot create a cycle, and a stricter rule would forbid moves the spec allows. The constructor asserts the graph is acyclic; `visit()` keeps an in-progress set. |
| **`connect(source, target, port?)`** | The canvas lets users drop on a specific Left or Right handle. With no port, behaviour is spec's "first free port".                                                                                                                                                                                                                                                                                                                                 |
| **Per-type `generateId`**            | §4.4's global max cannot produce Appendix C's ids (`join101` + `filter101`) 📄. Take `max(100, ids of nodes of that type) + 1`; the collision fallback is unchanged.                                                                                                                                                                                                                                                                                |
| **Port labels in metadata**          | §17.3 pitfall 4. Join's `portLabels` getter, `['Left', 'Right']` (inherited from `BinaryNode`); Concat's `['First', 'Second']` (M4, §11.5 Q8).                                                                                                                                                                                                                                                                                                      |

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
- Settled in M2 (`inference/RowOrder.ts`; why in §11.4):
  - **Row order.** A `RowOrder` lists `OrderKey {column, direction, sortId, keyIndex}`, most significant first: the
    column as named at that node, and the Sort that declared the key with its place among that Sort's keys. It is `[]`
    when nothing orders the rows and `undefined` when that can't be known. `computeRowOrders(query)` gives every node's
    order from its inputs' through `outputOrder` (§4.5): a source, a Join, a Group and a Concat give `[]`; Filter,
    Distinct, Limit, Drop and Slice pass their input's on; Rename renames its keys; Restrict keeps the longest prefix
    whose columns it keeps; Sort puts its own keys first, then the input's keys on its other columns; an Unknown node
    gives `undefined`, which the nodes that pass an order on carry down. When running a query, the emitter hands a node
    that `consumesInputOrder` (Limit, Drop, Slice) its input's order, written as a sort just before it or in the row
    numbers' `over()` (§8), and sorts the capture by its own before the run's limit; typing lambdas carry no order.
    Orders are derived, never stored.
  - **Lost orders.** `findLostSortOrders(query, rowOrders?, schemas?)` follows each Sort's order down its chain to
    the first node that consumes it, or to the chain's end, and maps the Sort's id to the loss, if any. A full loss
    names the first node whose rows hold none of its keys, e.g. a Join, a Group, a Concat (on either input), a Restrict
    that drops the Sort's first key, or a later Sort on all the same columns. A partial loss names the first node that
    loses some keys, and gives the nodes (Restricts) that removed some (`removals`) and the kept columns that no longer
    order the rows, as they came after a removed one (`cutColumns`, which needs `schemas`). A later Sort on some of the
    same columns is no loss, and nothing is reported where the order becomes unknown. The builder shows losses as
    warnings (§4.11), never validation errors, so Execute stays enabled.

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
From M2 they also give their row order (§4.4): `outputOrder(inputOrders)`, by default `[]` (no order, so a new node
never claims one), and `consumesInputOrder`, true only for Limit, Drop and Slice, which take rows by that order.

As built in M1.2: a `NodeDefinition {type, label, icon, beta}` with `TransformDefinition {kind: 'transform', create}`
and `SourceDefinition {kind: 'source', fromCoordinates, resolve, queryRules?}`. `decode`/`encode` arrive with the
codec (M1.6) and `emit` with the IR (M1.5). Port labels live on node instances (`portLabels`, Left/Right for binary
nodes). The registry is built by `createNodeRegistry()`, not held as a module-level singleton, and reserves the
`unknown` type.

As built in M2 (§11.4): seven `UnaryNode`s in `src/nodes/transforms/`, each on the port `tds`, registered with the
spec's palette labels in spec menu order (Sort, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, then Join). Each
keeps its spec section's validation and `describe()` except as noted. A blank column name reports the generic
`<Label> does not have a name.` (`Sort column`, `Column`, `Old column`), as a blank Join key does (§4.7). Constructors
refuse only wrong shapes (not a list, an unknown direction, NaN, Infinity); every other invalid state is constructible
and reported by validation, and `schematize` gives `undefined` for an invalid node. No M2 node redacts anything: names
and sizes are not values.

- **Sort** (`sort`, spec §7.1): `sorts: {column, direction: 'ASC' | 'DESC'}[]`, empty when new; `Sort.byColumn` gives
  the grid's Sort by (one ascending key). Every key must be named, in the input and of a sortable type
  (`isSortableType`: not VARIANT or OPAQUE, else `Sort column "<c>" of type <T> cannot be sorted.`), then
  `Sort columns cannot have duplicates.` The spec's two direction messages are unreachable. A Sort emits nothing where
  it stands (§4.4, §8).
- **Restrict** (`restrict`, spec §7.4): `columns: string[]`. Its messages use the labels `Columns` and `Column`, and
  every column is reported. The output keeps the input's column order.
- **Rename** (`rename`, spec §7.5): `mappings: {from, to}[]`. Each mapping (`validateRenameMapping`) stops at its first
  failure, and the column-name rule (§4.2) replaces the spec's regex. Two checks follow the spec's five, in any case
  (`foldColumnName`): no other mapping's new name may fold to the same one, and the new name may not be an input column
  the Rename leaves as it is: `New column name "X" is already present in the input schema.` (the collision fix). A
  column's own new case (`ORDER_ID` to `order_id`) is fine. Names are never trimmed.
- **Distinct** (`distinct`, spec §7.6): no settings, always valid.
- **Drop** (`drop`) and **Limit** (`limit`), spec §7.7 and §7.8: `size: number | undefined`. The constructor has no
  default, so an explicit `undefined` stays cleared and invalid; `create` gives 10.
- **Slice** (`slice`, spec §7.9): `start` and `stop`, the same way (10 and 20 from `create`), edited together with
  `withRange`. Both bounds are reported before `start < stop` is checked. The range is `[start, stop)`, counting from 0
  (D5): `Take rows 10 to 20 (20 excluded)`, or `Take rows 10 to (blank)` when the stop is cleared.

As built in M4 (§11.5): Group, a `UnaryNode`, and Concat, a plain `BinaryNode` on `tds1` and `tds2`, in spec menu
order (Sort, Group, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Join). Neither keeps a row order
(§4.4). Validation, messages and saved shapes are in §11.5.

- **Group** (`group`, label `Group by Column`, spec §7.2): `columns` (the keys, in stored order) and
  `aggregations: {column, function, name}[]`, the column left out for Count rows. The aggregation model
  (`Aggregation.ts`, §5.7, reused by M5's Partition) gives each type's functions, result types and nullability. Keys
  must be unique, named, in the input and groupable (not VARIANT or OPAQUE, `isSortableType`); then at least one
  aggregation, each checked (`validateColumnAggregation`). The schema is the keys, then one column per aggregation.
  `describe()`: `Group by "a", "b"`, or `Aggregate all rows` with no keys.
- **Concat** (`concat`, label `Concatenate Another Input`, spec §7.10): ports labelled First and Second, and one
  setting, `widenTypes` (Convert types, Q5), false by default. Columns match by position: the same count, the same names
  in the same case, and equal types, or with Convert types a least common ancestor within numbers, strings or dates
  (`getConcatConvertedType`); nullability is never compared. The schema is the first input's names and types (the
  ancestor where converted), nullable where either input's is. Autofixes (`ConcatAutofix.ts`, Q6): a Rename before
  the second input, a Restrict before the wider one. `describe()`: `Concatenate additional input`, plus
  `, converting types` with the setting on.

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
- **Autofix** (spec §7.11's `renameInputs`; built in M2, `JoinAutofix.ts`, §11.4): a new Rename before each input,
  spliced in on the join's port, renames each column both inputs have that is not a same-named key
  (`getDuplicateJoinColumns`): `c` becomes `c_1` on the Left and `c_2` on the Right, then `c_<side>_2`, `c_<side>_3`…
  when the name is taken, in any case, in either input or by the fix itself (Left names first). The column part is cut
  so the name keeps to 128 code points. The key lists are rewritten through the same renames, so a duplicate that is a
  key at another position, or crossed keys, still join; the Join is replaced only when its keys change. New Renames are
  always added, never merged into existing ones. `planJoinDuplicateFix` plans it (`undefined` when nothing is shared or
  a name is invalid); `canFixJoinDuplicates` holds when the join has both inputs, the duplicate rule is its only error
  and a plan exists; `fixJoinDuplicates` makes the change and keeps the selection. They are not on `Query`. The Join
  editor applies its edits first, and the fix is one undo step.

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
  - an operator change clears the value when moving into or out of empty-operators or set-operators;
  - from M2, the grid's Filter by rule (`buildQuickFilterRule(column, type, cell)`, §9): Equal on the clicked value read
    as the column's type (a trailing `+0000` dropped), IsEmpty on a null cell, and none when the type has no Equal or
    the value does not read as one of the type.

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
  - `Sort column "<c>" of type <T> cannot be sorted.` (M2). Two other checks M2 adds use the catalogue's generic
    templates: `Sort columns cannot have duplicates.` and, for Rename's collision fix,
    `New column name "<c>" is already present in the input schema.`
  - Group's and Concat's (M4), e.g. `Group column "<c>" of type <T> cannot be grouped.` and Concat's precise messages
    after the catalogue's `Both input schemas must be identical.`: listed in §11.5.
- **New warnings** (M2, §4.4), derived and never validation errors; `<node>` is a node's id:
  - `This sort has no effect: <node> does not keep the row order. A sort only orders the query's output, or the rows a later Drop, Limit or Slice takes.`
  - `Sorting by "<c>", … has no effect: <node> removes that column (those columns) before the order is used.`
  - `Sorting by "<c>", … has no effect either: it comes (they come) after a removed column.`
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
  - [MetaModelConst.ts:64-82](../../../packages/legend-graph/src/graph/MetaModelConst.ts#L64): `PRECISE_PRIMITIVE_TYPE` lists
    paths the engine does not have (`precisePrimitives::Date`, `::Time`, `::Decimal`) and a wrong `Timestamp`.
  - `PrecisePrimitiveType` extends `DataType` and is indexed by short name; there are three disagreeing
    precise→standard maps.
  - [V1_RemoteEngine.ts:190-205](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts#L190):
    `buildRelationTypeMetadata`, behind `getLambdaRelationType`, keeps only each column's type path and drops
    `typeVariableValues`. Its batch variant read `results` while the engine returns `result`, so it threw, until
    #5593 (2026-10-06) fixed it
    ([V1_LambdaReturnType.ts:87-90](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/compilation/V1_LambdaReturnType.ts#L87)).
  - Client-side table typing
    ([STO_Relational_Helper.ts:222-263](../../../packages/legend-graph/src/graph/helpers/STO_Relational_Helper.ts#L222))
    disagrees with the engine.
  - The query builder normalizes precise types to standard ones for operators and editors.
  - Data Cube keeps only a path string and hard-codes `Varchar(16777216)`
    ([DataCubeQueryBuilderUtils.ts:284](../../../packages/legend-data-cube/src/stores/core/DataCubeQueryBuilderUtils.ts#L284)).
  - **What works:** `V1_relationTypeModelSchema`
    ([V1_TypeSerializationHelper.ts:128](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.ts#L128))
    keeps the parameters ✅. `V1_buildRelationTypeFromV1RelationType` even works against an empty `PureModel` ✅.
  - **Literals:** JS `JSON.parse` corrupts large Integer and Decimal values. `parseLosslessJSON` /
    `stringifyLosslessJSON` exist in [FormatterUtils.ts:201](../../../packages/legend-shared/src/format/FormatterUtils.ts#L201).

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

- **Count rows** (M4, §11.5 Q1): Cube's aggregation with no column, `x|1 : y|$y->count()`, typed Integer.
- **Nullability:** Count, DistinctCount and Count rows are not nullable; every other aggregate output is. The engine
  types Min, Max and DistinctValue `[0..1]` but Sum and Average `[1]` ✅, though an all-null group's Sum is null ✅, so
  the conformance suite declares Sum and Average as columns where Cube is wider (§11.5 Q7).
- **§10.1 availability:** keep the spec's rows; DECIMAL counts as numeric (the spec doesn't name it), and VARIANT and
  OPAQUE offer Count only (M4). Min/Max on String and Boolean, and DistinctCount/DistinctValue on
  enums, can be added later (the engine supports them ✅).
- **Extend:** §9.2's local table is wrong against the engine ✅. Extend types come from the engine, typed against
  **only the input schema**: a typed `{t: Relation<(cols)>[1] | $t->extend(~c: λ)}` lambda over an **empty** model
  gives the same type as the real model (163/163 ✅). The type is cached on the node with an input signature, so
  `schematize` stays synchronous and host-free (M6).

### 5.8 How types appear in the lambda, the saved spec and the UI

| Where            | Form                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lambda (slice)   | Mostly not written: accessors carry the types. **Literals are typed by column family**: INTEGER → `{_type:'integer'}`, FLOAT → `float`, DECIMAL/NUMBER → `decimal`, STRICT_DATE → `strictDate`, DATETIME → `dateTime`, ENUM → `EnumPath.VALUE`. Serialized losslessly. **One explicit type:** `->cast(@<common ancestor>)` on a FULL merged key whose types differ (§8.4 step 5), written as a `genericTypeInstance` (§8.3). |
| Lambda (from M4) | Further casts only where Cube widens types: Concat's Convert types writes a type-only `->cast(@<T>)` within numbers, strings or dates, with no SQL cast ✅ (`toString()` across families, later; §8.8, §11.5 Q5). Pure text uses full paths with parameters, e.g. `meta::pure::precisePrimitives::Varchar(15)`.                                                                                                              |
| Engine responses | `rawType.fullPath` + `typeVariableValues` → `CubeType`; `multiplicity.lowerBound == 0` → `nullable` (but see §4.7 for joins).                                                                                                                                                                                                                                                                                                |
| Saved spec       | Source schema snapshots `{name, type:{path, params?}, nullable}`; literal values `{kind, value}` (numbers as strings, booleans as JSON booleans), text that is not a valid value `{kind: 'invalid', text}`.                                                                                                                                                                                                                  |
| UI               | Short name with parameters (`Varchar(5)`, `Numeric(10,2)`, `SmallInt`) and a nullable marker. A family icon. The full path in a tooltip.                                                                                                                                                                                                                                                                                     |

---

## 6. B. Sources

### 6.1 Source seam (replaces §6.1 details; keeps the idea)

Adding a source kind means two registrations and nothing else; the graph, inference, emitter, grid and codec are
untouched (§6.7's promise). **Not built yet:** the core half exists (`SourceDefinition`), but the builder has no
`SourceKindAdapter`; it is wired to relational tables. A new source kind today also touches `CubeEditorState`
(re-checking tables, the picker's opening), `CubeSourcePickerState`, `CubeJoinDraft` (where a column comes from),
`CubeSourceEditor`, and the port's `resolveSchemas` and `CubeModelOutline`. The builder's picker half is built with
the direct connection, and the core half with data products (§6.8; M2.0 no longer gates either):

- **Core:** a `SourceDefinition` (§4.5), covering coordinates, codec, validate, describe, `emit` (an IR relation
  expression, e.g. an accessor), and the execution requirements it contributes (runtime, and later mapping or
  parameters).
- **Builder:** a `SourceKindAdapter` with:
  - a **catalog** (lists candidates for the picker);
  - a **resolver** (gets the schema and parameters through the engine);
  - a **picker tab** component.

Resolution replaces §6.1's single `resolveGraph` call: **one `POST /api/pure/v1/compilation/lambdaRelationType/batch`**
covers every source, keyed by node id, with per-key errors ✅. It returns `{result, errors}`. Cube parses the raw response itself: Studio's
wrapper drops type parameters (it also read `results` until #5593).

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
   ([V1_EngineServerClient.ts:405](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts#L405)).
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
  - The scratch fixtures behind the type findings (`ops/types.pure`, `precise/model.pure`, kept outside the repo) had
    different rows. These rows are **new** and get verified in M1.7.
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
  - Verified on the engine (2026-10-06, with a probe script kept outside the repo) ✅: every table types
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

### 6.7 Ingest data sets (M3, settled by the user, 2026-10-09)

Ingest definitions became a source in M3, built before Depot databases (they rebase onto it). Requirements: the local
evidence `ingest-requirements` (four rounds of answers recorded there). Cube copies Data Cube's Lakehouse Producer
source for now; the user plans to improve it later.

- **Picking (an "Ingest" tab of its own, with an "Ingest Dataset" BETA palette item):** Mode (Production or Production
  (parallel)), then the environment (the viewer's entitled one, shown read-only and never saved), then a producer
  deployment (numeric deployment ids only; the viewer's own user-id environments are left out for now), then one of its
  deployed definitions, then a data set. Only definitions deployed from SDLC (`alloy-git:<group>~<artifact>~<path>`
  URNs) are listed; ad hoc ones (`rest-api:` URNs) are not supported. Everyone can add data sets: the lakehouse refuses
  a run the viewer may not make, and Cube shows that error.
- **The definition:** read from the ingest server by URN through its grammar route, then parsed by the engine, as Data
  Cube does (user, 2026-10-09). No project version is looked up now. TODO: read the definition from Depot instead, at
  the project version it was deployed from, which also gives the SDLC pointer (a later improvement).
- **Schema:** each data set's declared columns, with their type parameters and nullability, then the LAKE\_\* columns its
  write mode adds, as legend-graph types them for Legend Query; no engine call. Materialized views, many-valued columns
  and types Cube doesn't know are listed disabled with the reason.
- **Accessor and run:** `#I{definition.dataSet}#` (`metadata: false`), run on a model of the definitions the cube reads
  plus a LakehouseRuntime at `cube::ingest::Runtime`. Its environment is the one of the ingest server that served the
  definition; the warehouse follows the data product rule (§6.8).
- **Saved:** a Cube-owned model kind `cubeIngest` (the class, the producer deployment, the warehouse); each source
  saves the definition's URN, its path and the data set. Never a server URL. One cube reads one kind of source (tables,
  data products or ingest data sets) and one producer deployment.
- **Config:** Legend Query's optional `lakehouse.platformUrl` (the key Data Cube and Marketplace use); the ingest
  servers are found through it.
- **After Add:** a data set's Source panel shows its definition (the URN on hover), the class, the producer deployment
  and the warehouse, which is edited there as a data product cube's is (§6.8). Import and **Refresh** read the
  definition again and warn when a data set's columns changed. A data set whose definition can't be read again (e.g.
  no longer deployed) keeps its saved columns, with a warning saying why.
- **Tests:** the open-source engine can't parse a definition or type `#I`, so the engine tests stand each data set in
  for with a Pure function over an H2 table, and check a Filter on `LAKE_OUT_ID`, a Join of two data sets and a Group
  downstream (testing.md). The ingest servers, the grammar parse, `#I` itself, the environment name and the warehouse
  are checked in Part B2 (§11.2).

### 6.8 The next sources: settled so far (user, 2026-10-08)

The user put the database entry points and data product access points first, with a local test setup that mocks what
open source lacks (the data product backends, and Depot at the scale of thousands of projects). Research behind this
(local evidence `sources-v2/`): the open-source engine rejects every data product construct (`#P`, data product and
compute elements, a LakehouseRuntime with an environment and a warehouse) ✅; when two model contexts define the same
element path, the engine silently keeps the first ✅; EMIT models served from a mock depot type and execute through
SDLC pointers once their test data becomes LocalH2 setup SQL ✅. Cube copies the original's experience, not its
internals (user, 2026-10-08): questions for the original app's team are about its UI only, in
[QUESTIONS.md](QUESTIONS.md); checks that need an internal deployment are kept outside the repo.

- **Build order:** the direct connection first (closest to the pasted-model path and testable on a laptop), then data
  products, then Depot databases (user, 2026-10-08: data products moved ahead of Depot databases), each once its mocks
  land. The direct connection builds the picker half of the §6.1
  seam (a dialog with one tab per kind); the core half (a new `SourceDefinition`) comes with data products, the first
  source that isn't a relational table.
- **Depot databases, for now:** project → version → Database → table, with a runtime from the same project. A global
  search across projects' Databases comes later as a second mode of the same picker (the open-source Depot only
  matches element paths and doesn't page, so it leans on an internal Depot route; local evidence
  `sources-v2/db-depot.md`).
- **Direct-connection types:** H2 and DuckDB first, the only ones testable on a laptop (the local engine has no vault
  for credentials). Postgres comes right after, to test a real server database.
- **Direct connection:** the cube saves the full connection (protocol JSON) once, as its model
  (`context.model = {_type: <a Cube-owned kind>, connection}`), and each table stays an ordinary relational source
  (schema and table) on a fixed generated Database path. This amends the first wording, which had the connection saved
  on each source as in the original app: a cube has one connection anyway, the layout is internal, and Cube never reads
  the original's saved queries (§1.2). Cube builds the executable model (a Database with the used tables, the
  connection, a mapping-less runtime) only when it calls the engine, by introspecting just those tables with
  `schemaExploration`. A saved connection holds auth references, never a secret. The saved format stays at version 1:
  the change is additive, and an older reader reports the model kind as unsupported.
- **The source dialog (DP-3, user, 2026-10-09):** two palette items, "Relational Database Table" and "Data Product"
  (beta), open one "Add a source" dialog with three tabs, "Model", "Database connection" and "Data product", each item
  on its own tab; a cube's fixed model selects the tab and disables the others. A host without a connection explorer
  or a data product catalog shows neither that tab nor, for data products, the palette item. Each tab implements one
  small interface (`CubeSourcePickerTab`: availability, busy state, Add, open and close, and whether a cube's fixed
  context is its own).
- **The direct-connection tab:** The form starts with a prefilled H2 sample and has no
  box for pasting connection JSON. Setup SQL and DuckDB file paths are always offered, as Paste Pure model already
  allows: the engine accepts them from any client (hosting.md notes the exposure; revisit with Postgres). Once a table
  is added the connection is fixed until every table is removed (no "Edit connection" until QUESTIONS.md U8 is
  answered); reopening the dialog lists the connection's schemas at once.
- **A CSV as a table (user, 2026-10-09):** on DuckDB, the tab takes a pasted CSV or a chosen file and writes it into the
  setup SQL as a table of the `csv` schema (create, then the rows as inserts), which the viewer can edit before
  testing the connection. Each column's type is guessed from its values; names are made safe for DuckDB. Up to 10,000
  rows: the cube saves them with its connection, and every connection inserts them again (about 120 ms for 10,000 rows
  on the local engine). No file reaches the engine's host.
- **Columns the engine can't type** (it reports them as `Other`: on H2 REAL, TIME, BINARY, CLOB, UUID and arrays; on
  DuckDB HUGEINT, TIME, BLOB, UUID and arrays) are hidden, and the picker shows "N columns hidden".
- **One model context per cube:** the first source fixes it; every other source must come from the same context. For a
  depot project that means the same project at the same version, since the engine keeps the first of two definitions.
- **Databases and data products are kept apart:** a cube uses one or the other, never both (a query has one runtime).
- **Data product list:** the marketplace's search when Query names its server (`marketplace.serverUrl`, the same
  server Legend Marketplace's own `marketplace.url` names; user, 2026-10-09), else the lakehouse contract server's lite
  list, which Cube pages itself with guards. A failed search shows its error with Retry and never falls back to the
  lite list.
- **Warehouse (DP-2, user, 2026-10-09):** the cube's saved warehouse wins, else the viewer's remembered one, else the
  default consumer warehouse (`LAKEHOUSE_CONSUMER_DEFAULT_WH`). The first Add saves the warehouse into the cube and
  remembers it for the viewer's next cubes. A saved cube's warehouse is edited in its Source panel, as one undo step,
  and remembered too (#5652).
- **Data products (user, 2026-10-09):**
  - **Saved shape (DP-1):** a Cube-owned model kind, `context.model = {_type: 'cubeDataProduct', groupId, artifactId,
versionId, environmentType, warehouse?}`, and the fixed runtime path `cube::dataProduct::Runtime`. Each source
    saves its data product, access point group, access point, the catalog's product id and the deployment id. The
    engine adapter builds, per run, `combination[SDLC pointer at the saved version, a model holding only a
LakehouseRuntime at the fixed path]` with the viewer's environment and the warehouse.
  - **Selection (DP-5):** as Data Cube's: a Mode select (Production, Production (parallel)), then a deployed data
    product, then one of its access points, then the warehouse. No development deployments in this phase; a saved
    development cube is refused by name.
  - **Access points:** Lakehouse access points without parameters can be added; parameterized, function, model-group
    and undeployed ones are listed disabled with the reason. Columns come from the deployed artifact's
    `lambdaGenericType`, with no engine call.
  - **One project per cube:** once a cube has a data product source, the tab offers only that project's products at
    that version, and reopens on the cube's data product with its access points shown. Joining access points of one
    project, often two of the same data product, is the demo's case; cross-project joins aren't needed.
  - **Redeploys (DP-4):** nothing this round; a cube stays on its saved version.
  - **The environment:** as Legend Query resolves it (`resolveLakehouseEnvAndWarehouse`): the environment Query
    remembers for the viewer, else the viewer's first entitlement environment. Query adds the production-parallel
    realm (`-pp`) for a snapshot version; Cube also adds it for a production-parallel deployment, as Data Cube does.
    Query's runtime dialog can remember an environment with a realm already on it, so Cube drops that realm first
    and lets the cube's class decide: a production deployment never runs in the production-parallel realm.
  - **Shipped first as a thin end-to-end slice** in the direct connection's PR (user, 2026-10-09), so it can be tested
    inside an internal deployment. Follow-ups, each with its tests (#5652): marketplace search with paging guards and
    stale answers (done), warehouse edits and staleness (done), re-checking saved sources (done), error polish (done),
    sample rows and marketplace links (done), access badges (done), an "In this project" / "Search all" view (done),
    the stand-in engine checks against the test-setup mocks, and their verify workflow.
- **Compute elements:** deferred.
- **M2.0 no longer gates the sources:** depot Databases are typed by the engine through the pointer and data products by
  their deployed artifact, so neither needs legend-graph's precise types. M2.0 stays a separate legend-graph PR, needed
  when Cube types tables locally (§11.3).

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
  **visible** port labels from the node's `portLabels` (fixes pitfall 4): "Left"/"Right" for a Join, "First"/"Second"
  for a Concat (M4, §11.5 Q8). Dagre does not guarantee Left sits above Right, so crossing
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
   nothing to edit registers an editor but no factory: it gets a read-only draft, and no Apply or Cancel. That is a
   source, and from M2 a transform with nothing to set (Distinct, whose editor is a description only, spec §17.6),
   which is also listed in `CUBE_NODE_TYPES_WITHOUT_SETTINGS` so the registry test (item 6) doesn't ask it for a
   factory.
3. `components/editors/Cube<Type>Editor.tsx`: an observer component taking `CubeNodeEditorProps`, registered in
   `CUBE_NODE_EDITORS` (`components/editors/CubeNodeEditorRegistry.ts`). It gets:

   - `draft`;
   - `inputSchemas`, in port order and all present: while an input is missing or invalid, the panel shows why
     instead of the editor;
   - `readOnly`;
   - `editorState`, for reads such as the model outline.

   Its edits go to its draft. A button that must change the document calls a `CubeNodeEditorState` method that
   applies the draft first and then rebinds to the new node, as `nodeEditor.swapInputs()` and the Join and Concat
   autofixes (`renameDuplicateColumns`, `renameConcatInput`, `restrictConcatInput`) do: calling
   `editorState.applyQuery` (or `editorState.swapInputs`) directly replaces the node under unapplied edits, so the
   panel closes and drops them. A source, which has no draft, may call an `editorState` flow that stays outside the
   undo history (Refresh). The panel lists the edited node's problems (`node.validate`) under it, and owns Apply
   and Cancel.

4. The help text, in `CUBE_NODE_HELP_TEXT` (`__lib__/LegendCubeHelpText.ts`).
5. Its icon name, mapped to an icon in `NODE_ICONS` (`components/CubeNodeIcon.tsx`).
6. A test checks that every registered type has all of these (`CubeNodeEditorRegistry.test.ts`).

The palette, the context menu and the canvas need nothing more: they read the core `NodeRegistry` (label, icon
name, beta).

M4's Group and Concat editors follow this contract (§11.5, Builder): Group's has the keys' multi-select and rows of
aggregation column, function and output name; Concat's states the requirement, compares the inputs column by column,
shows the autofix buttons when they apply, and its draft holds Convert types.

### 7.5 Join editor

- Join type: Inner, Left Outer, Right Outer, Full Outer.
- Paired rows of (left column from the left schema, right column from the right schema), with type labels. An
  incompatible pair is marked inline using the domain's compatibility check.
- Add or remove rows. The add button is disabled once every column is used (§17.6).
- A Swap Inputs button. It applies the panel's edits and swaps, as one undo step (M1.8b S18).
- When the duplicate-column error fires, the panel lists the offending names, with the new names the autofix would
  give and a "Rename them" button (M2, §4.7).
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

**Settled before M1.8** (user, 2026-10-07; requirements `m18-requirements`). The canvas questions are asked at the
start of M1.8b.

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
  (`m18a-verify` fix, 2026-10-07). A data product cube's access points are re-checked the same way, through the
  catalog against the deployed artifact at the cube's saved version, with no engine call; their warnings name the
  access point (DP14, 2026-10-09).
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
3. Wrap the result: `capture->limit(rowLimit + 1)->from(runtime)`. When the rows reach the capture node in an order,
   sort by it first: `capture->sort(<capture order>)->limit(rowLimit + 1)->from(runtime)`, so the rows shown are in it
   (M2, §11.4).
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
  `{| <relation>->limit(rowLimit + 1)->from(runtime)}` (from M2, sorted first by the capture's row order: "Row order"
  below). The limit is one computed integer literal; `rowLimit` must be
  a whole number ≥ 1 and the runtime is required. `canEmit` and `emitRelation` share one check: a node can be emitted
  when it and every node upstream of it are valid and of a registered type; otherwise `emitRelation` throws the
  reason.
- **Join:** temporary names `<n>__cube_l` / `<n>__cube_r`, then `…2`, `…3` until no column of either input (or an
  earlier temporary name) has it in any case (`foldColumnName`, M2.16); renames chain in key order; key pairs fold
  left with `and`; one `extend` merges every same-named key of a FULL join, with the variable `x`; the cast's type is the merged type's `path` and
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

**Row order (M2, §11.4).** A Sort emits nothing where it stands. Cube tracks the row order through the graph
(`computeRowOrders`; keys follow Renames) and writes `->sort(<keys>)` where the order is used: just before a Limit, Drop
or Slice that takes rows by it (role `sort` on that node), and, when the rows reach the capture node in an order,
before the run's limit (role `captureSort` on the capture node):
`{| <relation>->sort(<capture order>)->limit(rowLimit + 1)->from(runtime)}`. Each key is `~c->ascending()` or
`~c->descending()`, stamped `sortKey` on the Sort that declared it; one key is written bare, several as a list. Typing
lambdas carry no sort. Some databases get Drop, Slice, Limit and Distinct written another way (§8.8, database
workarounds).

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
- **Graph-manager wrappers are bypassed** for typing on purpose: they drop parameters (and the batch wrapper threw
  until #5593) (D8). A tracer service must be set on the client, or every call throws 📄.

**Settled before M1.7** (user, 2026-10-06; requirements `m17-requirements`). Engine facts probed the same day (with probe
scripts kept outside the repo): a table with a `BINARY` column fails **alone** in the batch call, the other keys still type ✅;
`compilation/compile` accepts a `text` context ✅; `execute` returns each column's type in `builder.columns` ✅.

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

| Spec           | Lambda construct                                                                                                                                                                                                                | Engine support                                                                                                                                                     | Fallback / notes                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source (table) | `#>{db.schema.table}#` + one `->from(rt)`                                                                                                                                                                                       | H2, PCT                                                                                                                                                            | Problem tables flagged (§6.2.6)                                                                                                                                                                                                                                       |
| **Filter**     | `->filter({row \| …})`                                                                                                                                                                                                          | H2, PCT                                                                                                                                                            | §8.4 table                                                                                                                                                                                                                                                            |
| **Join**       | rename temps → `->join(R, JoinKind.X, {l,r \| …})` → (FULL: coalesce extend) → `->select(~[…])`                                                                                                                                 | H2 all 4 kinds; FULL native on 9 databases, emulated on H2                                                                                                         | Engine rejects any duplicate name ✅ (hence the algorithm); `->toOne()` for SQL NULL semantics                                                                                                                                                                        |
| Sort           | Nothing where it stands; `->sort(~a->ascending())`, or `->sort([~a->ascending(), ~b->descending()])` for several keys, just before each Limit, Drop or Slice that takes rows by the order and before the capture's limit (§8.4) | H2, PCT                                                                                                                                                            | Written where the order is used, as an ORDER BY in a subquery is lost (SQL Server rejects one without TOP). A Join, a Restrict that drops sort keys or a later Sort on all the same columns loses the order: a derived warning (`findLostSortOrders`), never an error |
| Group          | `->groupBy(~[k…], ~[n: x \| $x.c : y \| $y->agg()])`, keys as listed; Count rows `n: x \| 1 : y \| $y->count()`; no keys → `->aggregate(~[…])` (M4, §11.5)                                                                      | H2, PCT                                                                                                                                                            | `groupBy(~[], …)` throws NPE ✅; no aggregations → NPE (spec requires ≥ 1 anyway)                                                                                                                                                                                     |
| Restrict       | `->select(~[…])` listed **in input-schema order**                                                                                                                                                                               | H2, PCT                                                                                                                                                            | `select` keeps the order you list ✅                                                                                                                                                                                                                                  |
| Rename         | one `->rename(~old, ~'new')` per mapping                                                                                                                                                                                        | H2, PCT                                                                                                                                                            | Array form returns 500 ✅                                                                                                                                                                                                                                             |
| Distinct       | `->distinct()`, over every column (never `distinct(~[…])`, which also projects)                                                                                                                                                 | H2, PCT                                                                                                                                                            | Padded on SQL Server and Sybase IQ (database workarounds below)                                                                                                                                                                                                       |
| Drop           | `->drop(n)`, after `->sort(<input order>)` when the input has a row order                                                                                                                                                       | H2; **fails PCT on SQL Server and DB2** (`limit m,-1`); Sybase emits the same SQL (no PCT module); Sybase IQ and MemSQL number the rows by the first sort key only | Row numbers on SQL Server, Sybase, Sybase IQ, DB2 and MemSQL (database workarounds below)                                                                                                                                                                             |
| Limit          | `->limit(n)`, after `->sort(<input order>)` when the input has a row order                                                                                                                                                      | H2, PCT; Sybase IQ numbers the rows by the first sort key only                                                                                                     | Row numbers on Sybase IQ after a Sort on several columns (database workarounds below)                                                                                                                                                                                 |
| Slice          | `->slice(start, stop)`, range `[start, stop)` (D5), after `->sort(<input order>)` when the input has a row order                                                                                                                | H2; **fails PCT on SQL Server** (`limit m,n`); DB2 passes; Sybase emits `limit m,n` (no PCT module); Sybase IQ numbers the rows by the first sort key only         | Row numbers on SQL Server, Sybase and Sybase IQ (database workarounds below)                                                                                                                                                                                          |
| Concat         | `<first>->concatenate(<second>)`; with Convert types, an input first casts its differing columns: `->extend(~[cube_cast: x \| $x.c->cast(@T)])->select(~[…])->rename(~cube_cast, ~c)`                                           | H2, PCT (`UNION ALL`)                                                                                                                                              | Names and order must match ✅; precise types too (D5), though the engine takes a type next to its ancestor ✅. A count mismatch compiles, typed as the shorter relation, and fails at execution (NPE) ✅ → Cube validates. Convert types: §11.5 Q5                    |
| Difference     | **No relation function.** Rename `x→x_1`/`x_2`, keys → temps; `join(FULL)`; `extend` (keys `coalesce`; `x_valueDifference: x_1->coalesce(0)->toFloat() - x_2->coalesce(0)->toFloat()`); `select` in §7.12 order                 | Emulation H2 ✅                                                                                                                                                    | **Gap:** legacy `columnValueDifference` is TDS-only and differs from §7.12. Spec semantics kept (D5)                                                                                                                                                                  |
| Partition      | `->extend(over(~[p…], [~s->ascending()]), ~[n: {p,w,r \| $r.c} : y \| $y->agg()])`; ranks in a separate `extend` with `{p,w,r \| $p->rank($w,$r)}`; `let`-isolated (§8.6)                                                       | H2, PCT for ranking with ORDER BY and `size()`                                                                                                                     | **Gap:** window `count()` loses its OVER clause → emit `size()` ✅. Rank without a sort fails → validation. No partition → `over([sorts])`; neither → `over([])`                                                                                                      |
| Extend         | `->extend(~[n: row \| <expr>])`, expression as `raw` IR from `grammarToJSON_valueSpecification`                                                                                                                                 | H2                                                                                                                                                                 | Type from engine typing over an empty model (§5.7)                                                                                                                                                                                                                    |
| Unknown        | –                                                                                                                                                                                                                               | –                                                                                                                                                                  | Not executable (§7.16)                                                                                                                                                                                                                                                |

**Database workarounds (M2, §11.4).** For a Drop, Slice or Limit inside a query (Cube's always are, under the run's
own limit) and a Distinct before a limit, some databases reject the engine's SQL or get the wrong rows.
`CUBE_DIALECT_WORKAROUNDS` (`src/ir/CubeDialects.ts`) lists them by the engine's database type name, in a `Map` read
through `getDialectWorkarounds`, never a plain object keyed by a model-supplied name. Execute and Show Pure pass the
type of the runtime's connections to the databases the query reads, when each of them has a connection there and all
share one type (`getDatabaseType`), and wait for the model outline, loaded once per model, only when a Drop, Slice,
Limit or Distinct is at or upstream of the capture node (`needsDatabaseType`). Typing passes no type. Every other
database, an unknown type and a model whose outline fails to load keep the native forms.

| Database type | Drop        | Slice       | Limit       | Distinct | Why                                                                                                                                                                                                                                                                                             |
| ------------- | ----------- | ----------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SqlServer`   | row numbers | row numbers | native      | padded   | Rejects the engine's `limit m,-1` and `limit m,n`; also its `select top N distinct` for a Distinct before a limit (💭, plans only)                                                                                                                                                              |
| `Sybase`      | row numbers | row numbers | native      | native   | Rejects the engine's `limit m,-1` and `limit m,n`                                                                                                                                                                                                                                               |
| `SybaseIQ`    | row numbers | row numbers | row numbers | padded   | The engine numbers the rows by the first sort key only, which takes any of the tied rows, in a column it always names `row_number`, which clashes with an input column of that name, and numbers a later Limit's rows inside the `select distinct`, which then removes nothing (💭, plans only) |
| `DB2`         | row numbers | native      | native      | native   | Rejects the engine's `limit m,-1`                                                                                                                                                                                                                                                               |
| `MemSQL`      | row numbers | native      | native      | native   | The engine numbers a Drop's rows by the first sort key only                                                                                                                                                                                                                                     |
| `ClickHouse`  | row numbers | native      | native      | native   | After a descending sort key, the engine writes `nulls firstoffset m` as one word (💭, plans only)                                                                                                                                                                                               |

- **Row numbers:**
  `->extend([<keys>]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | <range>})->select(~[<input columns>])`,
  numbered from 1 in the input's row order, else by the first column that sorts (`isSortableType`), ascending. No
  sort is written before it (SQL Server rejects an ORDER BY in a derived table). Drop keeps `$row.cube_rn > <size>`,
  Slice `($row.cube_rn > <start>) && ($row.cube_rn <= <stop>)` (its range counts from 0) and Limit
  `$row.cube_rn <= <size>`. When no column sorts, the native form is written, for the engine to report.
- **Padded Distinct:** `->distinct()->extend(~cube_d: x | 1)->select(~[<input columns>])`, so the distinct keeps its
  own query.
- `cube_rn` and `cube_d` take a number (`cube_rn2`, `cube_rn3`, …) until no input column has the name in any case
  (`getTemporaryColumnName`), as SQL Server, MemSQL and DuckDB see one column.
- Spanner never gets row numbers (no window columns). A plan-only test (`LegendCubeDialects.engine-roundtrip-test.ts`,
  `generatePlan` with one static connection per database type) checks the SQL of 17 database types.

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
| Count rows (M4)        | `x \| 1 : y \| $y->count()`            | not yet (M5)                              | Every row, null or not (`count(1)` ✅); answers §12.2 item 3 (§11.5 Q1)                                                      |
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

| Gap                                                                                                                  | Handling                            |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| No Difference relation function                                                                                      | Emulation                           |
| Window `count()`                                                                                                     | `size()`                            |
| Window filter pushdown                                                                                               | `let` isolation                     |
| Drop and Slice on SQL Server, Sybase and Sybase IQ; Drop on DB2, MemSQL and ClickHouse; every Limit on Sybase IQ     | Row numbers (sorted `over()`, §8.8) |
| A Distinct before a limit: `select top N distinct` on SQL Server, numbered inside the `select distinct` on Sybase IQ | Padded Distinct (§8.8)              |
| Exact comparison on 32-bit REAL columns                                                                              | Inline hint (§5.5); tests avoid it  |
| Windowed DistinctCount portability                                                                                   | `groupBy` + join                    |
| Engine ignores join/filter value types                                                                               | Cube validation                     |
| Outer-join multiplicity; Sum and Average typed `[1]` ✅ (M4)                                                         | Cube infers nullability             |
| `concatenate` of different column counts typed as the shorter relation ✅ (M4)                                       | Cube validation (§8.8)              |
| `CHAR`/`BINARY`/view typing                                                                                          | Picker flags                        |
| `#P`/`#I` not in the open-source engine                                                                              | Mocks (D6)                          |

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

**M2 (§11.4):**

- **Quick actions** (spec §12.4) on a cell's context menu: "Sort by "X"" and "Filter by "X"", then a separator and
  ag-grid's own items (`getCubeGridContextMenuItems`); outside a cell, only ag-grid's. Sort by adds an ascending Sort
  on the column, Filter by an Equal on the clicked value (IsEmpty on a null cell; a timestamp's trailing `+0000`
  dropped). The node goes after the selected node, as one undo step that selects it. Nothing runs: the rows turn
  stale. Group by joins them in M4 (below).
- **When they can be used** (`getCubeGridQuickActions`, read when the menu opens): only while the rows shown are from
  the current query, no run is in progress and the cube can be changed (not read-only). Sort by is also disabled on a
  type that can't be sorted (`isSortableType`); Filter by on a non-null value whose column type has no Equal, or that
  doesn't read as one of that type. A disabled item gives its reason as its tooltip; Filter by's Equal on a Float
  column carries the floating-point hint.

**M4 (§11.5):**

- **"Group by "X""**, between Sort by and Filter by: a Group with the key `[X]` and Count rows (spec §7.2's default is
  Count of X), named `Count Rows`, or `Count Rows 2`, `Count Rows 3`… when that folds to an input column's name. It is
  added and enabled as the others are, and also disabled on a type that can't be grouped (VARIANT, OPAQUE). It changes
  the schema, so later nodes may turn invalid (visible, undoable).

**Later (M7):**

- Server-side mode on the enterprise SSRM, with drill-down (§12.2) **derived as lambdas**: filter by the expanded
  keys, `groupBy` the next level, sort, slice. The user's graph is never touched.
- A bounded LRU cache keyed by the derived lambda (fixes §21's unbounded cache).
- Typed group keys with an out-of-band null marker instead of the `"(null)"` string sentinel.
- Export: CSV through the engine (`serializationFormat=CSV`), XLSX through ag-grid's enterprise `ExcelExportModule`.
  The engine has no XLSX format ✅.
- The context menu, curated (spec §12.4): until then ag-grid's own items follow the quick actions.
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
- **M2's transforms** (§11.4; sample `operations.cube.json`): `sort` stores `{sorts: [{column, direction}]}`, most
  significant first, with `ASC` or `DESC`; `restrict` `{columns: […]}`; `rename` `{mappings: [{from, to}]}`, so no
  column name becomes a key; `distinct` nothing of its own; `limit` and `drop` `{size}`; `slice` `{start, stop}`,
  counting rows from 0 with `stop` excluded. Names are kept exactly (untrimmed, blanks and repeats included) for
  validation to judge. Sizes and indexes are JSON numbers, not strings: they are settings, not values.
- **M4's transforms** (§11.5; sample `operations.cube.json`): `group` stores
  `{columns, aggregations: [{column, function, name}]}`, both lists always written, with no `column` for Count rows
  (`{function: 'CountRows', name}`). Every output name is stored: one left out is read as its auto-name and written
  back with it (Q3). An unknown, empty or window-only function is kept as text, invalid, and saved again unchanged
  (Q4). `concat` stores `{widenTypes}` (Convert types), always written, `false` included, so the key ships with the
  kind: a missing one is a decode error.
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
    goes through the codec's tests. The marks (user, 2026-10-08): `@finos/legend-cube`'s README says so, and in the UI
    the "(dev)" on Export and Import is the marker; the spec itself carries none.
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
  - a known node whose settings can't be read (e.g. `joinType: 'CROSS'`; from M2 an unknown sort direction, or an
    unknown key on a sort entry or rename mapping; from M4 an unknown key on an aggregation, or a `widenTypes` that
    isn't true or false) becomes an **Unknown node** that keeps its JSON, its kind and its inputs. An
    empty direction is still a decode error, as an empty `joinType` is;
  - a missing or wrongly typed required field (no `database`, a non-array `leftColumns`, a non-boolean `nullable`,
    a known field set to `null`; unknown keys and an Unknown node's JSON keep their nulls) and a model that is not an
    object with a non-empty string `_type` are still **decode errors**. A model of a `_type` the builder can't run is
    not (§6.2.2).
- **Unknown keys are kept on every object**: top level, `context`, `query`, nodes, snapshot columns and
  types, `meta`, `presentation`, width items. Rules and values are the exception above (unsupported), since ignoring
  a key such as `caseInsensitive` would change the rows; so are sort entries and rename mappings (an Unknown node,
  M2), and aggregations (M4). A future key that would change the rows on a node with no list (e.g. Distinct gaining
  `columns`) needs a new kind or a format version, since an older reader would keep it in `rest` and ignore it (M2,
  §11.4). A snapshot column's unknown keys (on the column or its
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
  lists are always written, as are M2's `sorts`, `columns` and `mappings` and M4's `columns`, `aggregations` and
  `widenTypes`, empty lists and `false` too. A clearable setting (a Limit's or Drop's `size`, a Slice's `start` and
  `stop`) is the exception to "at its default is left out" (M2,
  §11.4): it is written whenever set, its default included, and left out only when cleared, never as `null` (a decode
  error), so it reads back cleared and the panel counts clearing a default as an edit. An enumeration column's type
  is `{path, values: [...]}`. Spec JSON is always produced
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
[QueryEditorStore.ts:556-585](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts#L556).

- **`content` must be Pure-lambda text.** Legend Query re-parses it on load
  ([QueryEditorStore.ts:2604](../../../packages/legend-application-query/src/stores/QueryEditorStore.ts#L2604)).
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
| **M1.9**  | Slice acceptance and hardening: manual script (§11.2 part B) on `yarn dev:query` + engine; package READMEs; optional Playwright e2e against the real engine (the `legend-application-studio-e2e` pattern, not query-e2e's mocked engine; none, as settled below)                                                                                   | Part B passes; M1 review sign-off                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Ordering note: M1.7 runs before M1.8 on purpose, as §20 says ("prove the engine round trip before building the
canvas"). If the canvas misbehaves, it is the canvas. Layout determinism needs no separate test: inputs are sorted
before layout, so it holds by construction.

**Settled at the start of M1.9** (user, 2026-10-08). PR #5591 was approved on `b1c73b640` and waits only on an
incident on legend-studio's side.

- **Where M1.9 lands:** a follow-up PR. M1.9 is built on `cubeV1` and nothing more is pushed to #5591. After #5591 is
  squash-merged, the M1.9 commits move onto master (`git rebase --onto origin/master b1c73b640 cubeV1`, `b1c73b640` being #5591's head as
  merged, not the squash commit; done 2026-10-08 onto `fbde4379f`) and the
  follow-up PR adds a patch changeset for each library package it touches. #5591's description is edited only with
  wording the user approves.
- **Acceptance and sign-off:** first a rehearsal of Part B in a real browser on the final head (with the canvas-fit
  and console checks), fixing what it finds; then the user runs Part B by hand, including the physical keys (Cmd-click,
  F9, Cmd+Z). "M1 review sign-off" is the finos approval of #5591 plus the user's dated OK, both recorded in
  PROGRESS.
- **E2E:** none for now, and none planned as a follow-up. Part B by hand stays the only browser check, and canvas fit
  stays a manual check (§11.2 Part B).
- **READMEs:** short, in the repo's library shape. The how-to guides (adding an operation, testing, hosting) live in
  each package's `docs/` folder, linked from the README, as `legend-query-builder` does. M1.9 writes them; the
  operations work keeps them current.
- **Test gaps:** the two small ones (an empty schema seen from the page, unexpected rejections in the picker) are
  closed, and the two that existing tests already cover leave ISSUES. Independent checking of the grid tests and
  Part A's extras stay in ISSUES.
- **`V1_*` in engine-backed tests:** allowed (user: "we can use V1 outside"). The engine-roundtrip tests in
  `legend-cube-builder/src/__tests__/` need both the `v1/` adapter and `stores/`, which the import-hierarchy lint rule
  keeps apart, so they import `V1_*` from there. Product code keeps the rule (§3.7).
- **Public API:** the builder drops exports nothing outside it uses. The core keeps its `export *`, with a README note
  that the API is unstable before 1.0. **Reversed** (user, 2026-10-08): `@finos/legend-cube-builder` 0.0.2 was
  released with those exports before the follow-up PR, so removing them would break its published API; they stay.
  - **Technical (decided without asking):** the engine port (`CubeEngine.ts`) stays `export *` from the builder,
    though Legend Query names only `CubeEngine` and `CubeModelOutline` today: a host implements or fakes the port, and
    needs its error, result and outline types to do so.
- **Docs trim:** session-only content leaves PLAN and PROGRESS before merge (the resume prompt, local paths, workflow
  run ids), and `path:line` links become links GitHub can follow, after the READMEs take over the setup.
- **Browsers:** Chrome only, with its version recorded. Firefox and Safari are listed in ISSUES as untested.
- **Docker CORS:** waived. There is no docker locally; the acceptance record says it is unchecked.
- **Draft format marker:** the core README says the saved format is a draft until M8, and the "(dev)" labels on
  Export and Import are its marker in the UI (§10.3).
- **Undo after a run:** the rows stay marked stale, as §7.8 settles: a restored query is a new object.

### 11.2 Slice acceptance test

**Part A: automated** (`legend-cube-builder/src/__tests__/LegendCubeNorthwind.engine-roundtrip-test.ts`, which
imports `V1_*` under the test exception in §3.7). Items 7 and 8 need no engine: they are core unit tests in
`@finos/legend-cube` (`Join.test.ts`, `CubeMessages.test.ts`, `SchemaInference.test.ts`, `Filter.test.ts`), on
synthetic schemas rather than the resolved fixture.

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

Prerequisites:

- **An engine on :6300** that allows LocalH2 (the bundled model sets up Northwind in H2 through `testDataSetupSqls`).
  Either IntelliJ (`org.finos.legend.engine.server.Server`, no arguments) or the repo's docker compose:
  `cd fixtures/legend-docker-setup/grammar-test-setup && docker compose --file=grammar-test-setup-docker-compose.yml up --detach`.
  Check it with `curl -s localhost:6300/api/server/v1/info`, and record its `git.commit.id`.
- **CORS** from `localhost:9001` is verified for the IntelliJ engine only. For docker it is waived (user, 2026-10-08):
  the record says it is unchecked.
- **The dev server:** run `yarn build` once (`yarn dev:ts` doesn't build the stylesheets, `lib/index.css`), then
  `yarn dev:ts` and `yarn dev:query`.
- **Chrome**, with its version recorded. Other browsers are untested (ISSUES.md).

The script avoids exact comparisons on the fixture's 32-bit `REAL` columns (§6.2.4).

1. Open `http://localhost:9001/query/cube` and open the picker: **Add table**, the canvas's "add a table" link, or the
   palette's **Relational Database Table**. Model ("Northwind (Cube fixture)"), Database and Runtime
   (`showcase::northwind::mapping::StoreRuntime`) fill themselves; choose Schema **NORTHWIND** (the list also shows
   CUBETEST, and `default`, which holds only a decoy table).
2. Add **ORDERS** (14 columns). The picker closes after each **Add**, so open it again and add **CUSTOMERS** (11
   columns). Both land on the canvas with their
   schemas; ORDERS, the first table, has the accent ring of the node Execute runs. Click ORDERS: the side panel's
   Columns table shows `ORDER_ID SmallInt` and `CUSTOMER_ID Varchar(5)?` (CUSTOMERS' own `CUSTOMER_ID` is its key,
   with no `?`).
3. Drag **Join Another Input** from the palette onto empty canvas. It shows incomplete (a dashed amber border). Drag
   from ORDERS' output handle (its right side) to the Join's upper input handle (Left), and from CUSTOMERS' to the
   lower one (Right). The Join now shows invalid (a red border); its tooltip and, once you click it, the red text at the
   bottom of its editor say "Left join columns cannot be empty."
4. Click the Join. Set **Join type** to **Inner** (a new Join is Left Outer, which gives the same 19 rows here, so the
   row count can't catch it), click **Add join columns**, pick `CUSTOMER_ID` on both sides and **Apply**. The Join
   turns valid, and its two input edges are labelled Left and Right.
5. Drag **Filter by Column** onto the Join: it splices in after it. Click the Filter; it has one blank condition. Build
   three rules with **Add condition**, each a column, an operator and a value: `SHIP_COUNTRY` **is** `France`,
   `ORDER_DATE` **is greater than or equal** `1997-01-01`, and `EMPLOYEE_ID` **is in list of** `1`, `4`.
   - `SHIP_COUNTRY`'s operator list (a string: is, starts with, contains, …) differs from the list `ORDER_DATE` and
     `EMPLOYEE_ID` share (is, is greater than, is less than, …).
   - A value is "(blank)" until clicked; type it, then Enter or click away. The date is the browser's date field. An
     In list adds a value each time you fill the "(blank)" box below its values; each value has an × to remove it.
   - Typing `abc` for `EMPLOYEE_ID` is flagged inline: a red border, and the tooltip says
     `Filter value "abc" is not a valid SmallInt.` Remove it.
   - **Apply** stores the three rules as one step.
6. Make the Filter the node Execute runs: Cmd-click it on macOS (Ctrl-click opens the context menu there), Ctrl-click
   elsewhere, or **Select** in its context menu or editor header (which then reads "(Selected)"). Press **F9** (Fn+F9
   on some Mac keyboards) or click **Execute**. The grid toolbar shows "19 rows in …", the `ORDER_ID` set of §8.5.
   Record how the node was selected and how F9 was pressed.
7. Edit the filter (e.g. remove a rule) and **Apply**: the toolbar shows "Stale: execute again to refresh". Click
   **Undo** (or Cmd/Ctrl+Z with the focus outside a text field and no Cube dialog open): the three rules come back,
   and the rows stay marked stale, by design (§7.8: a restored query is a new object). **Show Pure** opens "Pure
   query" with the lambda: it has `->limit(1001)`, one more than the default 1000 rows, and ends in
   `->from(showcase::northwind::mapping::StoreRuntime)`.
8. **Export (dev)**, then **Download** (`cube.cube.json`, since the cube has no name), and close. Reload the page:
   the cube is gone. **Import (dev)**, click **Choose File** and pick the downloaded file (or paste its text into the
   "Cube spec" box), then **Import**. Import never executes:
   the same graph comes back (`relational101`, `relational102`, `join101`, `filter101`, with the Filter still
   selected), and **F9** gives the same 19 rows. A second Export gives the same text as the downloaded file.

Also check and record:

- **Canvas fit:** every node stays inside the canvas and the minimap covers none, after each node is added, after the
  Join is connected and the Filter spliced in, after the editor panel opens and closes, after Import, and after
  height-only changes: dragging the splitter between the graph and the grid, and changing the window's height.
- **No watermark** on the grid (D3: `localhost` shows none).
- **The console, through the whole run**, at the Default and Verbose levels: outside production builds,
  `legend-lego`'s DataGrid sends `console.error` to `console.debug` from each render until the grid is ready
  (Appendix B), so an error logged while a run's grid loads shows only as Verbose. Expected: React 19's "Accessing element.ref was removed"
  from `react-reflex` when the editor panel opens or a splitter moves (Appendix B), and the Query ServiceWorker's
  "fetching the script" errors. Anything else is recorded.

**Part B2: sources, manual, in the UI** (the direct connection, data products and ingest data sets, §6.7, §6.8)

Prerequisites: as Part B. Data products also need a Query configured with a lakehouse and a depot that serve deployed
data products (an internal deployment); without a lakehouse the page shows no Data Product item. Two optional Query
keys turn on the rest (hosting.md):

- `marketplace.serverUrl`, the same value as Legend Marketplace's own `marketplace.url`: search runs on the
  marketplace server. Without it, the list is the lakehouse's lite list and search filters it in the page.
- `extensions.core.dataProductConfig.publicStereotype`, the same stereotype Studio and Marketplace use: groups open
  to everyone show **Enterprise access**, and groups with no contract show **No access**. Without it, only groups
  with a contract show a badge.

Direct connection:

1. Open the dialog from the palette's **Relational Database Table**, and click the **Database connection** tab. The
   form starts on H2 with a sample setup SQL. Click **Test connection**: schema `CUBE_SAMPLE` is chosen, and its
   tables list CUSTOMERS (3 columns) and ORDERS (4 columns).
2. Add **ORDERS**; open the dialog again (it reopens on the Database connection tab, with the Model and Data product
   tabs disabled) and add **CUSTOMERS**. Click ORDERS: the Source panel shows the connection's summary ("H2: an H2
   database in the engine's H2 server, 6 setup statements, authentication h2Default"), never its setup SQL.
3. Join them on `CUSTOMER_ID` (Inner), make the Join the node Execute runs (Cmd/Ctrl-click it, or **Select**), and
   press **F9**: 4 rows, with CUSTOMERS' `COMPANY_NAME` and `COUNTRY` columns. Add a Filter `COUNTRY` **is** `Germany`
   after the Join, select it and press **F9**: 2 rows, `ORDER_ID` 10248 and 10251.
4. On a new cube (reload), choose **DuckDB**, leave the file empty (in memory), give setup SQL such as
   `drop schema if exists s cascade; create schema s; create table s.t (a INTEGER); insert into s.t values (1);` (one statement per line, each ending
   with `;`), **Test connection**, add `t` and press **F9**: 1 row.
5. **Export (dev)** and **Import (dev)** the H2 cube: the same graph comes back, and **F9** gives the same rows.
6. On a new cube, choose **DuckDB**, open **Load a CSV**, paste `id,city` / `1,Paris` / `2,Lima` (three lines), name
   the table `cities` and click **Add to setup SQL**: the setup SQL now creates `csv.cities`, and the tab says "Added
   table csv.cities: 2 rows, 2 columns". **Test connection**, pick schema `csv`, add `cities` and press **F9**: 2 rows.
   Choosing a `.csv` file fills the box and the table name the same way.

Data products:

1. The palette shows **Data Product** with a BETA badge. Click it: the dialog opens on the **Data product** tab, Mode
   **Production**. The deployed products list; search narrows it (with `marketplace.serverUrl`, on the marketplace
   server: a search with more than 100 matches says "Too many matching items; list truncated.").
2. Pick a product: its access points show by group, each group with your access as the marketplace shows it
   (**Entitled**, a pending state, **Enterprise access** or **No access**). A parameterized access point is disabled
   and says why. Pick an access point: the preview shows its description, its columns with their types and sample
   rows; **Open in Marketplace** opens the product's page in the marketplace of its class (production or production
   parallel). The warehouse reads `LAKEHOUSE_CONSUMER_DEFAULT_WH` (or the one you last used); change it if needed.
3. Add an access point. Open the dialog again: it opens on the same product with its access points shown, the Mode
   and warehouse are fixed, and **In this project** lists only that project's products at that version. **Search
   all** lists the others too, greyed, each saying why ("Belongs to project …", "Deployed from version …"). Add a
   second access point of the same product.
4. Join the two on a shared key and press **F9**: rows come back. **Show Pure** shows two `#P{…}#` accessors and
   `->from(cube::dataProduct::Runtime)`.
5. Click an access point's node: the Source panel shows the environment, the data product with **Open in
   Marketplace**, the group, the project and its version (a `-SNAPSHOT` version is labelled as one that may change).
   Type another warehouse and click **Apply**: the grid's rows are marked stale, and **F9** runs on it. **Undo**
   (Ctrl/Cmd+Z) brings the old warehouse back in one step. A new cube then starts on the warehouse last applied.
6. Apply a warehouse that doesn't exist and press **F9**: the error says the run couldn't use that warehouse and
   points to the Source panel. If you have an access point you aren't entitled to, run it: the error offers **Request
   access to <group> in <data product>**, linking to the marketplace.
7. Click **Refresh** in the Source panel: the access point's columns are read again from the deployed artifact (no
   warning when nothing changed).
8. On a new cube, choose Mode **Production (parallel)**, add an access point and press **F9**.
9. **Export (dev)** and **Import (dev)** the first cube: the same graph comes back, its access points are re-checked
   against their deployed artifacts, and **F9** gives the same rows.

Ingest data sets (Query's `lakehouse.platformUrl` set; without it the page shows no Ingest Dataset item):

1. The palette shows **Ingest Dataset** with a BETA badge. Click it: the dialog opens on the **Ingest** tab, Mode
   **Production**, and shows your environment, read-only. Pick a producer deployment: its deployed definitions list
   with their project (`group:artifact`); search narrows them. Definitions deployed ad hoc, or to another environment,
   are counted below the list, not shown.
2. Pick a definition: its data sets list with their column counts; a materialized view is disabled and says why. Pick
   a data set: its columns show, the declared ones then `LAKE_IN_ID`, `LAKE_OUT_ID` and `LAKE_DIGEST` (and
   `LAKE_FROM`, `LAKE_THRU` for a business-temporal one). The warehouse reads `LAKEHOUSE_CONSUMER_DEFAULT_WH` (or the
   one you last used); change it if needed.
3. Add the data set. Open the dialog again: the Mode, producer deployment and warehouse are fixed, and the Model,
   Database connection and Data product tabs are disabled. Add a second data set of the same producer.
4. Join the two on a shared key, add a Filter `LAKE_OUT_ID` **is** `999999999` (or the current-rows marker your
   deployment uses) before the Join if they are batch-milestoned, and press **F9**: rows come back. **Show Pure**
   shows two `#I{…}#` accessors and `->from(cube::ingest::Runtime)`.
5. Click a data set's node: the Source panel shows the definition (its URN on hover), the data set, the environment,
   the producer deployment and the warehouse. Apply another warehouse: the rows are marked stale; **Undo** brings the
   old one back. Apply one that doesn't exist and press **F9**: the error says the run couldn't use it, beside the
   warehouse and in the run's error. Click **Refresh**: the columns are read again (no warning when nothing changed).
6. On a new cube, choose Mode **Production (parallel)**, add a data set and press **F9**.
7. **Export (dev)** and **Import (dev)** the first cube: the same graph comes back, its data sets are re-checked
   against their definitions, and **F9** gives the same rows.

Record the deployment, the products, access points and data sets used, whether the optional keys were set, and any
console errors.

### 11.3 After the slice (recommended order, outline)

| #    | Milestone                                  | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2.0 | legend-graph types (D12)                   | Fix legend-graph's precise primitives as their own PR to master: resolve by full path as well as short name, fix the `Timestamp` path (now a relational class), deprecate the phantom `Decimal`/`Date`/`Time` precise constants, keep parameters through `getLambdaRelationType`, fix its batch variant. Then rebase `CubeType` on legend-graph's `GenericType`; the core may depend on legend-graph's metamodel (never `V1_*`); update §3.3 and Appendix A (§2.2). Needed when Cube types tables locally; no longer gates M3's sources (user, 2026-10-08, §6.8) |
| M2   | Simple unary transforms + Join autofix     | Rename (§7.5 + collision fix; regex replaced, see Appendix A), the **Join rename autofix** (collision-free names), Restrict (input order), Sort (+ "Sort only affects output at the sink" warning), Distinct, Limit, Drop, Slice (`[start, stop)`); the database workarounds of §11.4 (row numbers for Drop and Slice on SQL Server, Sybase and Sybase IQ, for Drop on DB2, MemSQL and ClickHouse and for every Limit on Sybase IQ; a padded Distinct on SQL Server and Sybase IQ); grid quick actions (Sort by / Filter by X)                                   |
| M3   | Entry points, sources modal, depot catalog | The direct connection first, then data products (§6.8, moved up from M9). D7 follow-up: entry links (setup action, editor menu, deep links `/cube/new?…`), source-modal redesign, final look; the depot catalog (§6.3) with an SDLC-pointer model context and exact-store runtime filter; SNAPSHOT handling                                                                                                                                                                                                                                                      |
| M4   | Group and Concat                           | Aggregations (§10 with the §5.7 result-type rules, availability per family) and Count rows, `aggregate()` for global groups, the grid's Group by; Concat with precise-strict schema equality, Convert types (a type-only cast within numbers, strings or dates) and the Rename and Restrict autofixes; a conformance suite comparing local inference with `lambdaRelationType` for every node type, exact on nullability but for each case's declared wider columns (§11.5)                                                                                      |
| M5   | Partition (windows)                        | §8.6 `let` isolation, array form, `size()` counts, sort required for ranking, frames decision; a **dialect harness** (`generatePlan` per database type over golden lambdas)                                                                                                                                                                                                                                                                                                                                                                                      |
| M6   | Extend and Difference                      | Expression editor (Monaco), JSON-canonical expression storage + display text, engine typing over an empty model with cached types, plan-time validation; Difference emulation with §7.12 semantics                                                                                                                                                                                                                                                                                                                                                               |
| M7   | Grid and presentation                      | Server-side mode (enterprise SSRM) with lambda-derived drill-down, CSV and XLSX export, the context menu, stats, §13 column formatting with the §21 fixes                                                                                                                                                                                                                                                                                                                                                                                                        |
| M8   | Persistence                                | Engine Cube store PR (§10.6), Studio client, `CubeStore` port, Save/Load/Copy/Paste, `/cube/:cubeId`, modified state, `beforeunload`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| M9   | More sources                               | Services → Pure functions, with parameter forms (§17.6); data products and ingest moved to M3 (§6.7–6.8)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| —    | Out of scope                               | Publishing and service registration (§15); V0 import                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

M2 comes before M3 because it is cheap, testable headlessly, and gives the POC real breadth while the entry points
and sources modal are designed. M3 can run in parallel if desired.

**Every milestone that changes the UI ends with a demo video** of its new features (user, 2026-10-09), made as M1's
and M2's were: a Playwright script in the evidence folder's `demo/` (e.g. `demo-m2.mjs`) drives the dev server against
a local engine, with a caption per step and a screenshot per key moment; reviewers check each frame against its
caption, and every claim in a caption must be visible on screen; the video goes to the user and onto the milestone's
PR. Its step comes after the milestone's verification and rehearsal, before the rebase and PR.

### 11.4 M2: simple unary operations

M2 was built on the branch `cube-ops`, on master since #5634 (M1.9) merged as `3260216a6`, and merged on 2026-10-09 as #5644 (`0335b3f5f`). Its status is in [PROGRESS-M2.md](PROGRESS-M2.md), not in PROGRESS.md. Requirements: `m2-requirements` (5 readers, a merge, a
critic and a finalize step), 140 checklist items, a 17-step build order and 5 questions; the full result is kept in the
local evidence folder. The engine facts below were probed on the local engine (`93d92b4`) at compile and plan time ✅.

This subsection overrides the sections it names until they are updated (see "Supersessions" at its end).

**Settled at the start of M2** (user, 2026-10-08, all on the requirements' recommendation):

- **Base.** `cubeV1` had been rebased onto master `6041ba413` (#5631, just after the 0.0.2 release `43b06778a`,
  #5628) since `cube-ops` was created, and
  `cube-ops` had no commits of its own, so it was re-pointed at `cubeV1` (`b9923ed28`): the signed-off M1.9 code, its
  guides and the exports 0.0.2 published. #5634 was squash-merged the same day (`3260216a6`, the tree of
  `0807adb12`), and M2 was rebased onto master with `git rebase --onto origin/master b9923ed28 cube-ops`. The base's
  one commit #5634 didn't carry (`b9923ed28`, the DuckDB WASM note in §12.2) stays on `cubeV1`, where a later rebase
  made it `81cf0d80c` (the same patch).
- **First operation:** Limit, end to end (core, codec, emitter, editor, engine test, browser), before the others. It
  has a setting, a draft, a codec number, a message, an integer literal and an editor input.
- **Where Sort's ORDER BY goes (answers §12.2 question 2): where the order is used.** Probes of
  `<table>->sort(…)->X->limit(1001)` on H2, Postgres, SQL Server, Snowflake, DB2 and Oracle:

  - the ORDER BY stays in the outer query through Filter, Distinct, a Restrict that keeps the sort keys, and another
    Sort (sorts merge, the later keys first);
  - it moves into a derived table through any Rename, a Restrict that drops a key, and a Join on either side. SQL
    Server rejects an ORDER BY in a derived table without TOP;
  - after a Limit, Drop or Slice, the capture's own `limit(rowLimit + 1)` hides the display order.

  So a Sort node emits nothing where it stands. Cube tracks the row order through the graph (a host-free row-order
  module; keys follow Renames) and emits `sort(<keys>)` just before a Limit, Drop or Slice that takes rows by that
  order, and before the capture's limit: `{| <relation>->sort(<order>)->limit(rowLimit + 1)->from(runtime)}`. That
  SQL is correct on every database probed at the start of M2; Sybase IQ, probed in M2.16, numbers a Limit's rows by the
  first sort key only, which the database workarounds below cover. Show Pure shows the sort near the end. Typing
  lambdas carry no sort.
  The warning fires only when the order is lost: a Join, a Restrict that drops sort keys (partial loss names the
  columns), or a later Sort on all the same columns. It is derived, never stored and never a validation error, so
  Execute stays enabled.

- **Databases whose engine SQL is rejected or takes the wrong rows: detect them from the runtime.** For a Drop or
  Slice inside a query (Cube's always is, under the run's own limit), the engine writes `limit m,-1` / `limit m,n`,
  which SQL Server and Sybase reject (Drop also DB2), or numbers the rows itself by the first sort key only, in a column
  it always names `row_number` (Sybase IQ Drop, Slice and Limit; MemSQL Drop: `rewriteSliceAsWindowFunction`), which
  takes any of the tied rows and clashes with an input column of that name; after a descending key, ClickHouse writes
  a Drop's `nulls firstoffset m` as one word. It writes a Distinct before a limit as `select top N distinct` on SQL Server, which T-SQL
  rejects, and on Sybase IQ numbers a later Limit's rows inside the `select distinct`, which then removes nothing
  (💭, plans only). The model outline gains each runtime's connection database types; Execute and Show Pure pass the
  capture's type to the emitter, waiting for the cached outline only when the capture subtree has a Drop, Slice, Limit
  or Distinct (a Limit only needs it on Sybase IQ, but the wait is short and the outline is cached). Those databases get:

  - Drop and Slice through row numbers (SQL Server, Sybase, Sybase IQ; Drop also DB2, MemSQL and ClickHouse), and every
    Limit on Sybase IQ (M2.16):
    `->extend(over(<order>), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter(<range>)->select(<input columns>)`,
    `over()` sorted by the input order, else by the first sortable column; row numbers count from 1;
  - Distinct padded on SQL Server and Sybase IQ: `->distinct()->extend(~cube_d: x | 1)->select(<input columns>)`.

  Every other database keeps the native form, and so does an unknown type. The workarounds are data
  (`CubeDialects.ts`, read through a `Map`, never a plain object keyed by a model-supplied name); BigQuery joins the
  table only after a plan probe, and Spanner never gets the row-number form (no window columns). The outline's
  runtimes gain an optional `connections` list of `{storePath, databaseType}` (a list, never a record keyed by store
  path). Execute and Show Pure set their run or request state before they wait for the outline, and check it after,
  so a second F9 is ignored and Stop can abort while the outline loads. The engine defects are drafted in ISSUES.md
  for the user to file. Temporary columns (`cube_rn`, `cube_d`) and a Rename's new names count a name taken in any
  case, as SQL Server, MemSQL and DuckDB see one column (M2.16).

- **Slice's wording:** the canvas reads `Take rows 10 to 20 (20 excluded)` (`Take rows 10 to (blank)` when the stop
  is missing); the help text reads "Reduces the number of rows in the previous data set, keeping only the rows from
  position "start" up to, but not including, position "stop", counting from 0."; the editor hints "Rows count from
  0: the start row is kept, the stop row is not." The palette label stays the spec's `Take rows <x> to <y>`.

**Decided without asking** (technical choices from the requirements, listed for review):

- **Nodes.** One immutable `UnaryNode` class per operation in `src/nodes/transforms/`: `Sort`, `Restrict`,
  `Rename`, `Distinct`, `Drop`, `Limit`, `Slice` (types `sort` … `slice`, spec §7.0). Registered in spec menu order
  (Sort, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Join), with the spec's palette labels, `<x>`
  included. A type is registered in the step that adds its editor, help text and icon. Constructors refuse only
  wrong shapes (an unknown direction, NaN, Infinity); every other invalid state is constructible and reported by
  validation. No M2 node redacts anything: names and sizes are not values.
- **Clearable settings.** Limit and Drop take `(id, size: number | undefined)` and Slice `(id, start, stop)`, with no
  JS defaults (a default parameter also replaces an explicit `undefined`); the defaults (10; 10 and 20) live only in
  `create(id)`. A cleared field is `undefined` and invalid ("Size must be a positive whole number."), never the
  default. Size 0, Drop 0 and an empty Slice stay invalid, as the spec says, though the engine accepts them. Slice
  checks each bound, then `start < stop` (the engine plans a negative fetch otherwise); it has one edit method,
  `withRange(start, stop)`.
- **Sort.** Directions `ASC`/`DESC`, labelled Asc/Desc. "Sorts cannot be empty."; each column must exist; Cube
  adds "Sort column "X" of type Variant cannot be sorted." (VARIANT and OPAQUE, through one exported
  `isSortableType`, also used by the editor's picker, the Sort by quick action and the row-number fallback's default
  key) and "Sort columns cannot have duplicates.". The two Sort direction messages stay in the catalogue, unreachable.
- **Restrict.** Its messages use the labels `Columns` and `Column`. The output keeps the input's order; the editor
  stores picks in input order.
- **Rename.** The column-name rule (`src/schema/ColumnName.ts`, shared with the autofix, Group and Extend):
  non-empty, trimmed, no `"`, no `\`, no control characters, at most 128 code points. A backslash compiles in the
  rename but breaks every later reference to the column ✅; `"` and control characters compile but are banned by
  Appendix A's rule. Failures use the catalogue's "New column name is not valid column name.", and the editor shows
  the rule under the field. A mapping may not share its old or new name with another mapping (no swaps or chains),
  and its new name may not be an untouched input column: "New column name "X" is already present in the input
  schema." (the collision fix). Names are never trimmed. Postgres truncates identifiers at 63 bytes (💭); recorded in
  ISSUES.
- **Join autofix.** For each duplicate column `c`, a Rename before each input gives `c_1` (Left) and `c_2` (Right),
  then `c_<side>_2`, `_3`… when a name is taken in either input or already generated; names are cut to 128 code
  points. Key lists are rewritten through the same renames, so a duplicate that is a key at another position, or
  crossed keys, still give a valid join. New Renames are always added, never merged into existing ones. One query
  change, one undo step, the selection kept; the panel's edits are applied first. Core API:
  `planJoinDuplicateFix`, `canFixJoinDuplicates`, `fixJoinDuplicates` (`JoinAutofix.ts`, not on `Query`).
- **Row order.** `outputOrder` and `consumesInputOrder` on nodes, `computeRowOrders(query)`: a source and a Join give
  no order, Filter, Distinct, Limit, Drop and Slice pass it on, Rename renames its keys, Restrict keeps the longest
  prefix whose columns it keeps, Sort puts its keys first, and only an Unknown node leaves it unknown. The warning
  (`findLostSortOrders`) and the emitter both use it.
- **Saved spec.** `{sorts: [{column, direction}]}`, `{columns: […]}`, `{mappings: [{from, to}]}`, nothing for
  Distinct, `{size}` and `{start, stop}`. Lists are always written, empty ones too. Sizes and indexes are JSON numbers
  (strings are for literal values only), written whenever set, defaults included; a cleared one is left out, never
  `null`, so it reads back as cleared and the panel counts clearing a default as an edit. An unknown non-empty
  direction, or an unknown key on a sort entry or rename mapping, makes the node an Unknown node (it could change the
  rows); an empty direction is a decode error, as an empty `joinType` is. A future key that changes rows on a node
  with no list (e.g. Distinct gaining `columns`) needs a new kind or a format version. Samples: one shared
  `operations.cube.json` extended by each step, plus `join-autofix.cube.json`.
- **Emission.** New roles: `take` (a Limit node, distinct from the capture's `limit`), `drop`, `slice`, `distinct`,
  `sort`, `sortKey` (stamped with the declaring Sort), `captureSort`, `rowNumber`, `rowRange`; Restrict reuses
  `select`, Rename `rename`. `EmitContext` gains optional `inputOrder` and `databaseType`, `ExecutionOptions` an
  optional `databaseType`, the builder's `CubeOutlineRuntime` an optional `connections`, and `emitRelation` an
  options bag that keeps typing (no sort, no dialect) apart from execution. Size literals are plain digits. Temporary columns (`cube_rn`, `cube_d`) get a numeric suffix until no
  input column has the name. The debug printer braces colSpec lambdas with several parameters (the bare form doesn't
  parse). The `v1/` serializer needs no change.
- **Editors.** Distinct registers an editor and no draft (PLAN §7.4 item 2 covers a type with nothing to edit) and
  is listed in `CUBE_NODE_TYPES_WITHOUT_SETTINGS`. Integer fields keep the typed text and read only `^[+-]?\d+$`
  (empty is cleared, never a default); Enter and Escape get no special handling, and Ctrl+Z is the field's own undo.
  Sort and Rename start with one blank row. Controls are found by stable labels: "Rows to keep", "Rows to drop",
  "Start row index", "Stop row index", "Sort column <n>", "Sort direction <n>", "Old column <n>", "New column name
  <n>", "Columns to keep". New editors work in either host
  (§12.2 question 1): their lists scroll on their own, pickers stay native selects, and nothing measures the panel.
  Icons from legend-art: Sort `SortIcon`, Restrict `DataCubeIcon.TableColumns`, Rename `PencilIcon`, Distinct
  `CompressIcon`, Limit `AlignTopIcon`, Drop `AlignBottomIcon`, Slice `AlignMiddleIcon`. Column tracing for the
  Join's "type unknown" warning learns Rename (`findColumnOrigins`).
- **Grid quick actions** (spec §12.4, in the client-side grid from M2, before ag-grid's own menu items, which stay
  until M7 curates the menu; no icons; Group by waits for M4). "Sort by "X"" adds an ascending Sort and "Filter by
  "X"" an Equal on the clicked value (IsEmpty on a null cell; a trailing `+0000` dropped; the floating-point hint on
  Float columns), after the selected node, as one undo step that selects the new node. They never execute: the rows
  turn stale. They are enabled only while the rows shown are from the current query and no run is in progress; Sort
  by is disabled on unsortable types, Filter by when no value can be built.
- **Tests.** M2's engine tests are a new `LegendCubeOperations.engine-roundtrip-test.ts`; Part A's file gains
  nothing but the outline's `connections` in its runtimes expectation (M2.13). A plan-only dialect test (`generatePlan`) runs on a test-only copy of the fixture model with one
  connection per database type. Rows are compared as sets unless a Sort reaches the capture node. The M2 browser
  rehearsal is a new evidence-folder script on :9002; still no e2e in the repo.
- **Process.** Steps are numbered from M2.1 (M2.0 is legend-graph types). One changeset,
  `legend-cube-unary-operations` (both Cube packages, patch). Both packages are published at 0.0.2, so M2 only adds
  exports and makes new interface fields optional.

**Steps:**

| Step  | Deliverable                                                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2.1  | This subsection and PROGRESS-M2.md (docs only)                                                                                                                                         |
| M2.2  | Limit in the core: node, codec, emitter                                                                                                                                                |
| M2.3  | Limit in the builder (draft, integer field, editor, help text, icon) and registered                                                                                                    |
| M2.4  | Limit on the engine and in the browser: the contract proven                                                                                                                            |
| M2.5  | Drop (native)                                                                                                                                                                          |
| M2.6  | Slice (native)                                                                                                                                                                         |
| M2.7  | Distinct (an editor without settings)                                                                                                                                                  |
| M2.8  | Restrict                                                                                                                                                                               |
| M2.9  | Rename, with the column-name rule and the collision fix                                                                                                                                |
| M2.10 | Join rename autofix                                                                                                                                                                    |
| M2.11 | Sort, the row-order module, and the ORDER BY where the order is used                                                                                                                   |
| M2.12 | The Sort warning                                                                                                                                                                       |
| M2.13 | Database workarounds: row numbers for Drop and Slice, padded Distinct on SQL Server, the runtime's database types                                                                      |
| M2.14 | Grid quick actions: Sort by and Filter by                                                                                                                                              |
| M2.15 | Docs, sample typing on the engine, changeset text                                                                                                                                      |
| M2.16 | Verification (reviewers and a skeptic per finding) and the browser rehearsal                                                                                                           |
| M2.17 | Rebase on the latest master, fold the supersessions below into the plan, re-apply the DuckDB WASM note (§12.2 item 9; `b9923ed28`, now `81cf0d80c` on `cubeV1`), PR when the user asks |

**Supersessions** (applied in M2.17 to the sections they change; kept here as the record of what M2 changed):

- §4: an entry per M2 node, and the row-order hooks; §4.7: the autofix's names and key rewrite.
- §7.4 item 2: a transform with nothing to edit (Distinct) has an editor and no draft.
- §8.2 step 3 and §8.4: the capture re-sorts by its order; §8.8: the Sort, Distinct, Drop and Slice rows and the
  database table above; §8.9: the SQL Server distinct.
- §9: Sort by and Filter by come in M2.
- §10.3: the M2 shapes and the rule for clearable settings (an exception to "absent or at its default is left out").
- §12.2 question 2: answered (above).
- Appendix A: §7.1 sortable types and duplicates, §7.4 Restrict's labels, §7.5 no backslash, §7.7/§7.9 defaults in
  `create`, §7.9 wording, §7.11 key rewrite, §12.4 client-side grid. Appendix B: rename and select duplicates fail with
  HTTP 500 and no source location, SQL Server's `top N distinct`, `rewriteSliceAsWindowFunction` numbering a subquery's
  Drop, Slice or Limit over the first sort key only (Sybase IQ, MemSQL) and inside a `select distinct` (Sybase IQ).
- §11.3's M2 row: the database workarounds are those of §11.4 (Sybase IQ's Limit and Distinct included).
- PROGRESS.md's "In parallel" note: M1.9 merged (#5634, `3260216a6`); M2 runs on `cube-ops` from master, with its
  status in PROGRESS-M2.md. (`cubeV1` now holds the DuckDB WASM note, `81cf0d80c`, and two later docs commits of its
  own session.)

### 11.5 M4: Group and Concat

M4 is built on the branch `cube-m4`, from master `d1c3f3ae6` after M2 merged as #5644 (`0335b3f5f`); its first
commit, `8c1d3f74e`, records that merge. Its status is in [PROGRESS-M4.md](PROGRESS-M4.md). Requirements:
`m4-requirements` (three readers, for Group, Concat and the cross-cutting work, and a synthesizer that merged them and
checked their claims): 52 checklist items, 16 steps and 8 questions, the full result kept in the local evidence folder
(`m4-requirements-result.json`). Engine facts were probed on the local engine (`93d92b4`): ✅ only where the
synthesizer re-ran the probe, 💭 where only a plan was made or a reader reported it.

This subsection overrides the sections it names until they are updated (see "Supersessions" at its end).

**Settled at the start of M4** (user, 2026-10-09, all on the requirements' recommendation):

1. **Count rows** (answers §12.2 item 3): an aggregation with no column, `x|1 : y|$y->count()` (`count(1)` ✅), saved
   as `{function: 'CountRows', name}`; the grid's `Group by "X"` adds it by default. Count of a column keeps D4's
   meaning (non-empty values, not nullable).
2. **Group keys:** a multi-select (spec §17.6) that stores new picks in the input's order, as Restrict does; a loaded
   order is kept until the user changes the picks.
3. **Output names are always stored.** The editor fills in the auto-name and follows column and function changes until
   the user edits it; a saved aggregation with no name gets the auto-name on read and is written back with it.
4. **An unknown, empty or window-only function** keeps the Group, holding the text: invalid with the spec's
   `… is unknown.` or `… cannot be empty.`, saved again unchanged, editable; Rank and DenseRank count as unknown in
   M4. (M2's empty sort direction is a decode error, but an invalid Group can't run, so no rows change.)
5. **Concat types: strict, as D5 says** (a type next to its own ancestor too, though the engine accepts it ✅), plus a
   saved setting that widens differing types within a family (numbers, strings or dates, broader than `TypeFamily`) by a
   type-only cast to their least common ancestor. The type message offers **Convert types**, which turns it on. Across
   families (`toOne()->toString()`) is later.
6. **Concat autofixes, as separate buttons that say what they do:** a Rename before the second input (a different or
   case-only name at a position, never a permutation), and a Restrict before the wider input (its extra columns, when
   the other's names are an in-order subsequence), naming the columns it drops.
7. **Conformance nullability is exact,** but each case declares the columns where Cube may be wider (outer-join
   padding, the FULL merged key, Sum and Average) and asserts only that Cube says nullable there. Replaces §12.1's
   one-way rule.
8. **Concat wording:** ports `First` and `Second`; help text "Combines the rows of the two previous data sets, keeping
   duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the
   same types."

9. **The alias shadow** (user, 2026-10-09, after M4.8): after renames that reuse a column's old name, nine database
   types are written `GROUP BY` the alias that a column of the subquery shadows; Cube doesn't work around it. The
   engine issue is drafted in ISSUES.md and `LegendCubeDialects.engine-roundtrip-test.ts` pins each database's form.

**Decided without asking** (from the requirements, for review):

- Output names: the spec's rules (§10.3), compared folded (`foldColumnName`), plus `isValidColumnName` (a `"` fails at
  execution 💭).
- VARIANT and OPAQUE are refused as Group keys (`isSortableType`, `TypeCompatibility.ts:77`) and offered Count only.
- DistinctValue stays offered on Boolean (spec §10.1); its `max(bit)` on SQL Server, Sybase and Postgres (💭) goes to
  ISSUES.
- No keys emits `aggregate()` and reads `Aggregate all rows`; no aggregations is refused, never emitted (both NPEs ✅).
- 'Add aggregation' is never disabled (spec §17.6 disables it once every column is used; a column can be aggregated
  several ways). 'Group by "X"' splices after the selected node (spec §12.4).
- Concat matches columns by position; the spec's generic message comes first, then Cube's precise ones; the editor is
  a column-by-column comparison table; swapping inputs stays allowed, with no button.
- No `CubeDialects` change: the plan-only facts are pinned in `LegendCubeDialects.engine-roundtrip-test.ts`.
  `CubeSpecCorpus` types every node of every sample (still one-way). One patch changeset for both packages.
- Corrections to the readers, kept as build rules: `CUBETEST.ALLTYPES` has three rows, ID 3 empty but for its key, and
  no `I` or `VCNN` column (`CubeNorthwindModel.ts:43-46`), so expected values are worked out on it, not taken from
  `test::TypesDb` (only BI's Sum, 9007199254740997, carries over). `ORDERS.FREIGHT` is `Double` in the Cube fixture
  (`CubeNorthwindRelationTypes.json:289-291`; REAL in the DDL, `CubeNorthwindModel.ts:156`). Count rows has Q1's saved
  shape, never `{aggregation: 'CountRows'}`. `findColumnOrigins` (`CubeJoinDraft.ts:156`) maps DistinctValue, Min and
  Max outputs to their column, so the Join's "type unknown" warning still sees them. Keys keep the stored order, which
  the engine follows ✅. The Concat setting's key ships with the kind, written with its default.

**Aggregations** (`src/nodes/transforms/Aggregation.ts`, reused by M5's Partition). `ColumnAggregation` is
`{column, function, name}`; `getAvailableAggregations(type)` serves validation, the editor and the quick action.

| Function (saved) | Shown as       | Offered on                                      | Result type                                          | Nullable | Reduce                |
| ---------------- | -------------- | ----------------------------------------------- | ---------------------------------------------------- | -------- | --------------------- |
| `Count`          | Count          | every type                                      | Integer                                              | no       | `count()`             |
| `DistinctCount`  | Distinct Count | every type but enumerations, VARIANT and OPAQUE | Integer                                              | no       | `distinct()->count()` |
| `DistinctValue`  | Distinct Value | as Distinct Count                               | the input's precise type                             | yes      | `uniqueValueOnly()`   |
| `Sum`            | Sum            | INTEGER, FLOAT, DECIMAL, NUMBER                 | Integer, Float, else Number                          | yes      | `sum()`               |
| `Average`        | Average        | INTEGER, FLOAT, DECIMAL, NUMBER                 | Float                                                | yes      | `average()`           |
| `Min`, `Max`     | Min, Max       | those, and DATE, STRICT_DATE, DATETIME          | as Sum; StrictDate; DateTime for Timestamp, DateTime | yes      | `min()`, `max()`      |
| `CountRows`      | Count Rows     | no column                                       | Integer                                              | no       | `count()` on `x\|1`   |

DECIMAL counts as numeric (spec §10.1 doesn't name it); `1.0 *` is never emitted. The auto-name is
`<column> <Shown as>` (`ORDER_ID Count`), or `Count Rows`; one over 128 code points (from a column of 114 for Distinct
Count and Distinct Value, 121 for Average, 123 for Count, 125 for Sum, Min and Max) is shown invalid, never cut, the
editor's note naming the limit (settled in M4.5). Nullability decides rows: `FilterEmitter` guards a negation
with `isEmpty` only on a nullable column (`FilterEmitter.ts:211`), and the engine types Sum and Average `[1]` ✅.

**Group** (`group`, label `Group by Column`), a `UnaryNode`:

- Holds `columns` (the keys, in stored order) and `aggregations`; the constructor refuses only wrong shapes. Schema:
  `undefined` unless valid, else the keys as the input has them, in stored order, then one column per aggregation.
- Validation, in order: `Group columns cannot have duplicates.`, `Group column does not have a name.`,
  `Group column "X" is not present in the input schema.`, Cube's `Group column "X" of type <T> cannot be grouped.`;
  then `Aggregations cannot be empty.`; then every row (`validateColumnAggregation`, exported): function empty or
  unknown, a column on Count rows (`… does not allow column.`), the column present (label `Aggregation column`),
  `… is incompatible with column "<c>".`, name empty, Cube's `Aggregation output name is not valid column name.`,
  `… cannot be the same as input column name.` (folded), and two names equal when folded
  (`… is already present in the output schema.`). The engine fails on duplicates with a 500 and no location (two
  outputs ✅, a key twice 💭), so Cube refuses them first.
- Saved: `{columns, aggregations: [{column, function, name}]}`, both lists always written; Count rows has no `column`;
  a non-string field is a decode error; an unknown key on an entry makes an Unknown node (it could change the rows);
  functions per Q4, names per Q3.
- Emitted: `->groupBy(~[k…], ~[n: x|$x.c : y|$y-><reduce>])`, or `->aggregate(~[…])` with no keys, through a new
  aggregation colSpec constructor (`colSpec(name, fn1)` can't set `fn2`, `CubeIR.ts:202-203`; the serializer already
  writes `function2`, `V1_CubeLambdaSerializer.ts:158`), with new roles `group` and `aggregation`.
- Row order: none, so no sort is written before it. A Sort before it gets M2's full-loss warning naming the Group by
  its id ("This sort has no effect: group101 does not keep the row order. …", `MESSAGE_SORT_ORDER_LOST`,
  `CubeMessages.ts:220`); after Sort → Restrict → Group the full loss replaces the partial one.
  `describe()`: `Group by "a", "b"`.

**The grid's 'Group by "X"'**, between Sort by and Filter by: keys `[X]` and Count rows (its name suffixed if it folds
to an input column's), added after the node that ran as one undo step that selects it, never run; disabled for M2's
shared reasons and on a type that can't be grouped (a new `LegendCubeLabels` reason). It changes the schema, so later
nodes may turn invalid (visible, undoable).

**Concat** (`concat`, label `Concatenate Another Input`), a plain `BinaryNode` on the default ports
(`QueryNode.ts:156-172`), with `portLabels` First and Second:

- Validation, in order: a missing input (ERR_INCOMPLETE); the same column count (the engine doesn't check it ✅); the
  same name at each position, case-sensitive; equal types at each position, or with Convert types a least common
  ancestor (`getLeastCommonAncestor`, `TypeCompatibility.ts:128`; the registry's roots Number, String, Date and
  Boolean have no parent, so there is none across them). Nullability is never compared.
- Messages: `Both input schemas must be identical.` (`CubeMessages.ts:123`), then Cube's, for every differing position
  (settled in M4.9): `The first input has <n1> columns and the second <n2>.` (`1 column` when n1 is 1),
  `Column <i> is "<a>" in the first input and "<b>" in the second: columns are matched by position.`,
  `The inputs have the same columns in a different order: columns are matched by position.`,
  `Column "<c>" is <T1> in the first input and <T2> in the second.` (short names, or paths when both share one, as
  two enumerations `a::Region` and `b::Region` can); with Convert types, for types it can't convert (settled in M4.13):
  `Column "<c>" is <T1> in the first input and <T2> in the second, which can't be converted to one type.`
- Schema: the first input's names and types (the ancestor where widened), `nullable1 || nullable2` ✅.
- Convert types (built in M4.13, `getConcatConvertedType`): Varchar lengths give String, SmallInt and Int Integer, Int
  and Float4 Number, two Numeric precisions Decimal, StrictDate and Timestamp Date; never across numbers, strings and
  dates, nor VARIANT, OPAQUE or two enumerations. Emitted on each input that needs it as
  `->extend(~[cube_cast: x|$x.<c>->cast(@<T>), cube_cast2: …])->select(~[…])->rename(~cube_cast, ~<c>)…`, the
  temporaries avoiding the input's names in any case, with no SQL cast ✅ (`@String`, `@Integer`, `@Number`,
  `@Float`, `@Decimal`, `@Date` and `@DateTime` type and run on H2 ✅); never a relation-level cast, which the engine
  doesn't check 💭. H2 shows a StrictDate unioned with a Timestamp as midnight timestamps ✅ (Join refuses that pair
  as keys), and the converted Date then compares with a StrictDate or a Timestamp downstream (the older rule for an
  abstract Date), so a Join or Filter on it matches only midnight ✅: the Join and Filter editors warn (user,
  2026-10-09; `isDateOrTimestampType`, `DATE_OR_TIMESTAMP_WARNING`). The
  editor never offers Convert types for a column whose real type Cube doesn't know (the database may fail to
  convert it ✅).
- Autofixes in a core `ConcatAutofix.ts` (as `JoinAutofix.ts`): one query change and one undo step each, the selection
  kept, the panel's edits applied first; the Rename is refused when a new name folds to an untouched column.
- Saved: `{kind: 'concat', id, inputs, widenTypes}` (settled in M4.9), always written, `false` included; a missing key
  is a decode error, and a value that isn't true or false makes an Unknown node.
- Emitted: `<first>->concatenate(<second>)`, role `concat`, asserting both inputs' column count and names. Row order:
  none (a Sort on either input gets the full-loss warning). `describe()`: `Concatenate additional input`, plus
  `, converting types` with the setting on.

**Conformance suite** (`CubeInferenceConformance.engine-roundtrip-test.ts`): every node of every case that
`QueryEmitter.canEmit` accepts, Cube's schema against the engine's type of `emitTypingLambda(nodeId)`, in one
`typeLambdas` batch: names in position, `type.fullName`, nullability exact but for each case's `widerNullable` columns
(Q7). A guard fails when a type `createNodeRegistry()` registers has no case, but a data product's access point, which
the open-source engine doesn't read (§6.8; its stand-in test checks its types).
`TEST__expectEngineTyping` stays one-way for M2's tests; both use `TEST__typingDifferences` (`CubeOperationsTestUtils.ts`). The engine is created
inside the test, never in `beforeAll`; the suite runs against the moving CI engine image, so its failure message says
the engine's typing may have changed. Cases: the ALLTYPES families and FREIGHT, Filter, the four Joins, the Join
autofix, every M2 operation, every aggregation × family (ALLTYPES' families, and the ones Convert types gives: Number,
Date and the abstract Integer, Float, Decimal and String, added in M4.15), keys listed in a non-input order, a global
aggregate, a Group of a Group, a Group after a LEFT join, Concats of equal, nullable-mixed and widened schemas, the
Concat autofixes, never a count mismatch (typed as the shorter relation ✅).

**Databases.** Every Group and Concat shape plans on 11 database types 💭, so no `CUBE_DIALECT_WORKAROUNDS` entry and
`WORKAROUND_TYPES` unchanged (`CubeDialects.ts:110-139`); `needsDatabaseType` already walks every input. The plan-only
test pins `count(distinct …)`, `avg(1.0 * …)`, `count(1)`, HAVING after a Group, Cube's row numbers for Sybase IQ's
Limit after a Group, the GROUP BY target after two Renames, no ORDER BY in a derived table under a GROUP BY on SQL
Server and Sybase, a Distinct before a Group kept as a `select distinct` subquery, one UNION ALL per Concat with each
input's ORDER BY in its own derived table with its TOP, LIMIT or FETCH, and a Limit after a Concat wrapping the whole
union. ISSUES drafts: that alias shadow, `max(bit)` for a Boolean DistinctValue, SQL Server's `SUM(int)` overflow.

**Builder.** Menu order Sort, Group, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Join (spec §7.0);
a type is registered, sampled in `operations.cube.json` and given conformance cases in the step that adds its editor,
help text and icon. Both editors work in either host (§12.2 item 1).

- Group: "Group columns" (Q2; VARIANT and OPAQUE disabled), then rows "Aggregation column <n>", "Aggregation function
  <n>" (a native select) and "Aggregation output name <n>", each with its messages; one blank row to start, a row
  with no column left out unless it is Count rows, Count set when a column is picked first. Notes: Count counts
  non-empty values; Distinct Value is the one distinct non-empty value, else empty; no keys gives one row, even over
  no rows. Help text spec §17.9's; icon `DataCubeIcon.TableGroupBy` (`DataCubeIcon.tsx:152`).
- Concat: the requirement in words, a comparison table (each position's names, types and nullable markers, differences
  marked), the "type unknown" warning, the autofix buttons when they apply, and from M4.13 a `CubeConcatDraft` with
  the Convert types checkbox and the target types (until then in `CUBE_NODE_TYPES_WITHOUT_SETTINGS`,
  `CubeNodeDraftRegistry.ts:73`). Help text per Q8; icon `LayerGroupIcon` (`Icon.ts:579`).

**Engine facts** (probes under `m4-requirements/`, on the shared Northwind model that the evidence folder's `nw.mjs`
loads (`nw_pmcd_resp.json`: FREIGHT is OTHER and there is no CUBETEST schema), unless `test::TypesDb` is named; none ran
on the Cube fixture, which copies that model with corrections that don't touch these columns):

| Fact                                                                                                                                                                                                                                                               |     | Probe                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ----------------------------------------------------------------- |
| Count, DistinctCount, Sum, Average and Count rows are typed `[1]`; Min, Max and DistinctValue `[0..1]`; SmallInt's Sum is Integer, Average Float, Varchar(15)'s Max stays Varchar(15); keys come out in the order listed; a key filter after a Group is HAVING     | ✅  | `synth/r1-group-types.out`, `r2.out`                              |
| The null SHIP_REGION group: Count 0, Count rows 507; an aggregate over no rows gives one row (0, 0, null, 0)                                                                                                                                                       | ✅  | `synth/r5.out`, `r3.out`                                          |
| No keys: an NPE (500, no location). On `test::TypesDb`: no aggregations is an NPE too; two outputs with one name give a 500 "at ??"; an all-null group's Sum is null though typed `[1]`, and a negated filter on it drops the group without Cube's `isEmpty` guard | ✅  | `synth/r4.out`, `s1-types.out`                                    |
| A Concat count mismatch compiles, typed as the shorter relation, and fails at execution                                                                                                                                                                            | ✅  | `synth/c1.out`                                                    |
| Concat ORs nullability, accepts a type next to its ancestor (SmallInt with Integer gives Integer), refuses siblings and another order (a located 400)                                                                                                              | ✅  | `synth/c2.out`, `c3.out`, `c5.out`, `c6.out`                      |
| A type-only `cast(@String)` lets two Varchar lengths concatenate, with no SQL cast, on H2                                                                                                                                                                          | ✅  | `synth/w1.out`                                                    |
| Result types for every family and a Group of a Group; Sum and Average refused on dates, strings, Booleans and enums                                                                                                                                                | 💭  | `group/t1-types.out`, `t4-second-level.out`                       |
| Every shape plans on H2, Postgres, SqlServer, Sybase, SybaseIQ, DB2, MemSQL, Snowflake, Databricks, ClickHouse and Oracle                                                                                                                                          | 💭  | `group/p1`–`p5`, `cross-cutting/s1`–`s8`, `concat/d1`–`d9`        |
| After two Renames, MemSQL, SybaseIQ and ClickHouse group by the real column the alias shadows; a Boolean DistinctValue is `max(B)`                                                                                                                                 | 💭  | `group/n1-alias.out`, `p3-boolean.out`                            |
| `cast(@String)` on a number fails on H2; a relation-level cast is unchecked; a LEFT-join padded key is typed `[1]`, through a Group too                                                                                                                            | 💭  | `concat/widen1.out`, `relcast2.out`, `cross-cutting/nw_types.out` |

**Steps:**

| Step  | Deliverable                                                                                                                                                                                                            | Done when                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| M4.1  | This subsection and PROGRESS-M4.md (docs only)                                                                                                                                                                         | Committed                                                                       |
| M4.2  | The conformance suite on M2's node types; `CubeSpecCorpus` types every node                                                                                                                                            | Passes with only the declared exceptions; a removed case fails the guard        |
| M4.3  | The aggregation model (core) and Cube's messages                                                                                                                                                                       | Every family × function cell and message tested                                 |
| M4.4  | Group in the core: node, emitter, codec (Q3, Q4), row order; not registered                                                                                                                                            | `printIR` shows `groupBy`, `aggregate` and Count rows                           |
| M4.5  | Group in the builder, registered after Sort; `findColumnOrigins`; a sample; Group conformance cases                                                                                                                    | Builder, registry and conformance tests pass                                    |
| M4.6  | Group on the engine (the first Cube-emitted `function2`, ALLTYPES, 21 countries, 830 rows, the 507, BI's Sum, a zero-row aggregate giving one row, a negated filter on a Sum keeping ALLTYPES ID 3) and in the browser | Engine tests pass; a Group built, run and saved in the browser                  |
| M4.7  | The grid's 'Group by "X"'                                                                                                                                                                                              | Enabled, disabled and splice cases tested                                       |
| M4.8  | Group around the databases: plan-only facts, ISSUES drafts                                                                                                                                                             | The plan-only test passes on every database type                                |
| M4.9  | Concat in the core: validation, messages, emitter, codec with the setting's key, row order; not registered                                                                                                             | Every message checked exactly                                                   |
| M4.10 | Concat in the builder, registered between Slice and Join; a sample; Concat conformance cases                                                                                                                           | Builder, registry and conformance tests pass                                    |
| M4.11 | Concat on the engine (CUSTOMERS and SUPPLIERS give 120 rows; a Distinct after; a Limit inside) and plan-only UNION ALL facts                                                                                           | Engine and plan-only tests pass                                                 |
| M4.12 | The Rename and Restrict autofixes and their buttons                                                                                                                                                                    | Each fix turns a Concat valid, or isn't offered                                 |
| M4.13 | Convert types: target types, schema, casts, the draft's checkbox; engine tests on ALLTYPES and Varchar lengths                                                                                                         | Widened Concats type as Cube infers, run on H2 and plan everywhere              |
| M4.14 | Both adding-an-operation guides, testing.md's conformance section, README lists, ISSUES drafts, one patch changeset                                                                                                    | `yarn check:ci` passes                                                          |
| M4.15 | Verification (reviewers and a skeptic per finding) and an evidence-folder browser rehearsal                                                                                                                            | Every finding fixed or recorded; the rehearsal passes                           |
| M4.16 | A demo video of M4's features (§11.3): Group and its editor, the grid's Group by, Concat, its autofixes and Convert types, with captions; key frames checked against their captions                                    | The video plays every M4 feature, each caption true on screen; sent to the user |
| M4.17 | Rebase after agreeing the landing order with cube-direct; fold the supersessions below; PR when the user asks                                                                                                          | The plan consistent; the PR open on the user's word                             |

**Landing order (user, 2026-10-09).** The PR is marked ready for review after M4.13, with the changeset (M4.14's) and
its description updated and every gate green; M4.14's guides, M4.15, M4.16 and M4.17's folding follow as fixes on the
open PR. cube-direct landed first (#5641), and M4 was rebased on it after M4.10. M4 merged on 2026-10-09 as #5649
(`d847e6721`), with M4.16's video; M4.14's guides, M4.15 and M4.17 follow in their own PR.

**Risks and open gaps:**

- Every non-H2 database fact is a plan 💭, and DuckDB not even that (its plans fail with a static connection; cube-direct
  makes it reachable). Widening relies on each database's UNION coercing within a family: only two Varchar lengths ran,
  on H2 ✅; numbers and dates are untested (StrictDate with Timestamp on H2 is reader-reported 💭).
- Cube's validation and the emitter's assertion are the only guards against a Concat count mismatch ✅. Untyped OTHER
  columns pass the type check: a warning only, as for Join. Exact nullability may expose M2 mismatches (hence M4.2
  first).
- Open: ALLTYPES' expected values (M4.6); where engine errors land (the `aggregation` role, the Concat); how §7.4's
  editor without settings carries Concat's autofix buttons (M4.12) before M4.13 gives it a draft; whether
  `CubeColumnPicker` keeps a stored order; a nameless saved aggregation with no auto-name (an unknown or empty function, or a column function without a column) is read as an empty name, written back as `name: ""` and invalid, its empty name reported once its function and column are valid (settled in M4.4); VARIANT, OPAQUE and enum rows (none in the fixture); the PCT manifests; Rank and DenseRank against Q4 (M5: `validateColumnAggregation` then takes the functions each use allows, so Rank stays unknown in a Group); copying Q2 and Q3 to QUESTIONS.md U12, which exists only on `cubeV1` and `cube-direct`.

**Supersessions** (applied in M4.17 to the sections they change; kept here as the record of what M4 changed):

- D5: clarified by Q5. §4: Group and Concat entries; §4.2: a widened Concat column takes the ancestor type. §7.2:
  Concat's ports read First and Second; §7.4: the Group and Concat editors.
- §5.7: Count rows; Count, DistinctCount and Count rows are not nullable, the rest are, and Sum and Average are the
  suite's declared exceptions (Q7); DECIMAL is numeric; VARIANT and OPAQUE offer Count only.
- §5.8 "Lambda (later)" and §8.8's Concat row: widening is a type-only `cast` within a family (`toString()` across
  families, later); the engine accepts a type next to its ancestor ✅, so strictness is D5's choice; a count mismatch
  is typed as the shorter relation ✅. §8.8's Group row and aggregations table gain Count rows.
- §8.9 and Appendix B: only Count, DistinctCount, Sum, Average and Count rows are typed `[1]` ✅; `concatenate`'s
  shorter typing; M4's ISSUES drafts once filed.
- §9 and Appendix A §12.4: Group by comes in M4 and adds Count rows (spec §7.2: Count of X).
- §10.3: the Group and Concat shapes, Q3's name on read, Q4's kept functions, Concat's key shipped with the kind.
- §11.3's M4 row: Convert types instead of a widen autofix, the Rename and Restrict autofixes, Count rows, Group by,
  and a suite exact on nullability with declared exceptions. §12.1: "conformance allows Cube ⊇ engine only" gives
  way to Q7. §12.2 item 3: answered (Q1).
- Appendix A: §7.2 (Count rows by default, `Aggregate all rows`, VARIANT and OPAQUE keys, key order); §7.10 (Convert
  types by a type-only cast, not "real conversions"; First and Second; Cube's messages; the autofixes; a setting where
  the spec says "no state"); §10 (Count rows, DECIMAL, VARIANT and OPAQUE, unknown functions kept); §10.2 (DistinctCount
  and Count rows not nullable either); §10.3 (names always stored); §17 (Concat's ports read First and Second, beside
  Join's Left and Right); §17.6 (keys in input order, 'Add aggregation' never disabled, a Concat editor where the spec
  says "Nothing"); §17.9 (Concat's help text).

---

## 12. G. Risks and open questions

### 12.1 Risks

| Risk                                                                                                                              | Impact                                           | Mitigation                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine semantics drift: 55 relational, compiler or relation commits in 30 days; CI uses the moving `:snapshot` image ✅           | Golden tests break, or semantics change silently | Assert semantics (rows, types), not SQL text; log the engine commit per run; keep the window-regression and dialect harnesses as tests; pin the image digest if churn hurts |
| The engine does not type-check `==`, `in` or join keys ✅                                                                         | Runtime database errors or silent coercion       | Mandatory Cube validation (§5.4, §5.6) with negative acceptance cases                                                                                                       |
| Window extend + filter gives wrong rows; QUALIFY silently dropped on 5 dialects ✅                                                | Wrong numbers in production                      | `let` isolation from M5 onward; the dialect harness; file engine issues                                                                                                     |
| Engine multiplicities are wrong for outer joins, and for Sum and Average ✅                                                       | Wrong operator offers, wrong grid nulls          | Cube infers nullability; the conformance suite is exact on nullability but for each case's declared wider columns (§11.5 Q7)                                                |
| Engine typing bugs: `CHAR(n)`→`Varchar(1)`, `BINARY` 500, views `Varchar(0)`, `OTHER`→`String` with numbers, CLOB invalid JSON ✅ | Bad types, crashes                               | Picker flags; no length validation; the Cube fixture avoids them; a 200 with an unparseable body is treated as an error                                                     |
| Studio library defects (batch `result`/`results` until #5593, lossy relation-type metadata, transformer bugs) ✅📄                | Cube built on broken APIs                        | Cube's own `v1/` seam (D8); upstream PRs separately                                                                                                                         |
| The AGENTS.md V1 rule vs repo reality 📄                                                                                          | Review friction                                  | V1 symbols only under `legend-cube-builder/src/graph-manager/protocol/pure/v1/`, engine-backed tests excepted (§3.7); propose an AGENTS.md clarification                    |
| Local inference (§5) must equal engine typing as transforms grow                                                                  | Divergence and confusing errors                  | Conformance suite per node type (from M4); engine typing for Extend with caching                                                                                            |
| Saved format changes before the store exists                                                                                      | Stranded exports                                 | Format marked draft until M8; migrations are still written                                                                                                                  |
| Northwind reloads on every connection (≈0.6 s per execute) ✅                                                                     | Slow tests                                       | Compile-only (`lambdaRelationType`, ~20–70 ms) for schema assertions; few executions                                                                                        |
| Data products and ingest are absent from the open-source engine ✅                                                                | M9 slips                                         | Mocks (D6); mapping-based data product modes first                                                                                                                          |
| An ingest definition is read through its grammar and the engine's parse, with no project version (§6.7)                           | A definition the parse rejects can't be added    | The error shows on the tab with Retry; reading it from Depot at its deployed version is the TODO; Part B2 checks real definitions                                           |
| Single runtime and single database per query (v1, and in the `let` form)                                                          | Some joins not expressible                       | Explicit validation messages; revisit with the depot catalog and services                                                                                                   |
| Grid license assumed (D3)                                                                                                         | Watermark on unlicensed builds                   | The local dev host is `localhost` (no watermark) ✅; the community-only path is documented if ever needed                                                                   |

### 12.2 Open questions (none block M1)

1. **Entry points, sources modal and final look** (D7 follow-up, M3): which Legend Query surfaces link to `/cube`;
   source-modal UX (tabs per kind vs search-first catalog); whether to adopt Data Cube's floating-window style.
   **Where the node editor opens** (user, 2026-10-08, to decide in M3): the original app opens a small floating
   editor anchored just below the node (spec §17.5's popover), where Cube has a side panel (§7.1). Going back means a
   floating host for the same editors (§7.4 keeps them independent of where they are shown), with the spec's rule
   that clicking outside never closes the editor while a dropdown, picker or dialog opened from it is open, staying on
   screen near the canvas edges, and scrolling a tall editor. Meanwhile, new editors must work in either host: they
   don't rely on the side panel's full height.
2. **Sort not at the sink:** answered in M2 (§11.4). Cube writes the order where it is used: just before a Limit, Drop
   or Slice that takes rows by it, and before the capture's limit. It warns only when the order is lost (a Join, a
   Restrict that drops sort keys, a later Sort on all the same columns); the warning is derived, never a validation
   error, so Execute stays enabled.
3. **Count rows:** answered in M4 (§11.5 Q1). Cube adds a Count rows aggregation with no column alongside the
   non-null Count: `x|1 : y|$y->count()`, saved as `{function: 'CountRows', name}`. The grid's Group by adds it.
4. **Views and tables with `BINARY` columns** in the picker. v1 default (§6.2.6): views hidden; `BINARY` tables shown as "unavailable" and not selectable. Revisit with the M3 sources modal.
5. **SNAPSHOT versions** in the depot picker: allow, at a recompile on every call, or resolve to a concrete version?
6. **Multiple databases or runtimes per query:** when, and with what engine support? Today it is a two-step plan with
   no pushdown, or a plan error.
7. **Engine image pinning for CI:** keep `:snapshot` (the repo norm) or pin a digest?
8. **Window frames:** keep the running default (D5) or add explicit frame controls in M5?
9. **Running queries in the browser with DuckDB WASM** (user, 2026-10-08, low priority, no milestone yet): Cube emits a
   Pure lambda and the engine runs it (D9). Running in the browser needs either a second emitter, from the Cube IR
   (§8.3) to DuckDB SQL, or the engine's SQL plan run locally. Either way, precise types, NULL rules and join semantics
   must match what this plan verified on the engine, and the data must reach the browser somehow. Data Cube already
   uses `@duckdb/duckdb-wasm` (1.31.0), which is the precedent to study. First step: a research note with the options
   and a recommendation, no code.
10. **The next sources, still open** (2026-10-08; settled parts in §6.8): versions (recommended: `latest` resolved to a
    concrete version at pick time, since the engine caches `latest`; SNAPSHOT opt-in, item 5). Access badges for data
    products are settled in §6.8 (#5652).

Questions about the original app's UI that the spec leaves open are in [QUESTIONS.md](QUESTIONS.md).

---

## Appendix A: Spec deltas, section by section

The user accepted the departures from the spec's guidance sections (§14.4, §17.7, §17.11) on 2026-10-05.

| Spec §               | Status           | Change                                                                                                                                                                                                                                                                                                      |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preamble (22–30), §0 | Superseded       | Non-negotiable = §3 (extended), §4–5, §7–10, §16 semantics. Wire = relation lambda (protocol JSON). Storage = CubeSpec v1. Sources = relational tables, then services, functions, data products, ingest                                                                                                     |
| §1                   | Kept, nuanced    | "No server round trip for editing" holds for the slice's nodes; Extend typing uses an engine call, cached (§5.7)                                                                                                                                                                                            |
| §2.1, §18            | Superseded       | Host auth, config, telemetry                                                                                                                                                                                                                                                                                |
| §2.2                 | Kept + narrowed  | The core has no host imports through the slice (§3.3). From M2.0 it may use legend-graph's metamodel types, but still no `V1_*` and no UI or app packages (D12)                                                                                                                                             |
| §3.1                 | **Extended**     | Precise primitive registry, families, comparison classes (§5.4); interning per `(path, params)`; unknown → Opaque instead of throwing; `Decimal`, `StrictTime`, `Variant` added                                                                                                                             |
| §3.2                 | **Extended**     | `nullable` on columns; unique names asserted; `equals` ignores nullability                                                                                                                                                                                                                                  |
| §4                   | Kept + fixes     | Acyclicity invariant; `connect(…, port)`; per-type ids; port labels                                                                                                                                                                                                                                         |
| §5                   | Kept + extended  | Query-level rule pass; host issues map (display only)                                                                                                                                                                                                                                                       |
| §6.1                 | Idea kept        | Source and transform registries + builder adapters; batch resolution                                                                                                                                                                                                                                        |
| §6.2–6.7             | Superseded       | §6 of this plan                                                                                                                                                                                                                                                                                             |
| §7.0, `V1:` lines    | Replaced         | Saved shapes (§10.3) + emission table (§8.8)                                                                                                                                                                                                                                                                |
| §7.1 (M2)            | Extended         | Cube adds `Sort column "<c>" of type <type> cannot be sorted.` (VARIANT, OPAQUE), then `Sort columns cannot have duplicates.` One `isSortableType` also serves the editor's picker, the grid's Sort by and the row-number fallback's default key. The direction messages are unreachable                    |
| §7.2 (M4)            | Extended         | The grid's Group by adds Count rows, not Count of X; no keys reads `Aggregate all rows`; VARIANT and OPAQUE keys are refused (`… cannot be grouped.`); keys keep the stored order, which the engine follows ✅ (§11.5)                                                                                      |
| §7.4                 | Kept + labels    | Emit `select` in input order; the editor stores picks in input order too. The spec names no labels: Cube's messages use `Columns` (empty, duplicates) and `Column` (unnamed, not in the input) (M2)                                                                                                         |
| §7.5 (M2)            | Fixed            | `isValidColumnName` replaces the regex: non-empty, trimmed, no `"`, `\` or control characters, ≤ 128 code points 💭. Spaces, hyphens, `'` and unicode work; `"` breaks at execution, `\` later references ✅. New names may not equal untouched input columns or each other, in any case (`foldColumnName`) |
| §7.7–7.9 (M2)        | Changed          | No `arguments.length` trick: no JS defaults, so an explicit `undefined` stays cleared and invalid, saved and loaded too (§10.3); the defaults (10; 10 and 20) live only in the registry's `create(id)`. Size 0, Drop 0 and an empty Slice stay invalid, though the engine takes them (M2)                   |
| §7.9, §17.9          | Changed (D5)     | `[start, stop)`; help-text copy fixed (counting from 0). The canvas reads `Take rows 10 to 20 (20 excluded)`, or `Take rows 10 to (blank)` without a stop; the palette label stays `Take rows <x> to <y>` (M2, §11.4)                                                                                       |
| §7.10 (M4)           | Extended         | Precise-strict equality, a type next to its ancestor too; Cube's precise messages after the spec's; ports First and Second; a setting where the spec says "no state": Convert types, a type-only cast within numbers, strings or dates, not real conversions; Rename and Restrict autofixes (§11.5)         |
| §7.11                | Kept + extended  | FULL OUTER; nullability and merged-key rules (§4.7); step 4 per §5.4. Autofix (M2): `c_1`/`c_2`, then `c_<side>_2`… when taken in any case, ≤ 128 code points; the key lists rewritten through the renames; offered only when the duplicate rule is the join's only error                                   |
| §7.12 (M6)           | Kept, emulated   | Semantics as the spec; join and null rules written down                                                                                                                                                                                                                                                     |
| §7.13 (M5)           | Extended         | Rank/DenseRank need ≥ 1 sort; Count emitted as `size()`; running default frame (D5)                                                                                                                                                                                                                         |
| §7.14 (M6)           | Extended         | Validate empty names and duplicates among new columns                                                                                                                                                                                                                                                       |
| §7.16                | Fixed            | Unknown gets synthetic per-instance ports (keeps its edges and raw JSON); not rewireable; re-saved with regenerated `inputs`                                                                                                                                                                                |
| §8.2                 | **Extended**     | Matrix keyed by family (§5.5); VARIANT/OPAQUE row                                                                                                                                                                                                                                                           |
| §8.3, §21            | **Fixed**        | Operator availability and value-type validation (§5.6) with new messages                                                                                                                                                                                                                                    |
| §8.2, §8.3 (M1.5)    | **Restricted**   | A StartsWith/EndsWith/Contains value (or a negation's) may not contain `\`: the engine does not escape it in LIKE patterns, so the rows would be wrong (§8.4, Appendix B). Temporary; lifted when the engine is fixed. User OK 2026-10-06 (option a: refuse, not pre-escape)                                |
| §8.4                 | Replaced         | Emission (§8.4 of this plan) + saved filter shape (§10.3). NULL behaviour documented (D4)                                                                                                                                                                                                                   |
| §9 (M6)              | Replaced         | Pure expressions stored as JSON (+ display text); typed by the engine; §9.2 table becomes help only, with Pure names                                                                                                                                                                                        |
| §10 (M4)             | Extended         | Count rows, an aggregation with no column (§12.2 item 3); DECIMAL counts as numeric; VARIANT and OPAQUE offer Count only; an unknown, empty or window-only function is kept on the Group, invalid, and saved again unchanged (§11.5 Q4)                                                                     |
| §10.1                | Kept (for now)   | Per-family view; extend later (Min/Max on strings etc.)                                                                                                                                                                                                                                                     |
| §10.2                | **Replaced**     | §5.7 measured table; Count, DistinctCount and Count rows are not nullable, every other aggregate is (M4)                                                                                                                                                                                                    |
| §10.3 (M4)           | Changed          | Output names are always stored: the editor fills in the auto-name and follows column and function changes until the user edits it; a saved aggregation with no name gets it on read. Count rows' auto-name is `Count Rows` (§11.5 Q3)                                                                       |
| §11.1                | Idea kept        | `CubeEngine` port (§8.7)                                                                                                                                                                                                                                                                                    |
| §11.2–11.3           | Superseded       | –                                                                                                                                                                                                                                                                                                           |
| §11.4                | Superseded       | Host HTTP client; keep "truncate and show trace link" behaviour via host                                                                                                                                                                                                                                    |
| §12–13               | Idea kept        | §9 of this plan; lambda-derived drill-down; `limit + 1`; typed group keys; §21 fixes                                                                                                                                                                                                                        |
| §12.4 (M2, M4)       | Changed          | Client-side grid (spec: server-side mode only): Sort by, Group by (M4, §9) and Filter by, then ag-grid's items until M7; no icons; Drilldown in M7. They add a node after the selected one, never run, and are disabled on stale rows, during a run, read-only, or on a type or value they can't use        |
| §14, §15             | Superseded / out | §10; publishing out of scope. §14.4 "Save disabled while invalid": Export spec is allowed for invalid queries; server Save gating decided in M8 (§10.3)                                                                                                                                                     |
| §16                  | Kept + additions | §4.11                                                                                                                                                                                                                                                                                                       |
| §17                  | Guidance         | §7; panel instead of popover; visible Left/Right, First/Second; xyflow + dagre; deep links as path params (M3/M8). §17.11: Execute needs only the capture subtree to be valid (§10.3). §17.7: uncoercible text is kept as an invalid value with a type message (§4.9), and STRING values are not trimmed    |
| §17.6 (M4)           | Changed          | Group keys stored in input order, as Restrict's; 'Add aggregation' never disabled (a column can be aggregated several ways); Concat's editor, "Nothing" in the spec, has a comparison table, the autofix buttons and Convert types (§11.5)                                                                  |
| §17.9 (M4)           | Changed          | Concat's help text: "Combines the rows of the two previous data sets, keeping duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the same types." (§11.5 Q8)                                                                                      |
| §19.1–19.3           | Superseded       | §3 (two packages), §8 (relation functions, not `meta::pure::tds::*`)                                                                                                                                                                                                                                        |
| §20                  | Idea kept        | §11 (headless first; join and filter in M1; persistence last)                                                                                                                                                                                                                                               |
| Appendix C.4         | Replaced         | §8.5 lambda + relation type; §11.2 acceptance                                                                                                                                                                                                                                                               |

## Appendix B: Defects found (upstream, non-blocking, D8)

**legend-studio**

- **Fixed by #5593 (2026-10-06):** the batch relation-type call read `results` while the engine returns `result`,
  which also broke data-product code; legend-graph now reads `result`.
- `V1_RemoteEngine.ts:190-205` (`buildRelationTypeMetadata`), `RelationTypeMetadata.ts`: precise type parameters are
  dropped.
- `MetaModelConst.ts:64-82`: `PRECISE_PRIMITIVE_TYPE` has nonexistent `Date`/`Time`/`Decimal` paths and a wrong
  `Timestamp`. `PrecisePrimitiveType` has no package, so round trips shorten paths.
- `V1_ValueSpecificationTransformer.ts:517`: ColSpec `function2` is built from `function1`. `:460`/`:496` drop the
  ColSpec type; `:397` throws on precise literals.
- `V1_AccessorHelper.ts:358-367`: the schema-qualified table lookup is overwritten at `:367` (wrong table on name clash).
  `STO_Relational_Helper.ts:222-263` diverges from engine typing.
- Legend Query's version-revert modal crashes to a blank page when `lightQuery` is unset (a query without an
  execution context) 📄. Four `LegendQueryApplicationPlugin` types are declared but never used.
- `legend-lego` `DataGrid` always registers enterprise modules. The query e2e README claims a community grid by default.
  Outside production builds it also swaps `console.error` for `console.debug` on every render (`DataGrid.tsx:69-74`)
  and restores it only in `onGridReady`, so an error logged while a grid renders, or after a re-render that doesn't
  remount it, shows only as a debug message.
- `legend-art` pins `react-reflex` 4.2.7, whose `ReflexContainer.getSize` and `onStopResize` read `element.ref`. With
  React 19, opening a resizable panel or dragging a splitter logs "Accessing element.ref was removed in React 19"
  (seen on the Cube page when the editor panel opens, M1.9). The fix is a `react-reflex` upgrade in legend-art, its own
  PR.
- Repo: `.yarn/constraints.pro` is never read (`yarn constraints` is a no-op). AGENTS.md's V1 rule doesn't match Data
  Cube. Bootstrap and deployment changeset entries are auto-generated by the release script (AGENTS.md wording).

**legend-engine** (issue write-ups)

- Window `count()` / `distinct()->count()` lose OVER (`pureToSQLQuery.pure:6979-6982`).
- A single-AggColSpec window extend is not isolated (`:4231-4233`), so a following filter is pushed below the window.
  The SQL Server, Oracle, Trino, Sybase and DB2 renderers silently drop `qualifyOperation`.
- `CHAR(n)` → `Varchar(1)` (`RelationalCompilerExtension.java:1030`).
- `BINARY`/`VARBINARY` give a "Match failure" that kills the table accessor.
- View columns are typed `Varchar(0)`.
- Outer joins don't widen multiplicity; Sum and Average are reported `[1]` but can be null (an all-null group's Sum ✅;
  Count, DistinctCount and Count rows are rightly `[1]`, Min, Max and DistinctValue `[0..1]`, M4). A consequence:
  `not(…)` on a column NULL-padded by an outer join is rendered without its NULL branch and drops those rows, so Cube
  guards every negation of a nullable column with `isEmpty` (§8.4).
- NPEs: `groupBy(~[], …)`, `groupBy` with no aggregations, `concatenate` with a column-count mismatch, which compiles,
  typed as the shorter relation ✅, and fails only at execution (M4).
- `rank` without ORDER BY compiles. Mixing FuncColSpec and AggColSpec in one `extend` throws a ClassCastException.
  `if()` drops type parameters ("Wrong type variables count").
- A duplicate column from `rename` (to a name the relation has) or `select(~[A, A])` fails as an HTTP 500,
  `Compilation error at ??, "The relation contains duplicates: [X]"`, not a 400 with the call's source location, so
  the error can't be placed on a node ✅. Cube's validation refuses both first (Rename's collision check, Restrict's
  duplicates). Drafted in ISSUES.md for the user to file; not filed yet.
- Exact comparisons on H2 32-bit `REAL` columns silently match nothing (`cast(x as float)` against a REAL), whatever type the model declares.
- H2 CLOB values serialize as invalid JSON (`ValueTransformer`). DateTime literals below seconds precision are
  truncated to the day. `toDecimal` truncates the scale on H2.
- Slice fails PCT on SQL Server (`limit m,n`); drop fails PCT on SQL Server and DB2 (`limit m,-1`); Sybase emits the same SQL but has no PCT module. CTE names are not quoted for keywords on
  SQL Server, DB2 and Sybase.
- On SQL Server, the engine writes `distinct()` then `limit(n)` as `select top n distinct …`:
  `sqlServerExtension.pure:66` puts TOP before DISTINCT, and T-SQL needs `select distinct top n` (💭, plans only: no
  SQL Server in reach). Cube pads every Distinct on SQL Server (§11.4). Drafted in ISSUES.md for the user to file; not
  filed yet.
- `rewriteSliceAsWindowFunction` (`extensionDefaults.pure:39`), which Sybase IQ uses for a `limit`, `drop` or `slice`
  in a subquery (`sybaseIQExtension.pure:265`) and MemSQL for a `drop` (`memSQLExtension.pure:389`), numbers the rows
  by the first ORDER BY key only, so ties on that key take any rows. It also keeps the select's `distinct`
  (`extensionDefaults.pure:67`), so on Sybase IQ a limit after `distinct()` numbers every row and DISTINCT removes
  nothing. Plans on `93d92b4` ✅; their SQL took the wrong rows on H2 and SQLite. Cube numbers those rows itself (every
  Limit on Sybase IQ, since the engine also names its numbering column `row_number`, which clashes with an input column of
  that name) and pads Sybase IQ's Distinct (§11.4). ClickHouse writes a Drop's offset after a descending key as
  `nulls firstoffset m`, one word; Cube numbers that Drop's rows too. Drafted in ISSUES.md
  for the user to file; not filed yet.
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
the `legend-pure-m3-precisePrimitives` 5.105.0 jar (`platform_precise_primitives/precisePrimitives.pure`).

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
- ingest data sets (§6.7): [LakehouseProducerDataCubeSourceBuilderState.ts](../../../packages/legend-application-data-cube/src/stores/builder/source/LakehouseProducerDataCubeSourceBuilderState.ts),
  [LakehouseProducerDataCubeSource.ts](../../../packages/legend-application-data-cube/src/stores/model/LakehouseProducerDataCubeSource.ts),
  and legend-graph's `createAccessorFromPackageableElement` ([V1_PureGraphManager.ts](../../../packages/legend-graph/src/graph-manager/protocol/pure/v1/V1_PureGraphManager.ts))
- **Reuse:** the xyflow + dagre stack, engine-client calls, and the undo / commit-on-Apply patterns.
- **Keep separate:** snapshot model, filter and aggregate classes, type utilities, grid datasource, persistence.

**Scratch evidence** (important harnesses become repo tests in M1.7, M4 and M5): live-test lambdas, the window
regression matrix (`g1/`), dialect plan dumps (`g4/`) and the persistence harness (`persistence-verify/`) are kept
outside the repo, in the local planning evidence folder (PROGRESS.md › Open items).
