# @finos/legend-cube-builder

The UI and the Legend engine adapter of Legend Cube, a canvas-based visual query builder. The domain model lives in the
host-free [`@finos/legend-cube`](../legend-cube).

It holds the page (the canvas, the palette, the side-panel editors, the source picker and the results grid), its MobX
stores, the engine port with its `v1/` adapter, and the bundled model catalog. Legend Query hosts the page at
`/query/cube`.

**Status:** work in progress, version 0.0.x. This version has relational tables (from a model or a direct connection to H2
or DuckDB), the access points of deployed data products (beta), Join, Sort, Filter, Restrict, Rename, Distinct, Drop,
Limit and Slice, with one model, one runtime and one database or data product project per query. A cube is kept only through Export and Import of its spec, marked "(dev)", until
the Cube store exists. A pasted model is kept in the cube. Nothing links to the page yet, there is no redo, and Cube sends no telemetry.

## Layout

| Folder                                | Holds                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/`                     | the page, `CubeEditor`, and its parts: `canvas/`, `palette/`, `editors/`, `source-picker/`, `grid/`, `show-pure/`, `spec-transfer/`                      |
| `src/stores/`                         | the MobX state of the page, its parts and the node editor; `editors/` (node drafts); `LocalModelCatalog` and `fixtures/` (the bundled model); `CubeHost` |
| `src/graph-manager/`                  | the engine port (`CubeEngine.ts`), the connection explorer and data product catalog ports, and their builders                                            |
| `src/graph-manager/protocol/pure/v1/` | the engine adapter, `V1_LegendCubeEngine`: the lambda serializer, the result and relation-type readers, the error mapping                                |
| `src/__lib__/`                        | labels, help text, the command config and test ids                                                                                                       |
| `src/__test-utils__/`                 | the fake engine and the helpers of the tests                                                                                                             |
| `style/`                              | the stylesheet, built to `lib/index.css`                                                                                                                 |

It depends on `@finos/legend-cube`, legend-graph, legend-application, legend-art, legend-lego, legend-shared, and the
depot, lakehouse and storage clients, never
on an application package (`legend-application-*`) or on legend-query-builder.

**The V1 rule:** `V1_*` protocol code lives under `src/graph-manager/protocol/pure/v1/`. The one product file outside
it that names `V1_*` is the seam `src/graph-manager/protocol/pure/CubeEngineBuilder.ts`: `buildCubeEngine` is the only
product code that makes a `V1_LegendCubeEngine`, so hosts never name a `V1_*` symbol. The repo's
`enforce-module-import-hierarchy` lint rule forbids imports between `stores/` or `components/` and `v1/`, both ways.
The engine-backed tests in `src/__tests__/` are an exception: they need both the adapter and `stores/`.

## Public API

`src/index.ts` exports:

- `CubeEditor`, the page, and `CubeHost`, what a host gives it;
- the engine port, everything in `CubeEngine.ts` (`CubeEngine`, `CubeEngineError`, `CubeEngineErrorKind`,
  `CubeResult`, `CubeModelOutline`, …), with `buildCubeEngine` and `CubeEngineConfig`;
- the connection explorer port, everything in `CubeConnectionExplorer.ts`, with `buildCubeConnectionExplorer`;
- data products: everything in `CubeDataProduct.ts` (the model kind, its runtime path, the environment types, the
  warehouse rule) and `CubeDataProductCatalog.ts` (the catalog port and its classes), with
  `buildCubeDataProductCatalog`, `buildCubeLakehouseEnvironment`, `CubeLakehouseServices`, `CubeLakehouseEnvironment`
  and `getCubeRememberedWarehouse`;
- `LocalModelCatalog` and `BUNDLED_MODELS`;
- `LEGEND_CUBE_COMMAND_CONFIG` and `LEGEND_CUBE_COMMAND_KEY`, the page's shortcuts;
- `LEGEND_CUBE_TEST_ID`;
- helpers that 0.0.2 published and nothing outside the package uses yet: `getRuntimesForDatabase`, `createTextModel`,
  `BundledModel`, and the bundled model's `CUBE_NORTHWIND_MODEL`, `CUBE_NORTHWIND_DATABASE` and
  `CUBE_NORTHWIND_RUNTIME`.

The node-type registries (drafts, editors, help text and icons) are internal: there is no plugin API for node types
yet.

## Sources

A cube reads relational tables (from a model, or from a database through a direct connection) or the access points of
deployed data products (beta), never both (PLAN §6.8). The "Add a source" dialog has a tab per way to find a source,
each implementing `CubeSourcePickerTab` (`src/stores/source-picker/`): Model, Database connection and Data product. A
host offers the last two by giving the page a `connectionExplorer` and a `dataProductCatalog` (see
[hosting](./docs/hosting.md)).

A new kind of source needs, in the core, a `SourceDefinition` (node, codec, emitter and its query rules) and, in the
builder, a tab, a Source panel editor, help text and an icon, and its branch in the engine's implementation, which
builds the model each call runs on from the cube's saved model kind (`src/graph-manager/CubeDirectConnection.ts` and
`CubeDataProduct.ts` are the two examples).

## Documentation

- [Hosting the page](./docs/hosting.md): what a host gives the page, the shortcuts, the stylesheet, and the dev loop.
- [Testing](./docs/testing.md): the test groups, the fake engine, and the tests against a real engine.
- [Adding an operation](./docs/adding-an-operation.md): the builder half of a new transform. The core half is in
  [`@finos/legend-cube`](../legend-cube/docs/adding-an-operation.md).
- [The plan](../../docs/wip/legend-cube/PLAN.md) and [the known issues](../../docs/wip/legend-cube/ISSUES.md).
