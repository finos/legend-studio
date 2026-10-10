# Adding an operation: the core half

An operation (a transform such as Sort or Limit) is a node type. In the core it is a node class, its messages, an
emitter and a codec, joined by one entry in the node registry. Nothing else in the core needs a change: the emitter and
the codec find the type through the registry, and the query graph and inference work through the node's own methods.
The UI half (a draft, an editor, help text and an icon) is in
[`@finos/legend-cube-builder`'s guide](../../legend-cube-builder/docs/adding-an-operation.md).

Join (`src/nodes/transforms/Join.ts`) and Filter (`Filter.ts`) are the examples to follow; Group (`Group.ts`) for a
node whose settings are rows, Concat (`Concat.ts`) for a plain two-input node with a setting that changes its
output types, Partition (`Partition.ts`) for a window, which a run must isolate from what follows it, Difference
(`Difference.ts`) for a node built from another's parts (Join's key checks and join relation), and Extend
(`Extend.ts`) for a node whose output types only the engine knows.

## 1. The node

A class in `src/nodes/transforms/<Type>.ts`, extending:

- `UnaryNode` for one input (port `tds`). Its default `schematize` returns the input schema without validating; to
  get `undefined` for an invalid node, as the contract below says, override it as Filter does
  (`this.validate(inputSchemas) ? inputSchemas[0] : undefined`).
- `BinaryNode` for two inputs, on ports `tds1` and `tds2` unless it names its own (Join's are `leftTds` and
  `rightTds`), labelled Left and Right on the canvas unless it overrides `portLabels` (Concat's are First and Second,
  `CONCAT_PORT_LABELS`); its messages and editor then name the inputs the same way ("the first input").

It has:

- `static readonly TYPE` and `get type()`: the type, which is also the node's `kind` in a saved spec;
- `validate(inputSchemas, errors)`: calls `ensureSchemas(inputSchemas, this.ports)` first, then appends a message to
  `errors` for each problem, in a fixed order;
- `schematize(inputSchemas)`: the output schema, or `undefined` when the inputs don't validate;
- `describe()`, the one line the canvas shows, and `describeRedacted()`, the same without the values users typed,
  for logs (by default `describe()`, so override it if the node holds user values);
- `withSwappedInputs()`, for a binary node whose settings name its inputs by side;
- `outputOrder(inputOrders)`, the order its rows come in, for `computeRowOrders` (`src/inference/RowOrder.ts`). By
  default none, as from a source or a join. A node that keeps its input's rows in order returns `keepInputOrder`
  (Filter, Distinct, Partition, which keeps every row and column); one that drops or renames columns maps the order (Restrict keeps the keys before the first one
  it drops, Rename renames them); Sort puts its own keys first;
- `consumesInputOrder`, true for a node that takes rows by their order (Limit, Drop, Slice): its emitter then sorts its
  input first (see 3).
  `findLostSortOrders` reads the same hooks to warn on a Sort whose order a node loses before it is used, so a node
  that drops columns or reorders rows must say so here, or the warning and the SQL disagree.

Nodes are immutable. An edit makes a new node with the same `id` and the same `rest`, the saved keys this version
doesn't know, so a re-save writes them back.

A setting the user can clear, such as Limit's size, is a required constructor parameter typed `T | undefined`, with no
JavaScript default: a default parameter also replaces an explicit `undefined`, and a cleared field must stay cleared
(and invalid) rather than silently become the default (spec §7.7). The default lives only in the definition's
`create(id)`. A node never holds NaN or an infinity, which a saved spec can't write: the constructor refuses them, as it
refuses any setting of the wrong shape. Limit (`src/nodes/transforms/Limit.ts`, with `RowSettings.ts`) is the example.

