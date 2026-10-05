# Legend Cube — Implementation Plan

> **Status:** draft for review · 2026-10-05 · branch `cubeV1` (rebased on master `0665e6f4c`, where the spec landed as
> `docs/design/WIP-CUBE-SPEC.md` in #5589)
> **Inputs:** [docs/design/WIP-CUBE-SPEC.md](docs/design/WIP-CUBE-SPEC.md), the planning brief, and an investigation of
> `legend-studio` + `legend-engine` (HEAD `93d92b4`) with ~1,500 checks against a live engine on `localhost:6300`.
> **Evidence markers:** ✅ verified live against the engine · 📄 traced in code · 💭 inference, to be verified in the
> milestone that needs it.
> **No code has been written.** This document is the plan; nothing in it is implemented.

---

## 0. Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                               | Source                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| D1  | Saved cubes will live in a **new dedicated Cube store** in `legend-engine-application-query`. **Not in v1.** v1 defines and tests the saved spec format (codec + round trip) only; actual saving and the engine store come after the POC works end to end.                                                                             | user                  |
| D2  | The slice runs **locally** against a **Cube-owned Northwind fixture sent as an inline model** (no depot). Entry points and the sources modal get expanded later, once designed. v1 scope: one model, one Database element, one runtime per query.                                                                                      | user (default)        |
| D3  | **ag-grid Enterprise license is available** in every deployment. Use `@finos/legend-lego/data-grid` (enterprise modules).                                                                                                                                                                                                              | user                  |
| D4  | NULL semantics: **joins use SQL semantics** (NULL keys never match); **negated filters include NULL rows** (engine-native; documented in the UI); **Count = non-null count** of the column.                                                                                                                                            | user (default)        |
| D5  | Engine-driven changes to authoritative sections are accepted: Slice is `[start, stop)`; Join gains **FULL OUTER (in the slice)**; window aggregates with a sort use the SQL default (running) until frames exist; Difference keeps spec semantics (emulated); Concat across different precise types is rejected (widen autofix later). | user (default)        |
| D6  | Post-slice source order: services → Pure functions → data products → ingest. Data products and ingest are built against mocks until a lakehouse-enabled engine is available. Services snapshot their converted lambda and check for drift.                                                                                             | user (default)        |
| D7  | Route **`/cube`** inside Legend Query (URL `/query/cube`), hard-wired in the Query router. New module(s) `legend-cube` / `legend-cube-builder` (§3). Further entry points, the sources modal and the final look are revisited in M3.                                                                                                   | user + recommendation |
| D8  | Cube **works around** Studio and engine defects in its own code and depends on none of them being fixed. Upstream fixes are separate, non-blocking PRs and issues (Appendix B).                                                                                                                                                        | user (default)        |
| D9  | Execution is a **Pure relation-function chain** over store accessors (`#>{db.schema.table}#`), built as **protocol JSON** (never Pure text). Legend SQL is only a possible future "SQL source" node.                                                                                                                                   | recommendation (§8.1) |
| D10 | Precise primitives are modeled **inside the host-free domain**. The host adapts the engine's relation-type JSON at the boundary, in a package-local `v1/` folder.                                                                                                                                                                      | recommendation (§5)   |

---

## 1. Scope

### 1.1 Milestone 1: the slice

Thin vertical slice, working live on a developer machine:

- **Sources:** relational database tables from an inline model (Cube Northwind fixture, or a pasted Pure model).
- **Transforms:** **Join** (Inner, Left Outer, Right Outer, Full Outer; binary from day one) and **Filter**.
- **Types:** full precise-primitive support (`Varchar(n)`, `SmallInt`, `Numeric(p,s)`, `Timestamp`, …).
- **Path:** pick tables → canvas → live schema inference and validation → lambda → live execution → results grid →
  saved-spec codec (export/import JSON as a dev affordance; no store).
- **Hosting:** Legend Query route `/query/cube`, behind a config flag.

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
  index.ts
packages/legend-cube-builder/src/
  graph-manager/protocol/pure/v1/   V1_CubeLambdaSerializer (IR → protocol JSON + sourceInformation stamps),
                                    V1_CubeRelationTypeAdapter (relation-type JSON → CubeType),
                                    V1_CubeExecutionResultReader (lossless), V1_LegendCubeEngine
  stores/       CubeEditorState, CubeExecutionState, CubeEngine port, source catalogs (LocalModelCatalog),
                CubeHost interface, fixtures/ (Cube Northwind model as a TS string)
  components/   CubeEditor (layout), canvas/, palette/, editors/ (Join, Filter, Source), source-picker/, grid/
  __lib__/      icons, labels, help text (§17.9), test ids
  style/index.scss
```

### 3.3 Guarding the core's purity

The core gets three layers of protection, because `tsc` resolves _undeclared_ workspace packages through the root
`node_modules/@finos` symlinks 📄:

1. Declare nothing host-related in `packages/legend-cube/package.json`, not even as a devDependency.
2. A root `eslint.config.js` block scoped to `packages/legend-cube/src/**`:
   `no-restricted-imports: { patterns: ['@finos/*', 'react', 'react-*', 'mobx*', 'ag-grid-*', '@xyflow/*', 'serializr'] }`.
3. A unit test in `legend-cube` that scans `src/**/*.ts` for forbidden import specifiers. It runs in CI even when
   lint is skipped.

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
  - `fetch` is blocked in Jest, so engine tests use axios helpers against the hard-coded `http://localhost:6300/api`
    📄 ([EngineTestSupport.ts](packages/legend-graph/src/graph-manager/__test-utils__/EngineTestSupport.ts)).
- **CSS:**
  - The builder's `style/index.scss` starts with `@import url('@xyflow/react/dist/style.css');`.
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
  - Add `CUBE: '/cube'` to `LEGEND_QUERY_ROUTE_PATTERN`
    ([LegendQueryNavigation.ts:56](packages/legend-application-query/src/__lib__/LegendQueryNavigation.ts:56)).
  - Mount it in [LegendQueryWebApplication.tsx](packages/legend-application-query/src/components/LegendQueryWebApplication.tsx:59)
    next to `DEV_DATA_SPACE_INSPECTOR`.
  - Query's `baseUrl` is `/query/`, so the URL is **`/query/cube`** 📄.
  - Plugin page entries are not used: they force an `/extensions/` prefix 📄.
  - `/cube/:cubeId` is reserved for saved cubes (M8).
- **Flag:** a new `TEMPORARY__enableLegendCube` option in
  [LegendQueryApplicationConfig.ts](packages/legend-application-query/src/application/LegendQueryApplicationConfig.ts:76)
  (default `false`). The bootstrap `scripts/setup.js` writes `true` into the generated dev `config.json`.
- **Host code:** `legend-application-query/src/components/cube/` and `src/stores/cube/` hold a thin
  `LegendQueryCubeHost`. It implements `CubeHost` (defined in the builder) from Query's application store:

  - engine server client config (Query's `engineServerUrl`, as at
    [QueryEditorStore.ts:631](packages/legend-application-query/src/stores/QueryEditorStore.ts:631));
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

| Need          | Library (version)                                                      | Precedent                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas        | `@xyflow/react` 12.4.4 (MIT)                                           | Studio database diagram [DatabaseDiagramCanvas.tsx](packages/legend-application-studio/src/components/editor/editor-group/database-editor/DatabaseDiagramCanvas.tsx)                     |
| Layout        | `@dagrejs/dagre` 1.1.4 (MIT)                                           | [DatabaseDiagramHelper.ts](packages/legend-application-studio/src/components/editor/editor-group/database-editor/DatabaseDiagramHelper.ts) (left-to-right, centre → top-left conversion) |
| Drag and drop | `react-dnd` 16.0.1 (MIT); `DndProvider` already wraps every Legend app | query builder, legend-lego                                                                                                                                                               |
| Grid          | ag-grid 35.0.0 via `@finos/legend-lego/data-grid` (enterprise, D3)     | [DataGrid.tsx](packages/legend-lego/src/data-grid/DataGrid.tsx)                                                                                                                          |
| State         | `mobx` 6.13.6, `mobx-react-lite` 4.1.0                                 | repo-wide                                                                                                                                                                                |

Not used: `reactflow` 11 (legacy, lineage viewer only), elkjs (not installed; EPL), Data Cube's floating-window layout
manager.

### 3.7 Housekeeping found along the way (separate, optional)

- [AGENTS.md:120](AGENTS.md:120) says DataCube consumes metamodel only, but `legend-data-cube` uses `V1_*` throughout,
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

### 4.2 Schema

- `SchemaColumn { name: string (non-empty); type: CubeType; nullable: boolean }`. **`nullable` is new**: outer joins
  and later aggregations need it, and the engine reports it wrongly (§5.6).
- `Schema` keeps the §3.2 operations: `lookup`, `type`, `names`, `equals`.
  - `equals` is order-sensitive and compares names and types. Nullability is ignored, matching the engine's
    `concatenate` ✅.
  - **New:** a schema asserts unique column names, because the engine rejects duplicates everywhere ✅.

### 4.3 Query graph

Spec §4 is kept verbatim (`QueryNode {key, id, type, ports}`, `Connection`, `Query {nodes, connections, selected}`, the
five invariants, every operation and every `canX` predicate), plus the following fixes and extensions:

| Change                               | Why                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acyclicity invariant (6)**         | §5.1 says cycles are impossible. They aren't: `connect(F1,F2)` then `connect(F2,F1)` satisfies invariant 3 📄. `canConnect`/`canMove` reject a target that is upstream of the source; the constructor asserts the graph is acyclic; `visit()` keeps an in-progress set. |
| **`connect(source, target, port?)`** | The canvas lets users drop on a specific Left or Right handle. With no port, behaviour is spec's "first free port".                                                                                                                                                     |
| **Per-type `generateId`**            | §4.4's global max cannot produce Appendix C's ids (`join101` + `filter101`) 📄. Take `max(100, ids of nodes of that type) + 1`; the collision fallback is unchanged.                                                                                                    |
| **Port labels in metadata**          | §17.3 pitfall 4. `Join.PORT_LABELS = ['Left', 'Right']`.                                                                                                                                                                                                                |

- **Undo** creates a new object identity, as §17.4 requires.
- `CubeDocument` holds `{ context, query, meta }`, where `context = { model: ModelRef; runtime?: string }` is
  query-level (§6.2).

### 4.4 Inference and validation engine

- §5 is kept verbatim: `buildSchemasAndValidity`, port-ordered input schemas, the three sentinel messages,
  `isSchemasError`, and the `validate` / `validateAllItems` combinators.
- Two additions:
  - **Query-level rules pass** (new; runs before the per-node pass, and its errors are added to the offending
    nodes). v1 has one rule: all relational sources must address the same Database element as the first source.
    Message: `Sources from different databases are not supported yet; "<db>" differs from "<db0>".`
  - **Host-supplied issues** (engine errors mapped back by node id, §8.7) live in a separate map and do not take
    part in schema propagation. The UI merges them for display.

### 4.5 Node contracts and registry

This replaces the per-class statics of spec §4.1/§6.1 with registries that the palette, context menu and codec all
read from (§17.2's single source of truth).

```ts
interface NodeDefinition<N extends QueryNode> {
  type: string;
  label: string;
  icon: string;
  beta: boolean; // menu metadata (§4.1)
  ports: readonly string[];
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

### 4.6 Relational table source (`type: 'relational'`)

- **State:** `{ database: string /* element path */; schema: string; table: string; resolution }`.
  `resolution = unresolved | { schema: Schema } | { error: string }`.
- **Validation:** spec §6.2 validates only that the schema exists (`Required schema of this source could not be
resolved.`). A resolution error is reported verbatim from the engine (first line).
- **`describe()`:** `Table "<table>" from schema "<schema>"` (§6.2), or `(unknown)` when unresolved.
- **No parameters.** Coordinates are validated at construction (non-empty strings).

### 4.7 Join (`type: 'join'`, ports `['leftTds','rightTds']`)

- **State:** `{ leftColumns: string[]; rightColumns: string[]; joinType: 'INNER' | 'LEFT_OUTER' | 'RIGHT_OUTER' |
'FULL_OUTER' }`. The default is `LEFT_OUTER` (§7.11). `FULL_OUTER` is new (D5).
- **Validation order:** §7.11 steps 1–5, verbatim messages.
  - Step 4 uses the new comparison-class rule (§5.4) instead of §3.1's "numeric or identical".
  - Step 5 is the duplicate-column rule, verbatim (`getDuplicateJoinColumns`, positional matching).
- **Output schema:** `buildJoinSchemaColumns` verbatim (left keys, right keys, remaining left, remaining right,
  deduplicated by name). New nullability and merged-key rules:

| Join type   | Columns from the left input | Columns from the right input | Same-named key (deduplicated)                                                                                                                                                                                                                                                            |
| ----------- | --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INNER       | as input                    | as input                     | left column (value and type)                                                                                                                                                                                                                                                             |
| LEFT_OUTER  | as input                    | **nullable**                 | left column                                                                                                                                                                                                                                                                              |
| RIGHT_OUTER | **nullable**                | as input                     | **right** column (the left value is NULL for unmatched rows ✅; legacy TDS did the same ✅)                                                                                                                                                                                              |
| FULL_OUTER  | **nullable**                | **nullable**                 | `coalesce(left, right)`. Nullable only if both are. Type = equal type, else the least common ancestor in the registry: `Varchar(15)`+`Varchar(2)` → `String`, `Numeric(10,2)`+`Numeric(12,4)` → `Decimal`, `Int`+`SmallInt` → `Integer`, `SmallInt`+`Double` → `Number` ✅ (§8.4 step 5) |

- **`describe()`:** `Join additional input` (§7.11). **`swapInputs`:** §4.4.
- **Autofix** (`renameInputs`): deferred to M2, which brings the Rename node. The fix must generate collision-free
  names (§21).

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

`coerceValue(text, type)` follows §17.7: trim, empty becomes `undefined`, Boolean accepts only exact `true`/`false`.
The rest is extended per §5.6. Integer is **not** limited to JS safe integers, because BigInt columns exist.

### 4.10 Unknown node

Spec §7.16 is kept: no schema, invalid, and `describe()` → `Unknown Transform "<id>"`. Two fixes for §21's "Unknown
cannot be re-saved":

- the node keeps its raw JSON **and its `inputs`**, so connections survive;
- `encode` writes the raw JSON back verbatim.

So a query from a newer client can be opened, inspected and re-saved without losing anything. It still cannot
execute.

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
  - [MetaModelConst.ts:64-82](packages/legend-graph/src/graph/MetaModelConst.ts:64): `PRECISE_PRIMITIVE_TYPE` lists
    paths the engine does not have (`precisePrimitives::Date`, `::Time`, `::Decimal`) and a wrong `Timestamp`.
  - `PrecisePrimitiveType` extends `DataType` and is indexed by short name; there are three disagreeing
    precise→standard maps.
  - [V1_RemoteEngine.ts:779-801](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts:779):
    `getLambdaRelationType` drops `typeVariableValues`. Its batch variant reads `results`, but the engine returns
    `result`, so it throws ✅
    ([V1_LambdaReturnType.ts:87-90](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/compilation/V1_LambdaReturnType.ts:87)).
  - Client-side table typing
    ([STO_Relational_Helper.ts:222-263](packages/legend-graph/src/graph/helpers/STO_Relational_Helper.ts:222))
    disagrees with the engine.
  - The query builder normalizes precise types to standard ones for operators and editors.
  - Data Cube keeps only a path string and hard-codes `Varchar(16777216)`
    ([DataCubeQueryBuilderUtils.ts:284](packages/legend-data-cube/src/stores/core/DataCubeQueryBuilderUtils.ts:284)).
  - **What works:** `V1_relationTypeModelSchema`
    ([V1_TypeSerializationHelper.ts:128](packages/legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.ts:128))
    keeps the parameters ✅. `V1_buildRelationTypeFromV1RelationType` even works against an empty `PureModel` ✅.
  - **Literals:** JS `JSON.parse` corrupts large Integer and Decimal values. `parseLosslessJSON` /
    `stringifyLosslessJSON` exist in [FormatterUtils.ts:201](packages/legend-shared/src/format/FormatterUtils.ts:201).

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
  - VARIANT and OPAQUE are never compatible.
- The **StrictDate ↔ Timestamp** pair is rejected: it executes but silently matches only midnight ✅.
- The message stays verbatim.
- **This check is mandatory:** the engine compiles `==` between any two types. A `Varchar` = `SmallInt` join compiles
  and then fails in H2, or is silently coerced ✅.

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

### 5.6 Value entry and validation (fixes the §21 "filter values not type-checked" gap)

Values are stored as strings (§4.9). Validation per type:

| Family / type            | Accepts                                          | Errors                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INTEGER (precise widths) | `^[+-]?\d+$`                                     | out of the width's range, e.g. `SmallInt` ∉ [-32768, 32767]. Plain `Integer`/`BigInt` are capped at the Java long range: a literal one past the range **silently wraps** in the engine ✅. Unsigned values above 2^63−1 are rejected. |
| FLOAT                    | finite number                                    | not a number                                                                                                                                                                                                                          |
| DECIMAL / NUMBER         | decimal syntax                                   | not a decimal. Precision and scale are **not** enforced (`price > 1.555` on `Numeric(10,2)` is meaningful).                                                                                                                           |
| STRING                   | any string (empty allowed)                       | – (no length check: `CHAR(n)` is mistyped `Varchar(1)` and views are `Varchar(0)`, so length errors would block valid input ✅)                                                                                                       |
| BOOLEAN                  | exactly `true` / `false`                         | anything else                                                                                                                                                                                                                         |
| STRICT_DATE              | valid calendar `YYYY-MM-DD`                      | invalid date                                                                                                                                                                                                                          |
| DATETIME                 | `YYYY-MM-DDTHH:MM:SS[.f{1,9}]`, seconds required | missing seconds: the engine silently truncates hour/minute literals to the day ✅                                                                                                                                                     |
| ENUM                     | one of the enum's values                         | anything else                                                                                                                                                                                                                         |
| In / NotIn               | a non-empty list, each item validated            | an empty list: `!in([])` silently drops NULL rows ✅                                                                                                                                                                                  |

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

| Where            | Form                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lambda (slice)   | Not written explicitly: accessors carry the types. **Literals are typed by column family**: INTEGER → `{_type:'integer'}`, FLOAT → `float`, DECIMAL/NUMBER → `decimal`, STRICT_DATE → `strictDate`, DATETIME → `dateTime`, ENUM → `EnumPath.VALUE`. Serialized losslessly. |
| Lambda (later)   | Explicit casts only where Cube widens (FULL-join merged key, Concat autofix). Pure text uses full paths with parameters, e.g. `meta::pure::precisePrimitives::Varchar(15)`.                                                                                                |
| Engine responses | `rawType.fullPath` + `typeVariableValues` → `CubeType`; `multiplicity.lowerBound == 0` → `nullable` (but see §4.7 for joins).                                                                                                                                              |
| Saved spec       | Source schema snapshots `{name, type:{path, params?}, nullable}`; literal values `{kind, value: string}`.                                                                                                                                                                  |
| UI               | Short name with parameters (`Varchar(5)`, `Numeric(10,2)`, `SmallInt`) and a nullable marker. A family icon. The full path in a tooltip.                                                                                                                                   |

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

- Each source holds `{database, schema, table}`. `context.model` is a `ModelRef` and `context.runtime` is a runtime
  path, both query-level (one model, one runtime per query, D2).
- Table and schema names are stored raw. **Dotted names must never round-trip through Pure text.**
  `#>{db.S1."a.b"}#` silently resolves to a different table ✅. Protocol JSON paths (`["db","S1","a.b"]`) are exact.

**6.2.2 Model reference.**

```ts
type ModelRef =
  | { kind: 'local'; id: string; label?: string } // slice: bundled fixture or pasted model (dev only)
  | { kind: 'project'; groupId: string; artifactId: string; versionId: string }; // M3 (depot)
```

**6.2.3 `LocalModelCatalog` (slice).**

1. Take Pure grammar text: a bundled fixture or a pasted model.
2. Parse it once with `grammarToJSON_model`
   ([V1_EngineServerClient.ts:405](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts:405)).
   The result is a model-context JSON (`{_type:'data', elements}`).
3. Read `Database` elements (schemas → tables) and `PackageableRuntime` elements from it, in the `v1/` seam.
4. Send that same data context to every typing and execution call. Inline `data` and `text` contexts both work for
   `lambdaRelationType` and `execute`, and need no depot ✅.

**6.2.4 Cube Northwind fixture.** `legend-cube-builder/src/stores/fixtures/CubeNorthwindModel.ts`, a TS string.

- It is a corrected copy of the Database in
  [Northwind.pure](packages/legend-manual-tests/src/__tests__/query-builder/model/Northwind.pure). The shared model is
  left untouched, because the query-builder grammar tests use it.
- Corrections:
  - `ORDERS.FREIGHT`, `ORDER_DETAILS.UNIT_PRICE`/`DISCOUNT` and `PRODUCTS.UNIT_PRICE` become `REAL` (→ `Double`). In
    the shared model they are `OTHER` → `String`, so numeric filters fail to compile ✅.
  - **Drop the BLOB/CLOB columns** (`EMPLOYEES.NOTES`, `PHOTO`, `CATEGORIES.PICTURE`). `NOTES` serializes as
    **invalid JSON** in every format ✅. The accessor's SQL lists only declared columns, so dropping them is safe.
  - `SHIPPERS.PHONE` becomes nullable.
  - Remove the four bogus `*_REGION` joins (text vs SMALLINT) ✅.
- It has a LocalH2 connection with `testDataSetupSqls: ['call loadNorthwindData()', <CUBETEST DDL + inserts>]` and a
  mapping-less `StoreRuntime`.
- **`CUBETEST.ALLTYPES`** adds the precise types Northwind lacks: `TINYINT`, `BIGINT`, `FLOAT`, `DOUBLE`,
  `DECIMAL(10,2)`, `TIMESTAMP`, `BIT`, `VARCHAR`, plus nullable rows and an all-null row. The scratch version of this
  was verified ✅.

**6.2.5 Runtime rule.**

- The engine matches a runtime's connection to a store **by exact element**, and with no match it **silently falls
  back to the first connection** ✅. Northwind queries ran against another database in tests.
- So the picker offers only runtimes whose store keys **exactly** contain the source database.
- Store keys are read from both runtime syntaxes: `connections[].store` and `connectionStores[].storePointers[]` ✅.
- Includes are ignored, and `localEngineRuntime` and dataspace pointers are treated as unresolvable (hidden).

**6.2.6 Schema resolution.** `{nodeId: |#>{db.schema.table}#}` goes into the batch endpoint (no `from()` needed),
and each result maps to a `Schema`.

Problem tables are flagged in the picker rather than crashing the canvas:

| Case               | Behaviour                           | Flag shown              |
| ------------------ | ----------------------------------- | ----------------------- |
| a `BINARY` column  | the whole table's accessor fails ✅ | "unavailable"           |
| a view             | every column is `Varchar(0)` ✅     | "untyped"; hidden in v1 |
| a `CHAR(n)` column | typed `Varchar(1)` ✅               | "length unknown"        |

**6.2.7 Picker UI (slice).** A minimal dialog. M3 redesigns it.

1. Pick a model (bundled "Northwind (Cube fixture)" or "Paste Pure model…").
2. Pick a runtime (filtered by §6.2.5).
3. Pick database → schema → a table list with search, column counts and the flags above.

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
  2. Insert nodes **sorted by id** and edges **sorted by `port + source + target`**, keyed by port so self-joins
     keep both edges (§17.3 determinism, verified for dagre ✅).
  3. Run layout and convert centres to top-left (fixes §17.3 pitfall 1).
- **Nodes:**
  - Fixed size (200×72), with the icon and the `describe()` text clamped to two lines; the full text is in the
    tooltip. This avoids measuring, which keeps the layout deterministic.
  - React Flow keys nodes by `id`.
  - `nodesDraggable=false`: the user does not position nodes.
  - Zoom, pan, minimap and fit-view come from xyflow (fixes pitfall 5).
- **Binary ports:** two named target handles, `leftTds` (upper) and `rightTds` (lower). Edges into binary nodes carry
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

### 7.5 Join editor

- Join type: Inner, Left Outer, Right Outer, Full Outer.
- Paired rows of (left column from the left schema, right column from the right schema), with type labels. An
  incompatible pair is marked inline using the domain's compatibility check.
- Add or remove rows. The add button is disabled once every column is used (§17.6).
- A Swap Inputs button.
- When the duplicate-column error fires, the panel lists the offending names. The autofix comes in M2.

### 7.6 Filter editor

The §8.5 tree builder:

- Rows of (column, operator, value), And/Or groups, and a Not toggle.
- The operator list comes from §5.5 for the column's family.
- Value widgets per family (§5.6/§17.7), with multi-value entry for In/NotIn. Values are validated inline and stay
  marked as invalid in both display and edit modes.
- Unsupported constructs render "This filter is not supported yet." (§8.5).

### 7.7 Source panel

Shows the coordinates read-only, the resolved schema as a table (name, type label, nullable), and **Refresh**, which
re-resolves the schema. A refresh that changes the schema shows a warning listing the drift.

### 7.8 State (builder, MobX)

`CubeEditorState`:

| Field                                    | Contents                                            |
| ---------------------------------------- | --------------------------------------------------- |
| `document` (`observable.ref`, immutable) | the `CubeDocument`                                  |
| `history` / `future`                     | undo                                                |
| `analysis` (`computed`)                  | `buildSchemasAndValidity(document.query)`           |
| `hostIssues` (`Map<nodeId, string[]>`)   | engine errors mapped back to nodes                  |
| `resolution` (`ActionState`)             | source schema requests                              |
| `execution` (`CubeExecutionState`)       | result, stale flag, stats, error                    |
| `ui`                                     | open editor node, panel sizes; ephemeral, not saved |

Every edit goes through `applyQuery(next)`, which pushes onto history. Domain objects are frozen classes, so MobX
never observes them deeply.

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
  | { k: 'elementPtr'; path: string }
  | { k: 'enumValue'; enumPath: string; value: string }
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

| Operator                                               | Emitted                                                                                | SQL behaviour ✅                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Equal / GreaterThan / GTE / LT / LTE                   | `equal`, `greaterThan`, `greaterThanEqual`, `lessThan`, `lessThanEqual`(`$row.c`, lit) | positive comparisons exclude NULLs                            |
| StartsWith / EndsWith / Contains                       | `startsWith`, `endsWith`, `contains`(`$row.c`, string)                                 | `LIKE`, with wildcards and quotes escaped ✅                  |
| In                                                     | `in($row.c, [lits])`                                                                   | `IN (…)`                                                      |
| IsEmpty                                                | `isEmpty($row.c)`                                                                      | `IS NULL`                                                     |
| every negation (NotEqual, DoesNot…, NotIn, IsNotEmpty) | `not(<positive>)`, i.e. §8.4's encoding                                                | **includes NULLs** (D4): `IS DISTINCT FROM`, `… OR c IS NULL` |
| And / Or / Not                                         | `and` / `or` (binary, folded left) / `not`                                             | –                                                             |

`toOne()` is never inserted in filters: it breaks the NULL behaviour of negations ✅.

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
     `Numeric(12,4)`): without the cast **the extend itself fails to compile** ("Wrong type variables count (0) for
     type: Varchar(x:Integer)"). `cast(@String)` / `cast(@Decimal)` compiles, a downstream filter works, and the rows
     match an independent SQL-semantics FULL join (134 rows).
   - **Other differing types:** the engine already unifies them (`Int`+`SmallInt` → `Integer`, `SmallInt`+`Double` /
     `SmallInt`+`Numeric` → `Number`), so the cast is harmless.
   - **Equal types:** keep their type (`Varchar(15)`), so no cast is emitted.
6. Always finish with `->select(~[<§7.11 order>])`. This orders the columns and drops the temporary columns ✅.

**Literals.** Typed by the column family (§5.8) and serialized losslessly: integer and decimal values are written as
raw numeric tokens from strings.

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
  The first row is `["BLONP", 10584, 4, "1997-06-30", …]`.
- **Relation type** (with the shared model): 24 columns in exact §7.11 order: `CUSTOMER_ID Varchar(5)[0..1]`,
  `ORDER_ID SmallInt[1]`, `EMPLOYEE_ID SmallInt[0..1]`, `ORDER_DATE StrictDate[0..1]`, … `COMPANY_NAME
Varchar(40)[1]`, … With the Cube fixture, `FREIGHT` becomes `Double[0..1]`.
- **Protocol shapes the serializer must produce:**

  - accessor: `{"_type":"classInstance","type":">","value":{"path":["showcase::northwind::store::NorthwindDatabase",
"NORTHWIND","ORDERS"]}}`
  - column name: `{"_type":"classInstance","type":"colSpec","value":{"name":"CUSTOMER_ID"}}`
  - column list: `{"_type":"classInstance","type":"colSpecArray","value":{"colSpecs":[{"name":…},…]}}`
  - join kind: `{"_type":"property","property":"INNER","parameters":[{"_type":"packageableElementPtr","fullPath":
"meta::pure::functions::relation::JoinKind"}]}`
  - lambdas: `{"_type":"lambda","parameters":[{"_type":"var","name":"l"},…],"body":[…]}`
  - literals: `{"_type":"strictDate","value":"1997-01-01"}`, `{"_type":"integer","value":1}`
  - runtime: a `packageableElementPtr` as the second parameter of `from`.

  M1.7 locks these in with golden tests against the engine's own parse of the Pure text.

- **Slice acceptance variants** (all ✅ with the shared model):
  - France only → 77 rows.
  - LEFT (`CUSTOMERS ⟕ ORDERS`) shows unmatched FISSA and PARIS with null order columns. Cube marks those columns
    nullable; the engine's relation type wrongly says `[1]`.
  - RIGHT keeps the right key's value.
  - FULL with the coalesce extend works.

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
interface CubeEngine {
  loadModel(source: LocalModelSource): Promise<CubeModelContext>; // grammar → data context (slice)
  resolveSchemas(
    ctx: CubeModelContext,
    accessors: Map<NodeId, AccessorPath>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  typeLambdas(
    ctx: CubeModelContext,
    lambdas: Map<NodeId, IR>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
  execute(
    ctx: CubeModelContext,
    lambda: IR,
    opts: { abort?: AbortSignal },
  ): Promise<CubeResult>; // {columns, rows, sql[], durationMs}
  renderPure(lambda: IR): Promise<string>; // JSONToGrammar PRETTY, display only
}
```

`V1_LegendCubeEngine` (under `v1/`) implements it with
[V1_EngineServerClient](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts):

| Port method  | Client call(s)                                                                                                   | Line   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| `loadModel`  | `grammarToJSON_model`                                                                                            | `:405` |
| typing       | `batchLambdasRelationType`, reading `result ?? results` and deserializing each with `V1_relationTypeModelSchema` | `:820` |
| `execute`    | `runQuery`                                                                                                       | `:856` |
| `renderPure` | `JSONToGrammar_lambda`                                                                                           | `:565` |

- **Execution results** are parsed **losslessly**, as with `convertUnsafeNumbersToString` in
  [V1_RemoteEngine.ts:951](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts:951).
  SQL comes from `activities[]` where `_type == 'relational'`. A 200 response with an unparseable body is reported as
  an execution error, because the engine can stream a stack trace into a 200 ✅.
- **Error mapping:** every emitted node gets `sourceInformation.sourceId = "cube:<nodeId>:<role>"`, including the
  accessor's `value` object. The engine echoes the **innermost** failing node's stamp in compile errors, including
  per-key in batch ✅. The adapter turns these into `hostIssues` by node id; the first line goes on the node and the
  full text in the panel. Plan-time and database errors carry no location, so they attach to the capture node.
- **Graph-manager wrappers are bypassed** for typing on purpose: they drop parameters and the batch wrapper throws
  (D8). A tracer service must be set on the client, or every call throws 📄.

### 8.8 Full mapping: spec constructs → lambda

Engine support codes: **H2** = run live ✅. **PCT** = passes the engine's portability tests on Snowflake, Postgres,
DB2, SQL Server, Databricks, DuckDB, Oracle and Trino unless noted.

**Transforms (§7)**

| Spec           | Lambda construct                                                                                                                                                                                                | Engine support                                             | Fallback / notes                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source (table) | `#>{db.schema.table}#` + one `->from(rt)`                                                                                                                                                                       | H2, PCT                                                    | Problem tables flagged (§6.2.6)                                                                                                                                                                       |
| **Filter**     | `->filter({row \| …})`                                                                                                                                                                                          | H2, PCT                                                    | §8.4 table                                                                                                                                                                                            |
| **Join**       | rename temps → `->join(R, JoinKind.X, {l,r \| …})` → (FULL: coalesce extend) → `->select(~[…])`                                                                                                                 | H2 all 4 kinds; FULL native on 9 databases, emulated on H2 | Engine rejects any duplicate name ✅ (hence the algorithm); `->toOne()` for SQL NULL semantics                                                                                                        |
| Sort           | `->sort([~a->ascending(), ~b->descending()])`                                                                                                                                                                   | H2, PCT                                                    | Only meaningful at the sink or before Limit/Drop/Slice (lost inside subqueries) → warning in M2                                                                                                       |
| Group          | `->groupBy(~[k…], ~[n: x \| $x.c : y \| $y->agg()])`; no keys → `->aggregate(~[…])`                                                                                                                             | H2, PCT                                                    | `groupBy(~[], …)` throws NPE ✅; no aggregations → NPE (spec requires ≥ 1 anyway)                                                                                                                     |
| Restrict       | `->select(~[…])` listed **in input-schema order**                                                                                                                                                               | H2, PCT                                                    | `select` keeps the order you list ✅                                                                                                                                                                  |
| Rename         | one `->rename(~old, ~'new')` per mapping                                                                                                                                                                        | H2, PCT                                                    | Array form returns 500 ✅                                                                                                                                                                             |
| Distinct       | `->distinct()`                                                                                                                                                                                                  | H2, PCT                                                    | –                                                                                                                                                                                                     |
| Drop           | `->drop(n)`                                                                                                                                                                                                     | H2; **fails PCT on SQL Server and DB2** (`limit m,-1`)     | rowNumber window + filter + select (verified on all 10 dialects' plans ✅)                                                                                                                            |
| Limit          | `->limit(n)`                                                                                                                                                                                                    | H2, PCT                                                    | –                                                                                                                                                                                                     |
| Slice          | `->slice(start, stop)`, range `[start, stop)` (D5)                                                                                                                                                              | H2; **fails PCT on SQL Server** (`limit m,n`)              | rowNumber fallback, as Drop                                                                                                                                                                           |
| Concat         | `->concatenate(R)`                                                                                                                                                                                              | H2, PCT (`UNION ALL`)                                      | Names, order **and precise types** must match exactly ✅. Column-count mismatch is not caught (NPE at execution) ✅ → Cube validates. Widen autofix uses a real conversion (`toString()`), not `cast` |
| Difference     | **No relation function.** Rename `x→x_1`/`x_2`, keys → temps; `join(FULL)`; `extend` (keys `coalesce`; `x_valueDifference: x_1->coalesce(0)->toFloat() - x_2->coalesce(0)->toFloat()`); `select` in §7.12 order | Emulation H2 ✅                                            | **Gap:** legacy `columnValueDifference` is TDS-only and differs from §7.12. Spec semantics kept (D5)                                                                                                  |
| Partition      | `->extend(over(~[p…], [~s->ascending()]), ~[n: {p,w,r \| $r.c} : y \| $y->agg()])`; ranks in a separate `extend` with `{p,w,r \| $p->rank($w,$r)}`; `let`-isolated (§8.6)                                       | H2, PCT for ranking with ORDER BY and `size()`             | **Gap:** window `count()` loses its OVER clause → emit `size()` ✅. Rank without a sort fails → validation. No partition → `over([sorts])`; neither → `over([])`                                      |
| Extend         | `->extend(~[n: row \| <expr>])`, expression as `raw` IR from `grammarToJSON_valueSpecification`                                                                                                                 | H2                                                         | Type from engine typing over an empty model (§5.7)                                                                                                                                                    |
| Unknown        | –                                                                                                                                                                                                               | –                                                          | Not executable (§7.16)                                                                                                                                                                                |

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

| Gap                                     | Handling                |
| --------------------------------------- | ----------------------- |
| No Difference relation function         | Emulation               |
| Window `count()`                        | `size()`                |
| Window filter pushdown                  | `let` isolation         |
| Slice/Drop on SQL Server and DB2        | rowNumber fallback      |
| Windowed DistinctCount portability      | `groupBy` + join        |
| Engine ignores join/filter value types  | Cube validation         |
| Outer-join and aggregate multiplicity   | Cube infers nullability |
| `CHAR`/`BINARY`/view typing             | Picker flags            |
| `#P`/`#I` not in the open-source engine | Mocks (D6)              |

Every engine defect is listed in Appendix B.

---

## 9. Results grid (§12–13 adapted)

**Slice:**

- `@finos/legend-lego/data-grid` `DataGrid` (enterprise, D3), client-side row model.
- Columns come from Cube's **inferred** schema, not from the result builder, which is lossy.
- Column ids are positional (`c0…cN`) with `headerName = column name`. ag-grid treats dots in `field` as nested
  paths, and column names may contain dots or spaces.
- Alignment and formatting follow the type family. Integer and Decimal values stay as strings when unsafe.
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

| Aspect     | Answer                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Shape      | `CubeDocument { context: {model: ModelRef; runtime?}; query: Query (nodes, connections, selected); meta: Meta }`, as §4 |
| Owner      | `@finos/legend-cube`. Immutable classes; every edit makes a new `Query`                                                 |
| Round trip | ↔ CubeSpec via the core codec (§10.3). The UI never holds a second copy of the truth                                   |
| Versioning | None of its own; versioned through the spec's `formatVersion`                                                           |
| Storage    | In memory (MobX `observable.ref`) while editing                                                                         |

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
    "model": { "kind": "local", "id": "cube-northwind" }, // or { "kind": "project", groupId, artifactId, versionId }
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
value}`. **Negations are stored as negated operators** (`NotEqual`, `NotIn`, …); `not` wraps composites only. This
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
[Query.ts](packages/legend-graph/src/graph-manager/action/query/Query.ts),
[QueryEditorStore.ts:556-585](packages/legend-application-query/src/stores/QueryEditorStore.ts:556).

- **`content` must be Pure-lambda text.** Legend Query re-parses it on load
  ([QueryEditorStore.ts:2662](packages/legend-application-query/src/stores/QueryEditorStore.ts:2662)).
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

Each step ends green on `yarn check:ci`, `yarn lint:ci` and the tests. M1.1–M1.6 are **headless and test-driven**;
nothing in them needs the engine.

| Step     | Deliverable                                                                                                                                                                                                                                                                                                                                 | Done when                                                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1.0** | Scaffolding: both packages (§3.1–3.4); the purity lint guard and import-scan test; the `/cube` route and `TEMPORARY__enableLegendCube` flag rendering a placeholder; changesets                                                                                                                                                             | `yarn build`, all CI checks green; `localhost:9001/query/cube` renders the placeholder with the flag on                                                                                                                                                                                        |
| **M1.1** | Types and values: the registry (§5.3), `CubeType` interning and equality, families, comparison classes (§5.4), `LiteralValue` coercion and validation (§5.6), type display                                                                                                                                                                  | Table-driven tests: every engine type path parses (including short names and `Varchar(0)`); the compatibility matrix; integer width boundaries including Java long ±1 and unsigned; date and datetime formats; Boolean strictness                                                              |
| **M1.2** | Graph and inference: `QueryNode`, `Connection`, `Query` with the five invariants **plus acyclicity**; every §4.4 operation, including `connect(…, port)`; per-type `generateId`; `buildSchemasAndValidity` with the sentinels; the query-level rule pass; the node registries; `RelationalTableSource` (with a given schema); `UnknownNode` | Every invariant violation throws; every `canX` is total; the cycle case is rejected; Appendix C.5(a) (disconnect the right input) yields `ERR_INCOMPLETE` on the join and `ERR_SCHEMAS` downstream, with no duplicates                                                                         |
| **M1.3** | Join: §7.11 validation steps 1–5 with verbatim messages; comparison-class compatibility; the duplicate rule; output order; nullability and merged-key rules per join type (§4.7); `swapInputs`; `describe`                                                                                                                                  | Appendix C.3's join row, retyped with precise types (`bookId` first; right duplicate dropped); C.5(b) message verbatim; multi-key and partially same-named keys; `Varchar(5)`⋈`Varchar(40)` OK; `Varchar`⋈`SmallInt` and `StrictDate`⋈`Timestamp` rejected; LEFT/RIGHT/FULL nullability matrix |
| **M1.4** | Filter: tree, operator availability by family (§5.5), shape and type validation, §8.5 helpers, `describe` and its redacted form                                                                                                                                                                                                             | Operator matrix for every registry type; validation messages verbatim plus the new ones; normalize/unwrap round trips; the column- and operator-change reset rules                                                                                                                             |
| **M1.5** | IR and emitter: the IR (§8.3); emit for source, join (§8.4 algorithm: temps, `toOne` for both-nullable keys, FULL coalesce + cast) and filter (operator table, negations, typed literals); the capture wrapper (`limit`, `from`); `origin` on every node; the debug printer                                                                 | Golden debug-printed output for INNER/LEFT/RIGHT/FULL × {same-named key, different names, multi-key} and every filter operator × family                                                                                                                                                        |
| **M1.6** | Spec v1 codec (§10.3): encode and decode, typed values, schema snapshots, `rest` preservation (top level, per node, meta), Unknown passthrough, migration skeleton, the newer-version read-only flag                                                                                                                                        | Property tests: `decode(encode(doc))` is deep-equal; re-encoding is byte-identical; an unknown node kind and unknown fields survive the round trip                                                                                                                                             |
| **M1.7** | **Thin end-to-end, headless** (builder): the `v1/` serializer (IR → protocol JSON with `sourceInformation`), the relation-type adapter, the lossless result reader, `V1_LegendCubeEngine`, the Cube Northwind + ALLTYPES fixture, `LocalModelCatalog`. Engine-backed tests (§11.2 part A)                                                   | Acceptance part A passes against `localhost:6300`, and in CI against the docker engine. The FULL-join cast and `toOne()` rules (verified live during planning) are covered by tests                                                                                                            |
| **M1.8** | **Canvas and editors:** `CubeEditorState`; the `/query/cube` page; source picker (§6.2.7); canvas (§7.2–7.3); editor shell + Join, Filter and Source panels; grid with execute, stale and limit; Show Pure; Export/Import spec (dev); undo; keyboard shortcuts                                                                              | jsdom tests: same layout for the same query whatever the insertion order; one undo entry per Apply; drop-target legality matches `canConnect`/`canMove`; the editor shows the upstream-invalid warning                                                                                         |
| **M1.9** | Slice acceptance and hardening: manual script (§11.2 part B) on `yarn dev:query` + engine; package READMEs; optional Playwright e2e against the real engine (the `legend-application-studio-e2e` pattern, not query-e2e's mocked engine)                                                                                                    | Part B passes; M1 review sign-off                                                                                                                                                                                                                                                              |

Ordering note: M1.7 runs before M1.8 on purpose, as §20 says ("prove the engine round trip before building the
canvas"). If the canvas misbehaves, it is the canvas.

### 11.2 Slice acceptance test

**Part A: automated** (`legend-cube-builder/src/__tests__/LegendCubeNorthwind.engine-roundtrip-test.ts`)

- **Setup:** one file, so the tests run serially. Northwind's setup drops and recreates its schema on every connection.
- **Assertions:** check **semantics, not SQL text**, because the CI engine image tag moves with every engine merge ✅.
- **Logging:** log `GET /api/server/v1/info` `git.commit.id` for provenance.

1. **Resolve.** Add sources `ORDERS` and `CUSTOMERS` from the Cube fixture and resolve them with one batch call.
   - `ORDERS` has 14 columns, including `ORDER_ID SmallInt` not nullable, `CUSTOMER_ID Varchar(5)` nullable,
     `ORDER_DATE StrictDate` nullable, and `FREIGHT Double` nullable.
   - `CUSTOMERS` has 11 columns.
   - `ALLTYPES` resolves to `TinyInt, BigInt, Float4, Double, Numeric(10,2), Timestamp, Boolean, Varchar(n)`.
2. **Join schema.** `join101` (INNER, `CUSTOMER_ID = CUSTOMER_ID`).
   - The Cube-inferred schema has **24 columns in §7.11 order**.
   - Name, order, type path and parameters equal `lambdaRelationType` of the emitted lambda prefix.
   - Nullability: Cube ⊇ engine, so Cube may only widen.
3. **Execute.** `filter101` = `SHIP_COUNTRY Equal "France" AND ORDER_DATE GreaterThanOrEqual 1997-01-01 AND EMPLOYEE_ID
In [1, 4]`, captured and executed.
   - **19 rows**, the first starting `BLONP, 10584, 4, 1997-06-30`.
   - France alone gives **77 rows**.
4. **Join kinds.**
   - `CUSTOMERS LEFT_OUTER ORDERS` returns FISSA and PARIS with null `ORDER_ID`, and Cube marks the order columns
     nullable.
   - `RIGHT_OUTER` keeps the right key value.
   - `FULL_OUTER` coalesces the key and returns rows from both sides.
5. **Precise literals.** On `ALLTYPES`: one filter per family with a typed literal (`Numeric > 1.5`, `Timestamp >=
…T12:00:00`, `BigInt > 15000000000`, `Boolean == true`). Each executes and matches the expected rows.
6. **Negatives, all local (no engine call needed):**
   - `ORDER_DETAILS ⋈ PRODUCTS` on `PRODUCT_ID` gives
     `Duplicate column names between inputs are not supported if they are not part of the join columns: "UNIT_PRICE"`.
   - `CUSTOMERS.CUSTOMER_ID ⋈ ORDERS.EMPLOYEE_ID` gives `Join columns "CUSTOMER_ID" and "EMPLOYEE_ID" must be of compatible types.`
   - `EMPLOYEE_ID Equal "abc"` gives `Filter value "abc" is not a valid SmallInt.`
   - `EMPLOYEE_ID Equal 100000` gives the out-of-range error.
7. **Propagation.** Disconnect the right input: `ERR_INCOMPLETE` on the join, `ERR_SCHEMAS` on the filter.
8. **Error mapping.** Resolve with a stale schema snapshot that names a removed column. The engine compile error comes
   back with `sourceId` `cube:filter101:…` and lands on `filter101`.
9. **Spec round trip.** `encode` → `JSON.stringify` → parse → `decode` → re-emit gives deep-equal protocol JSON, and
   executes to the same 19 rows.
10. **Golden shape.** The emitted protocol JSON, with `sourceInformation` stripped, equals the engine's own
    `grammarToJson` of the golden Pure text in §8.5, adapted to the fixture.

**Part B: manual, in the UI** (`yarn dev:ts`, `yarn dev:query`, engine on 6300, flag on)

1. Open `http://localhost:9001/query/cube` and pick "Northwind (Cube fixture)" and `StoreRuntime`.
2. Add `ORDERS` and `CUSTOMERS` from the picker. They land with schemas; the source panel shows `Varchar(5)?`,
   `SmallInt`, …
3. Drag Join onto the canvas and connect `ORDERS` → Left and `CUSTOMERS` → Right. The join shows incomplete, then
   invalid ("Left join columns cannot be empty.").
4. Set the join columns. The node turns valid and Left/Right labels are visible.
5. Drag Filter onto the join (it splices in after it) and build the three rules. Operator lists differ by type, and
   an invalid value is flagged inline.
6. Make the filter the capture node (Ctrl-click) and press F9. The grid shows 19 rows.
7. Edit the filter: the grid marks results stale. Undo restores the previous state. Show Pure displays the lambda.
8. Export the spec, reload the page, import it. The same graph and the same results come back.

### 11.3 After the slice (recommended order, outline)

| #   | Milestone                                  | Contents                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2  | Simple unary transforms + Join autofix     | Rename (§7.5 + collision fix; regex replaced, see Appendix A), the **Join rename autofix** (collision-free names), Restrict (input order), Sort (+ "Sort only affects output at the sink" warning), Distinct, Limit, Drop, Slice (`[start, stop)`; rowNumber fallback for SQL Server/DB2); grid quick actions (Sort by / Filter by X) |
| M3  | Entry points, sources modal, depot catalog | D7 follow-up: entry links (setup action, editor menu, deep links `/cube/new?…`), source-modal redesign, final look; the depot catalog (§6.3) with an SDLC-pointer model context and exact-store runtime filter; SNAPSHOT handling                                                                                                     |
| M4  | Group and Concat                           | Aggregations (§10 with the §5.7 result-type rules, availability per family), `aggregate()` for global groups; Concat with precise-strict schema equality + widen autofix; a conformance suite comparing local inference with `lambdaRelationType` for every node type                                                                 |
| M5  | Partition (windows)                        | §8.6 `let` isolation, array form, `size()` counts, sort required for ranking, frames decision; a **dialect harness** (`generatePlan` per database type over golden lambdas)                                                                                                                                                           |
| M6  | Extend and Difference                      | Expression editor (Monaco), JSON-canonical expression storage + display text, engine typing over an empty model with cached types, plan-time validation; Difference emulation with §7.12 semantics                                                                                                                                    |
| M7  | Grid and presentation                      | Server-side mode (enterprise SSRM) with lambda-derived drill-down, CSV and XLSX export, the context menu, stats, §13 column formatting with the §21 fixes                                                                                                                                                                             |
| M8  | Persistence                                | Engine Cube store PR (§10.6), Studio client, `CubeStore` port, Save/Load/Copy/Paste, `/cube/:cubeId`, modified state, `beforeunload`                                                                                                                                                                                                  |
| M9  | More sources                               | Services → Pure functions → data products (mapping modes first; `#P` against mocks) → ingest (`#I` against mocks), with parameter forms (§17.6)                                                                                                                                                                                       |
| —   | Out of scope                               | Publishing and service registration (§15); V0 import                                                                                                                                                                                                                                                                                  |

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
4. **Views and tables with `BINARY` columns** in the picker: hide (recommended for v1) or show flagged?
5. **SNAPSHOT versions** in the depot picker: allow, at a recompile on every call, or resolve to a concrete version?
6. **Multiple databases or runtimes per query:** when, and with what engine support? Today it is a two-step plan with
   no pushdown, or a plan error.
7. **Engine image pinning for CI:** keep `:snapshot` (the repo norm) or pin a digest?
8. **Window frames:** keep the running default (D5) or add explicit frame controls in M5?

---

## Appendix A: Spec deltas, section by section

| Spec §               | Status           | Change                                                                                                                                                                                                                                                          |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preamble (22–30), §0 | Superseded       | Non-negotiable = §3 (extended), §4–5, §7–10, §16 semantics. Wire = relation lambda (protocol JSON). Storage = CubeSpec v1. Sources = relational tables, then services, functions, data products, ingest                                                         |
| §1                   | Kept, nuanced    | "No server round trip for editing" holds for the slice's nodes; Extend typing uses an engine call, cached (§5.7)                                                                                                                                                |
| §2.1, §18            | Superseded       | Host auth, config, telemetry                                                                                                                                                                                                                                    |
| §3.1                 | **Extended**     | Precise primitive registry, families, comparison classes (§5.4); interning per `(path, params)`; unknown → Opaque instead of throwing; `Decimal`, `StrictTime`, `Variant` added                                                                                 |
| §3.2                 | **Extended**     | `nullable` on columns; unique names asserted; `equals` ignores nullability                                                                                                                                                                                      |
| §4                   | Kept + fixes     | Acyclicity invariant; `connect(…, port)`; per-type ids; port labels                                                                                                                                                                                             |
| §5                   | Kept + extended  | Query-level rule pass; host issues map (display only)                                                                                                                                                                                                           |
| §6.1                 | Idea kept        | Source and transform registries + builder adapters; batch resolution                                                                                                                                                                                            |
| §6.2–6.7             | Superseded       | §6 of this plan                                                                                                                                                                                                                                                 |
| §7.0, `V1:` lines    | Replaced         | Saved shapes (§10.3) + emission table (§8.8)                                                                                                                                                                                                                    |
| §7.4                 | Kept             | Emit `select` in input order                                                                                                                                                                                                                                    |
| §7.5 (M2)            | Fixed            | Add a collision check against untouched input columns. Replace the regex `/^[A-Za-z0-9_ ]{1,100}$/u` with: non-empty, trimmed, no `"`, no control characters, length ≤ 128 💭. The engine accepts spaces, hyphens, unicode and `\'`; `"` breaks at execution ✅ |
| §7.9, §17.9          | Changed (D5)     | `[start, stop)`; help-text copy fixed                                                                                                                                                                                                                           |
| §7.10 (M4)           | Extended         | Precise-strict equality; reject with a precise message; widen autofix through real conversions                                                                                                                                                                  |
| §7.11                | Kept + extended  | FULL OUTER; nullability and merged-key rules (§4.7); step 4 per §5.4; autofix with collision-free names (M2)                                                                                                                                                    |
| §7.12 (M6)           | Kept, emulated   | Semantics as the spec; join and null rules written down                                                                                                                                                                                                         |
| §7.13 (M5)           | Extended         | Rank/DenseRank need ≥ 1 sort; Count emitted as `size()`; running default frame (D5)                                                                                                                                                                             |
| §7.14 (M6)           | Extended         | Validate empty names and duplicates among new columns                                                                                                                                                                                                           |
| §7.16                | Fixed            | Unknown keeps its inputs and raw JSON; re-saved verbatim                                                                                                                                                                                                        |
| §8.2                 | **Extended**     | Matrix keyed by family (§5.5); VARIANT/OPAQUE row                                                                                                                                                                                                               |
| §8.3, §21            | **Fixed**        | Operator availability and value-type validation (§5.6) with new messages                                                                                                                                                                                        |
| §8.4                 | Replaced         | Emission (§8.4 of this plan) + saved filter shape (§10.3). NULL behaviour documented (D4)                                                                                                                                                                       |
| §9 (M6)              | Replaced         | Pure expressions stored as JSON (+ display text); typed by the engine; §9.2 table becomes help only, with Pure names                                                                                                                                            |
| §10.1                | Kept (for now)   | Per-family view; extend later (Min/Max on strings etc.)                                                                                                                                                                                                         |
| §10.2                | **Replaced**     | §5.7 measured table; every aggregate except Count is nullable                                                                                                                                                                                                   |
| §11.1                | Idea kept        | `CubeEngine` port (§8.7)                                                                                                                                                                                                                                        |
| §11.2–11.3           | Superseded       | –                                                                                                                                                                                                                                                               |
| §11.4                | Superseded       | Host HTTP client; keep "truncate and show trace link" behaviour via host                                                                                                                                                                                        |
| §12–13               | Idea kept        | §9 of this plan; lambda-derived drill-down; `limit + 1`; typed group keys; §21 fixes                                                                                                                                                                            |
| §14, §15             | Superseded / out | §10; publishing out of scope                                                                                                                                                                                                                                    |
| §16                  | Kept + additions | §4.11                                                                                                                                                                                                                                                           |
| §17                  | Guidance         | §7; panel instead of popover; visible Left/Right; xyflow + dagre; deep links as path params (M3/M8)                                                                                                                                                             |
| §19.1–19.3           | Superseded       | §3 (two packages), §8 (relation functions, not `meta::pure::tds::*`)                                                                                                                                                                                            |
| §20                  | Idea kept        | §11 (headless first; join and filter in M1; persistence last)                                                                                                                                                                                                   |
| Appendix C.4         | Replaced         | §8.5 lambda + relation type; §11.2 acceptance                                                                                                                                                                                                                   |

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
- `V1_AccessorHelper.ts:370-392`: the schema-qualified table lookup is overwritten (wrong table on name clash).
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
- Outer joins don't widen multiplicity; aggregates are reported `[1]` but can be null.
- NPEs: `groupBy(~[], …)`, `groupBy` with no aggregations, `concatenate` with a column-count mismatch.
- `rank` without ORDER BY compiles. Mixing FuncColSpec and AggColSpec in one `extend` throws a ClassCastException.
  `if()` drops type parameters ("Wrong type variables count").
- H2 CLOB values serialize as invalid JSON (`ValueTransformer`). DateTime literals below seconds precision are
  truncated to the day. `toDecimal` truncates the scale on H2.
- Slice/drop emit `limit m,n` on SQL Server, Sybase and DB2 (PCT failures). CTE names are not quoted for keywords on
  SQL Server, DB2 and Sybase.
- Enum equality after `project` compares the source value. Dotted quoted table names split into four path parts and
  resolve the wrong table. A literal one past the long range silently wraps.
- `BaseStoredVersionedAssetDao`: no version check, non-atomic updates, `GET` rewrites the document, and id reuse
  corrupts history.

## Appendix C: Evidence index

**Spec:** [docs/design/WIP-CUBE-SPEC.md](docs/design/WIP-CUBE-SPEC.md).

**Northwind:**

- model: [Northwind.pure](packages/legend-manual-tests/src/__tests__/query-builder/model/Northwind.pure)
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

**Studio APIs:** [V1_EngineServerClient.ts](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_EngineServerClient.ts),
[V1_RemoteEngine.ts](packages/legend-graph/src/graph-manager/protocol/pure/v1/engine/V1_RemoteEngine.ts),
[V1_TypeSerializationHelper.ts](packages/legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.ts),
[FormatterUtils.ts](packages/legend-shared/src/format/FormatterUtils.ts).

**Legend Query:** [LegendQueryNavigation.ts](packages/legend-application-query/src/__lib__/LegendQueryNavigation.ts),
[LegendQueryWebApplication.tsx](packages/legend-application-query/src/components/LegendQueryWebApplication.tsx),
[LegendQueryApplicationConfig.ts](packages/legend-application-query/src/application/LegendQueryApplicationConfig.ts),
[ExistingQueryDataCubeViewer.ts](packages/legend-application-query/src/stores/data-cube/ExistingQueryDataCubeViewer.ts) (embedding precedent).

**Data Cube (neighbour):**

- [DataCubeEngine.tsx](packages/legend-data-cube/src/stores/core/DataCubeEngine.tsx)
- [DataCubeQueryBuilderUtils.ts](packages/legend-data-cube/src/stores/core/DataCubeQueryBuilderUtils.ts)
- [LegendDataCubeDataCubeEngine.ts](packages/legend-application-data-cube/src/stores/LegendDataCubeDataCubeEngine.ts)
- **Reuse:** the xyflow + dagre stack, engine-client calls, and the undo / commit-on-Apply patterns.
- **Keep separate:** snapshot model, filter and aggregate classes, type utilities, grid datasource, persistence.

**Scratch evidence** (this session only; important harnesses become repo tests in M1.7, M4 and M5): live-test
lambdas, the window regression matrix (`g1/`), dialect plan dumps (`g4/`) and the persistence harness
(`persistence-verify/`) are in the session scratchpad.
