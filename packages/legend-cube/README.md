# @finos/legend-cube

The host-free core of Legend Cube, a canvas-based visual query builder (not Legend DataCube, which is
`@finos/legend-data-cube`). It holds the domain model: precise types and values, schemas, the query graph with its
schema inference and validation, the transforms, filters, the Cube IR and its emitter, and the saved-spec codec.

The UI, the stores and the Legend engine adapter live in [`@finos/legend-cube-builder`](../legend-cube-builder).

**Status:** work in progress, version 0.0.x. It has relational tables, data product access points and ingest data sets (both beta), Join, Sort, Group (with its aggregations), Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Difference, Partition (window functions) and Extend (computed columns, typed by the engine). The API is not
stable before 1.0: `src/index.ts` re-exports whole modules.

## How it fits together

- **The query graph is the only source of truth.** A `CubeDocument` holds the context (the model and the runtime), an
  immutable `Query` of `QueryNode`s and `Connection`s, and presentation settings. Every edit makes a new `Query`.
- **Inference:** `buildSchemasAndValidity` gives each node its output schema and its errors.
- **Emitting:** `QueryEmitter` turns a valid query into the Cube IR, a host-free Pure AST (`printIR` prints it for
  debugging). A Sort's order is written where it is used: before a Limit, Drop or Slice, and before the run's row
  limit. The builder's `v1/` adapter writes the IR as the engine's protocol JSON. The engine's Pure text is
  never parsed back.
- **Saving:** `encodeCubeSpec` and `decodeCubeSpec` (or `serializeCubeSpec` and `parseCubeSpec`, for text) write and
  read the saved spec.
- **Node types:** `createNodeRegistry()` lists them, in palette order. The palette, the context menu and the codec
  all read it.

| Folder       | Holds                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/`     | `CubeType`, the registry of precise primitive types, type families, compatibility                                                                                                                                                                                                                                                                                                       |
| `values/`    | literal values, read and checked per type                                                                                                                                                                                                                                                                                                                                               |
| `schema/`    | `Schema` and `SchemaColumn`, schema diffs                                                                                                                                                                                                                                                                                                                                               |
| `graph/`     | `QueryNode` and its base classes, `Connection`, `Query`, `CubeDocument`                                                                                                                                                                                                                                                                                                                 |
| `inference/` | schema inference, which marks incomplete and upstream-invalid nodes; validation helpers; the rows' order through the graph (`RowOrder.ts`)                                                                                                                                                                                                                                              |
| `nodes/`     | the node registry; `sources/` (relational table, data product access point, ingest data set, and the one-kind rule), `transforms/` (Join, Sort, Group and its aggregations, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Difference, Partition and its window functions, Extend and its typing, the row settings they share, the Join and Concat autofixes), Unknown |
| `filter/`    | the filter tree, operators by type family, helpers that build filters                                                                                                                                                                                                                                                                                                                   |
| `messages/`  | the validation messages, including `ERR_INCOMPLETE` and `ERR_SCHEMAS` for incomplete and upstream-invalid nodes                                                                                                                                                                                                                                                                         |
| `ir/`        | the Cube IR, an emitter per node type (`emitters/`), the query emitter that isolates windows with lets, the debug printer                                                                                                                                                                                                                                                               |
| `spec/`      | the saved-spec codec, a codec per node type (`codecs/`), migrations                                                                                                                                                                                                                                                                                                                     |
| `utils/`     | assertions and JSON helpers                                                                                                                                                                                                                                                                                                                                                             |

## Saved spec

A cube is saved as JSON, format version 1 (`CURRENT_FORMAT_VERSION`): `formatVersion`, `name`, `context` (the model,
kept as given, and the runtime), `query` (`selected` and `nodes`) and `meta`. Each node has `kind`, `id`, its `inputs` (left
out for a source, which has none) and its own fields.

- Literal values are typed, with numbers written as strings, so no digit is lost; a node's settings, such as a
  Limit's size, are JSON numbers. A resolved source keeps a snapshot of
  its schema; an unresolved one is saved without it, and typed again when the cube is imported.
- Keys this version doesn't know are kept and written back, and a node of an unknown kind is kept as an Unknown node.
- A spec is at most 1 MiB (`MAX_SPEC_BYTES`). One saved by a newer version is read as read-only. There are no
  migrations yet (`CUBE_SPEC_MIGRATIONS`), since version 1 is the first.
- **The format is a draft** until the Cube store exists: it may still change, with migrations.

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