An operation that gives a column a name, as Rename does, checks it with `isValidColumnName`
(`src/schema/ColumnName.ts`: not empty, no space at either end, no `"`, no `\`, no control character, at most 128
code points) and refuses a name a column of its output already has (`MESSAGE_ALREADY_IN_INPUT_SCHEMA`). Export the
check of one item, as `validateRenameMapping` is, so an editor can mark each row with the node's own messages.

A helper that changes several nodes at once, as the Join autofix does (`src/nodes/transforms/JoinAutofix.ts`), lives
next to its node, not on `Query`, and composes Query operations into one returned query: generate each new id from the
query that already holds the previous new node (`generateId` twice on the same query gives the same id), and restore
the selection if an `add` moved it. The caller applies the result as one undo step. Write it as a plan, a `can…` and a
fix, each taking the input schemas from the caller, so an editor can ask about the node with its edits applied. Offer
a fix only when the node is valid after it: build the node it adds, check it with that node's own `validate` and
`schematize`, then check the fixed node with its own settings (`ConcatAutofix.ts` does, for a Rename or a Restrict
before one of Concat's inputs).

A setting that changes the output's types, as Concat's Convert types does (`widenTypes`), is passed to the shared
validation (`validateConcatSchemas(first, second, errors, widenTypes)`), so the editor, the autofixes and inference
judge the node the same way.

A node built on another's semantics reuses its parts rather than copying them: Difference checks its keys with
Join's `validateJoinKeys` and emits its join with `emitJoinRelation` (the join before its `select`), so a fix to
either reaches both.

A node whose rows hold aggregations, as Group and Partition do, judges each row with `validateColumnAggregation`
(`src/nodes/transforms/Aggregation.ts`) and an `AggregationUse`: a Group's (`GROUP_AGGREGATION_USE`), or a window's,
which also knows the rank functions (`WindowRankFunction`) and whether the window sorts its rows, which they need. The
known-function check, the auto-name, the result type and the nullability all take the use, so a function one node
offers stays unknown in the other (a Group's Rank, PLAN §11.5, Q4).

### A node the engine types

Extend's output types are its expressions' (PLAN §11.7), which only the engine can type, against the cube's model.
The core stays host-free, so the node holds the answer: a typing (`unresolved`, `typed` with a type per column, or
`failed` with the engine's message and the column it names) for a signature, a digest of its input's columns and
its own settings (`getExtendSignature`, over `stableJsonText` and `hashText` in `src/utils/Json.ts`). A typing whose
signature isn't the current one reads as `unresolved`, and an unresolved node fails validation with `ERR_TYPING`
only, which `isTypingError` tells apart: the UI shows the node pending, not invalid, and the builder types it in the
background (its guide). `schematize` reads the types from the typing. Save the last good typing with the node, so a
loaded cube has its schema at once, but never a failure, which is typed again.

The expression itself is the engine's JSON for its text, without source information, its number literals as their
digit strings (a saved spec is read with `JSON.parse`), and the text as the user typed it, so the cube shows it
without an engine call. It is emitted as the IR `lambdaJson`, whose serializer writes the numbers digit for digit and
stamps the origin on every value specification.

## 2. Its messages

Every message of the spec's catalogue (§16) is already a constant in `src/messages/CubeMessages.ts`, including those
of operations not built yet (e.g. `MESSAGE_AGGREGATION_FUNCTION_EMPTY`): reuse it, don't add a copy. A few stay
unreachable (`MESSAGE_SORT_DIRECTION_EMPTY`: Cube's directions are an enum the codec checks). A message the catalogue doesn't have goes in the same file with an `/** Added by Cube: <why> */`
comment, and an exact-text assertion in the 'Messages added by Cube' test of `CubeMessages.test.ts`.

## 3. Its emitter

A function in `src/ir/emitters/<Type>Emitter.ts` that builds the node's relation expression from its inputs', in port
order: `(node, inputs, context) => RelationExpr`. It only runs on a valid node.

Give every part it emits an origin, `originOf(node.id, EmitRole.…)`, so an engine error lands on the node: a part with
none takes its nearest ancestor's, a downstream node's. Add an `EmitRole` for a new kind of part; a role never
contains `:`.

Row order (PLAN §11.4): a Sort emits nothing where it stands. When the relation is emitted to run
(`emitRelation(id, { withRowOrder: true })`, as `emitExecutionLambda` does), a node with `consumesInputOrder` gets its
input's order as `context.inputOrder`, and its emitter wraps its input with `emitSortedInput(node, input, context)`
(`src/ir/emitters/SortEmitter.ts`), as Limit's does; the run sorts by the capture node's order before its row limit.
Typing lambdas carry no sort. A direct call with no context, as in an emitter's own tests, sorts nothing.

Databases (PLAN §11.4): a run is written for the database it runs on, `context.databaseType` (the engine's
`DatabaseType` name, e.g. `SqlServer`), which only runs get. An operation that some database rejects in its native form
gets a flag in `CUBE_DIALECT_WORKAROUNDS` (`src/ir/CubeDialects.ts`, a `Map`: the type comes from the model) and reads
`getDialectWorkarounds(context.databaseType)` in its emitter, as Drop, Slice, Limit and Distinct do; add its type to
`needsDatabaseType` too, so the builder loads the model's connections before such a run. Without a type, or for an
unknown one, write the native form. A column an emitter adds and drops again takes `getTemporaryColumnName`
(`src/ir/TemporaryColumns.ts`), so it never takes an input column's name; several at once take one name after another
under the same rule (names compared folded), as Concat's `cube_cast`, `cube_cast2`, … do. A type the output must have
that its input hasn't is a type-only `cast(@<T>)` in an `extend`, which the engine writes as no SQL cast; never a
relation-level cast, which the engine doesn't check (`ConcatEmitter.ts`).

Windows (PLAN §8.6, §11.6): a later filter can run before a window and change its numbers (France's count came back 2
instead of 77), so a definition that emits one sets `isolationBoundary: true`. A run then binds the node with a `let`
whenever it isn't the capture (`QueryEmitter`, after the lets it reads, named `n_<id>` or `n_<k>`), and the run lambda
becomes `{| {| <lets>; <relation>}->from(runtime)->sort(<capture order>)->limit(n + 1)}`: the capture's sort and
limit go after `from()`, where every database keeps them at the root. Typing lambdas stay plain chains: the engine
types both forms the same. Write window functions in the array form (`~[…]`, never a single column spec), the
aggregates and the rank functions in separate `extend`s (one holding both fails on the engine), and counts as `size()`
(`count()` loses its OVER clause). The engine nests one subselect per window column, so a wide window makes deep SQL.

## 4. Its codec

A `NodeSpecCodec` in `src/spec/codecs/<Type>Codec.ts`:

- `keys`: the node's own keys, in the order they are written (`kind`, `id` and `inputs` are the codec's);
- `encode(node)`: those fields, leaving out absent ones;
- `decode(id, json, path, rest)`: the node. Throw `CubeSpecDecodeError` for a malformed field, and
  `UnreadableContent` for a value this version can't read, which keeps the node as an Unknown node. Read every entry
  of every list before throwing `UnreadableContent`, so a malformed later entry is still a decode error: the shared
  readers return the entries and the reason (`ReadEntries`), as `readSortKeys` (`SortCodec.ts`) and
  `readColumnAggregations` (`GroupCodec.ts`) do for Sort, Group and Partition.

Literal values typed by a column are `{kind, value}`, with numbers as strings. A node's own settings, such as a size,
are JSON numbers, read with `readOptionalFiniteNumber`, which keeps any finite number for validation to judge. A
setting is written whenever the node has one, its default included, and left out only when cleared, never written as
`null`: so a cleared setting reads back cleared, and the editor panel, which compares encodings, counts clearing a
default as an edit (PLAN §11.4). A true-or-false setting, such as Concat's `widenTypes`, is always written, `false`
included: a missing key is a `CubeSpecDecodeError`, and a value that isn't a boolean is `UnreadableContent`.

After an import types the sources again, only Filter's invalid values are read again (`rereadQueryFilterValues` in
`src/filter/QueryFilterValues.ts`). An operation that holds values typed by a column needs its own case there.

## 5. Its definition

A `TransformDefinition` in `src/nodes/NodeRegistry.ts`: `kind: 'transform'`, `type`, `label` (the palette's text),
`icon` (an icon name the builder maps), `beta`, `create(id)` (a new node with default settings), `emit` and `spec`,
and `isolationBoundary` for a window (see 3). Add it to `createNodeRegistry()` in menu order (Sort, Group, Filter,
Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Join, Difference, Partition, Extend; spec §7.0), and export
the new modules from `src/index.ts`.

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
  menu order, and the isolation boundaries), and, for a new `EmitRole`, the roles in
  `src/ir/__tests__/QueryEmitter.test.ts` ('Names each part of a node with a distinct role, without a colon').
- A node the engine types is tested with typings built in the test (`getExtendSignature` for the input), as
  `Extend.test.ts` does: pending until typed, pending again once the input or a setting changes, the engine's
  failure on its column, and a type that isn't a primitive or an enumeration refused.
- A window's lets are tested with a test-only window node in `src/ir/__tests__/QueryEmitterIsolation.test.ts`, and
  Partition's own in `PartitionEmitter.test.ts`: a Partition at the capture binds nothing, one followed by a node is
  bound, and the capture's sort comes after `from()`.
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
  count. The operation's own lambda is checked on the engine by a builder test (see its guide), and every registered
  type needs a case in the builder's conformance suite, which types each node on the engine.

No change is needed in the builder's `v1/` adapter while the emitter uses only IR and literal kinds the adapter
already writes. A new kind of IR node or literal needs its own case there.
