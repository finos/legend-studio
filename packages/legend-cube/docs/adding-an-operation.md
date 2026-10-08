# Adding an operation: the core half

An operation (a transform such as Sort or Limit) is a node type. In the core it is five pieces, joined by one entry in
the node registry; the query graph, inference, the emitter and the codec find it through the registry and need no
change. The UI half (a draft, an editor, help text and an icon) is in
[`@finos/legend-cube-builder`'s guide](../../legend-cube-builder/docs/adding-an-operation.md).

Join (`src/nodes/transforms/Join.ts`) and Filter (`Filter.ts`) are the examples to follow.

## 1. The node

A class in `src/nodes/transforms/<Type>.ts`, extending:

- `UnaryNode` for one input (port `tds`); by default its output schema is its input's;
- `BinaryNode` for two inputs, labelled Left and Right on the canvas (Join names its ports `leftTds` and `rightTds`).

It has:

- `static readonly TYPE` and `get type()`: the type, which is also the node's `kind` in a saved spec;
- `validate(inputSchemas, errors)`: appends a message to `errors` for each problem, in a fixed order;
- `schematize(inputSchemas)`: the output schema, or `undefined` when the inputs don't validate;
- `describe()`, the one line the canvas shows, and `describeRedacted()`, the same without the values users typed,
  for logs (by default `describe()`, so override it if the node holds user values);
- `withSwappedInputs()`, for a binary node whose settings name its inputs by side.

Nodes are immutable. An edit makes a new node with the same `id` and the same `rest`, the saved keys this version
doesn't know, so a re-save writes them back.

## 2. Its messages

In `src/messages/CubeMessages.ts`. Use the spec's message catalogue (§16) word for word where it has the message:
`CubeMessages.test.ts` compares the constants with the spec's text.

## 3. Its emitter

A function in `src/ir/emitters/<Type>Emitter.ts` that builds the node's relation expression from its inputs', in port
order: `(node, inputs, context) => RelationExpr`. It only runs on a valid node.

Give every part it emits an origin, `originOf(node.id, EmitRole.…)`, so an engine error lands on the node. Add an
`EmitRole` for a new kind of part; a role never contains `:`.

## 4. Its codec

A `NodeSpecCodec` in `src/spec/codecs/<Type>Codec.ts`:

- `keys`: the node's own keys, in the order they are written (`kind`, `id` and `inputs` are the codec's);
- `encode(node)`: those fields, leaving out absent ones;
- `decode(id, json, path, rest)`: the node. Throw `CubeSpecDecodeError` for a malformed field, and
  `UnreadableContent` for a value this version can't read, which keeps the node as an Unknown node.

Values are typed, and numbers are written as strings.

## 5. Its definition

A `TransformDefinition` in `src/nodes/NodeRegistry.ts`: `kind: 'transform'`, `type`, `label` (the palette's text),
`icon` (an icon name the builder maps), `beta`, `create(id)` (a new node with default settings), `emit` and `spec`.
Add it to `createNodeRegistry()` in menu order, and export the new modules from `src/index.ts`.

## Tests

- Unit tests in `src/nodes/transforms/__tests__`, `src/ir/__tests__` and `src/spec/__tests__`, as Join's and
  Filter's are: validation with the exact messages, the output schema, `describe`, the emitted IR (compared as
  `printIR` text) and the codec's round trip, `rest` included.
- `src/nodes/__tests__/Nodes.test.ts` pins the registry's list of transforms: add the new one.
- Add a saved spec using the operation to `src/spec/__tests__/fixtures/` (`*.cube.json`), and list it in
  `src/spec/__tests__/CubeSpecCorpus.test.ts` (`INVALID_NODES`, with the nodes it expects invalid). That test re-saves
  every file and checks the text comes out the same. The builder's `CubeSpecCorpus` engine test checks each file's
  model, runtime and table snapshots against the engine; the operation's own lambda is checked on the engine by a
  builder test (see its guide).

No change is needed in the builder's `v1/` adapter while the emitter uses only IR and literal kinds the adapter
already writes. A new kind of IR node or literal needs its own case there.
