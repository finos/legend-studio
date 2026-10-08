# Adding an operation: the core half

An operation (a transform such as Sort or Limit) is a node type. In the core it is a node class, its messages, an
emitter and a codec, joined by one entry in the node registry. Nothing else in the core needs a change: the emitter and
the codec find the type through the registry, and the query graph and inference work through the node's own methods.
The UI half (a draft, an editor, help text and an icon) is in
[`@finos/legend-cube-builder`'s guide](../../legend-cube-builder/docs/adding-an-operation.md).

Join (`src/nodes/transforms/Join.ts`) and Filter (`Filter.ts`) are the examples to follow.

## 1. The node

A class in `src/nodes/transforms/<Type>.ts`, extending:

- `UnaryNode` for one input (port `tds`). Its default `schematize` returns the input schema without validating; to
  get `undefined` for an invalid node, as the contract below says, override it as Filter does
  (`this.validate(inputSchemas) ? inputSchemas[0] : undefined`).
- `BinaryNode` for two inputs, labelled Left and Right on the canvas (Join names its ports `leftTds` and `rightTds`).

It has:

- `static readonly TYPE` and `get type()`: the type, which is also the node's `kind` in a saved spec;
- `validate(inputSchemas, errors)`: calls `ensureSchemas(inputSchemas, this.ports)` first, then appends a message to
  `errors` for each problem, in a fixed order;
- `schematize(inputSchemas)`: the output schema, or `undefined` when the inputs don't validate;
- `describe()`, the one line the canvas shows, and `describeRedacted()`, the same without the values users typed,
  for logs (by default `describe()`, so override it if the node holds user values);
- `withSwappedInputs()`, for a binary node whose settings name its inputs by side.

Nodes are immutable. An edit makes a new node with the same `id` and the same `rest`, the saved keys this version
doesn't know, so a re-save writes them back.

A setting the user can clear, such as Limit's size, is a required constructor parameter typed `T | undefined`, with no
JavaScript default: a default parameter also replaces an explicit `undefined`, and a cleared field must stay cleared
(and invalid) rather than silently become the default (spec §7.7). The default lives only in the definition's
`create(id)`. A node never holds NaN or an infinity, which a saved spec can't write: the constructor refuses them, as it
refuses any setting of the wrong shape. Limit (`src/nodes/transforms/Limit.ts`, with `RowSettings.ts`) is the example.

## 2. Its messages

Every message of the spec's catalogue (§16) is already a constant in `src/messages/CubeMessages.ts`, including those
of operations not built yet (e.g. `MESSAGE_SORT_DIRECTION_EMPTY`, `MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER`): reuse
it, don't add a copy. A message the catalogue doesn't have goes in the same file with an `/** Added by Cube: <why> */`
comment, and an exact-text assertion in the 'Messages added by Cube' test of `CubeMessages.test.ts`.

## 3. Its emitter

A function in `src/ir/emitters/<Type>Emitter.ts` that builds the node's relation expression from its inputs', in port
order: `(node, inputs, context) => RelationExpr`. It only runs on a valid node.

Give every part it emits an origin, `originOf(node.id, EmitRole.…)`, so an engine error lands on the node: a part with
none takes its nearest ancestor's, a downstream node's. Add an `EmitRole` for a new kind of part; a role never
contains `:`.

## 4. Its codec

A `NodeSpecCodec` in `src/spec/codecs/<Type>Codec.ts`:

- `keys`: the node's own keys, in the order they are written (`kind`, `id` and `inputs` are the codec's);
- `encode(node)`: those fields, leaving out absent ones;
- `decode(id, json, path, rest)`: the node. Throw `CubeSpecDecodeError` for a malformed field, and
  `UnreadableContent` for a value this version can't read, which keeps the node as an Unknown node.

Literal values typed by a column are `{kind, value}`, with numbers as strings. A node's own settings, such as a size,
are JSON numbers, read with `readOptionalFiniteNumber`, which keeps any finite number for validation to judge. A
setting is written whenever the node has one, its default included, and left out only when cleared, never written as
`null`: so a cleared setting reads back cleared, and the editor panel, which compares encodings, counts clearing a
default as an edit (PLAN §11.4).

After an import types the sources again, only Filter's invalid values are read again (`rereadQueryFilterValues` in
`src/filter/QueryFilterValues.ts`). An operation that holds values typed by a column needs its own case there.

## 5. Its definition

A `TransformDefinition` in `src/nodes/NodeRegistry.ts`: `kind: 'transform'`, `type`, `label` (the palette's text),
`icon` (an icon name the builder maps), `beta`, `create(id)` (a new node with default settings), `emit` and `spec`.
Add it to `createNodeRegistry()` in menu order, and export the new modules from `src/index.ts`.

## Tests

- Unit tests in `src/nodes/transforms/__tests__`, `src/ir/__tests__` and `src/spec/__tests__`, as Join's and
  Filter's are:
  - validation with the exact messages, the output schema, `describe`, and `describeRedacted` (no value a user typed);
  - the emitted IR, compared as `printIR` text, and its origins: `printIR` ignores them, so pin them with
    `listOrigins` (`src/__test-utils__/CubeIRTestUtils.ts`) and check that none is unmarked (`@-`);
  - the codec's round trip, `rest` included; a case in `CubeSpecDecodeErrors.test.ts` for each malformed field it
    rejects; and, if it throws `UnreadableContent`, a case in `CubeSpecForwardCompatibility.test.ts` showing the node
    kept as an Unknown node.
- Some tests pin lists to update: the registry's transforms in `src/nodes/__tests__/Nodes.test.ts` (in the spec's
  menu order), and, for a new `EmitRole`, the roles in `src/ir/__tests__/QueryEmitter.test.ts` ('Names each part of a
  node with a distinct role, without a colon').
- The saved-spec suites each get the new kind: a baseline in 'Reads %s, which the failing cases start from' and a
  'Refuses %s' case per malformed field (`CubeSpecDecodeErrors.test.ts`), an encoding block, its rest written from the
  node and not from `rest` (`CubeSpecEncode.test.ts`), invalid settings reported through inference (`CONNECTED` in
  `CubeSpecValidity.test.ts`), and, in `CubeSpecForwardCompatibility.test.ts`, a registry without the new kind reading it
  as an Unknown node and re-saving it verbatim, with its unknown keys kept through edits.
- Add the operation to the shared sample `src/spec/__tests__/fixtures/operations.cube.json`, or add a saved spec of
  its own there (`*.cube.json`; `slice.cube.json` is taken) and list it in `src/spec/__tests__/CubeSpecCorpus.test.ts`
  (`INVALID_NODES`, with the nodes it expects invalid). That test re-saves
  every file and checks the text comes out the same. Give it the Cube Northwind model and runtime exactly, as the
  other samples have (start from `slice.cube.json`): the builder's `CubeSpecCorpus` engine test requires them, loads
  the model on the engine, and checks each file's table snapshots against it; a new file raises its 'Has the samples'
  count. The operation's own lambda is checked on the engine by a builder test (see its guide).

No change is needed in the builder's `v1/` adapter while the emitter uses only IR and literal kinds the adapter
already writes. A new kind of IR node or literal needs its own case there.
