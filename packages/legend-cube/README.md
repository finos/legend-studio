# @finos/legend-cube

The host-free core of Legend Cube, a canvas-based visual query builder (not Legend DataCube, which is
`@finos/legend-data-cube`). It holds the domain model: precise types and values, schemas, the query graph with its
schema inference and validation, the transforms, filters, the Cube IR and its emitter, and the saved-spec codec.

The UI, the stores and the Legend engine adapter live in [`@finos/legend-cube-builder`](../legend-cube-builder).

**Status:** work in progress, version 0.0.x. The first slice has relational tables, Join and Filter. The API is not
stable before 1.0: `src/index.ts` re-exports whole modules.

## How it fits together

- **The query graph is the only source of truth.** A `CubeDocument` holds the context (the model and the runtime), an
  immutable `Query` of `QueryNode`s and `Connection`s, and presentation settings. Every edit makes a new `Query`.
- **Inference:** `buildSchemasAndValidity` gives each node its output schema and its errors.
- **Emitting:** `QueryEmitter` turns a valid query into the Cube IR, a host-free Pure AST (`printIR` prints it for
  debugging). The builder's `v1/` adapter writes the IR as the engine's protocol JSON. The engine's Pure text is
  never parsed back.
- **Saving:** `encodeCubeSpec` and `decodeCubeSpec` (or `serializeCubeSpec` and `parseCubeSpec`, for text) write and
  read the saved spec.
- **Node types:** `createNodeRegistry()` lists them, in palette order. The palette, the context menu and the codec
  all read it.

| Folder       | Holds                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `types/`     | `CubeType`, the registry of precise primitive types, type families, compatibility                               |
| `values/`    | literal values, read and checked per type                                                                       |
| `schema/`    | `Schema` and `SchemaColumn`, schema diffs                                                                       |
| `graph/`     | `QueryNode` and its base classes, `Connection`, `Query`, `CubeDocument`                                         |
| `inference/` | schema inference, which marks incomplete and upstream-invalid nodes; validation helpers                         |
| `nodes/`     | the node registry; `sources/` (relational table), `transforms/` (Join, Filter), Unknown                         |
| `filter/`    | the filter tree, operators by type family, helpers that build filters                                           |
| `messages/`  | the validation messages, including `ERR_INCOMPLETE` and `ERR_SCHEMAS` for incomplete and upstream-invalid nodes |
| `ir/`        | the Cube IR, an emitter per node type (`emitters/`), the debug printer                                          |
| `spec/`      | the saved-spec codec, a codec per node type (`codecs/`), migrations                                             |
| `utils/`     | assertions and JSON helpers                                                                                     |

## Saved spec

A cube is saved as JSON, format version 1 (`CURRENT_FORMAT_VERSION`): `formatVersion`, `name`, `context` (the model,
kept as given, and the runtime), `query` (`selected` and `nodes`) and `meta`. Each node has `kind`, `id`, its `inputs` (left
out for a source, which has none) and its own fields.

- Values are typed, and numbers are written as strings, so no digit is lost. A resolved source keeps a snapshot of
  its schema; an unresolved one is saved without it, and typed again when the cube is imported.
- Keys this version doesn't know are kept and written back, and a node of an unknown kind is kept as an Unknown node.
- A spec is at most 1 MiB (`MAX_SPEC_BYTES`). One saved by a newer version is read as read-only. There are no
  migrations yet (`CUBE_SPEC_MIGRATIONS`), since version 1 is the first.
- **The format is a draft** until the Cube store exists: it may still change, with migrations. In the UI, the "(dev)"
  on Export and Import marks it.

## Host-free rule

This package runs anywhere JavaScript runs: no browser, no Node and no Legend host code. In code outside tests:

- **Only relative imports.** The package has no runtime dependencies.
- **Only ECMAScript globals.** `window`, `document`, `fetch`, `console`, `setTimeout`, `structuredClone`, `URL`,
  `TextEncoder` and the like fail the build.

Four guards enforce it:

1. `package.json` declares no dependencies, and only tooling dev dependencies.
2. The `legendCubeHostFree` block of the root ESLint config forbids other imports and flags the common browser
   globals while you type.
3. `tsconfig.build.json` compiles with no ambient types (`"types": []`).
4. `src/__tests__/LegendCubeHostFree.test.ts` checks the dependencies and the imports, and compiles the package
   against the ECMAScript library alone.

Tests, test utilities and mocks (`__tests__`, `__test-utils__` and `__mocks__` folders) are exempt: they may use Node
and Jest.

Types come only from `resolveCubeType`, `PrimitiveType.get` and `new EnumType`. That keeps a planned change internal:
Cube's types are to move onto legend-graph's metamodel, and the core may then depend on legend-graph's metamodel, but
never on its `V1_*` protocol classes.

## Development

- `yarn workspace @finos/legend-cube test` runs the tests (`test:watch` to watch). They run under Node and need no
  engine.
- `yarn workspace @finos/legend-cube dev`, or `yarn dev:ts` at the root, rebuilds on change.

## Documentation

- [Adding an operation](./docs/adding-an-operation.md): the core half of a new transform. The builder half is in
  [`@finos/legend-cube-builder`](../legend-cube-builder/docs/adding-an-operation.md).
- [The plan](../../docs/wip/legend-cube/PLAN.md), which wins where it differs from
  [the spec](../../docs/design/WIP-CUBE-SPEC.md), and [the known issues](../../docs/wip/legend-cube/ISSUES.md).
