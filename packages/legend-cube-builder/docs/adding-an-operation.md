# Adding an operation: the builder half

Start with the core half, in [`@finos/legend-cube`'s guide](../../legend-cube/docs/adding-an-operation.md): the
node, its messages, emitter and codec, and its entry in the node registry. The palette, the context menu and the
canvas read that registry, so the new type shows there with no change here.

The builder adds four pieces: a draft, an editor and help text, in registries keyed by node type, and an icon, keyed by
the icon name the node's definition gives. Join and Filter are the examples to follow; Group for an editor of rows
(`CubeGroupEditor`, `CubeGroupDraft`), Concat for a two-input editor with fixes and one setting
(`CubeConcatEditor`, `CubeConcatDraft`), Partition for an editor made of the shared rows
(`CubePartitionEditor`, `CubePartitionDraft`), Difference for a two-input editor sharing Join's key rows
(`CubeDifferenceEditor`, `CubeDifferenceDraft`), and Extend for an editor that asks the engine before Apply
(`CubeExtendEditor`, `CubeExtendDraft`).

## 1. A draft

The node editor floats below its node (PLAN §11.8) and never edits the document: an editor edits a draft, and the
editor's **Apply**, or closing it any way but **Cancel**, stores the draft's node as one undo step (**Cancel** drops
it).

- In `src/stores/editors/Cube<Type>Draft.ts`, extend `CubeNodeDraft<Type>`: observable fields for the settings being
  edited, actions that change them, and `build()`. `build()` returns `original` itself while nothing was edited, and
  otherwise a new node with the same id and `rest`. The panel also treats a node that saves the same as `original`
  as no change.
- Register a factory in `CUBE_NODE_DRAFT_FACTORIES` (`src/stores/editors/CubeNodeDraftRegistry.ts`); it gets the
  editor state too, for a draft that needs the engine.
- A draft that must ask the engine before its node can be stored, as Extend's Validate does, says why in
  `applyDisabledReason`: the panel then disables Apply with that reason as its title, and shows it in place of the
  Problems list until it is `undefined`. Its engine work is a MobX `flow` on the draft; the node it builds then holds
  the engine's answer (Extend's lambdas and typing), so it needs no more engine work once applied. While the reason
  is set, Apply refuses the draft, and closing the panel or opening another node keeps it open with a notice
  (`getEditorKeptOpenNotice`) rather than storing or dropping the edits.
- A draft whose node the cube may replace underneath it with one that differs in nothing it edits, such as an Extend
  typed in the background, overrides `follow(node)` to go on from the new node, keeping its rows; by default the panel
  drops the edits with a notice (`CubeNodeEditorState.sync`).
- A transform with nothing to set, such as Distinct, has no draft: it registers an editor that only describes it
  (`CubeDistinctEditor`) and is listed in `CUBE_NODE_TYPES_WITHOUT_SETTINGS`, which the registry test skips when it
  asks for a factory. The panel then shows no Apply or Cancel, and no Problems list (PLAN §7.4 item 2): every
  transform that can be invalid has a draft. When such a transform gains a setting, as Concat did with Convert types,
  give it a draft and take it off the list.

## 2. An editor

- In `src/components/editors/Cube<Type>Editor.tsx`, an `observer` component taking `CubeNodeEditorProps`:
  `editorState`, `draft`, `inputSchemas` (the inputs' schemas in port order; the panel shows the editor only once all
  are there) and `readOnly` (a cube saved by a newer version: show, don't edit).
- It changes only the draft. An action on the document, such as Join's Swap Inputs, goes through
  `editorState.nodeEditor`, which applies the draft first. A fix that adds nodes, as Join's "Rename them" and Concat's
  "Rename them" and "Drop them" do, is a `can…` getter and an action there, made from the core's fix on the query with
  the draft applied (`queryWithEdits`), as one undo step, the panel staying on the node. The editor shows the fix's
  changes from the core's plan, given the draft's settings, so the editor and the store agree on what it offers.
- `CubeColumnPicker` picks a column from a schema, and `CubeValueEditor` takes a value as a column's type wants it.
- Join's key-pair rows are shared with Difference (`CubeJoinKeyRows`, over a `CubeJoinKeysDraft` from
  `CubeJoinKeyPairs.ts`); `CubeColumnChecklist` takes a reason per column (`unpickableReason`), as Difference's
  difference columns do.
- A code editor is legend-lego's `CodeEditor` (language `pure`), with the error it should underline built from the
  engine's location (`CubeEngineError.location`, as a legend-graph `CompilationError` with its `SourceInformation`),
  as `CubeExtendEditor` does. Parse a text under a source id that names the row, so a parse error, and a typing error
  on the text just parsed, point back to it. A stored lambda has no locations, and a plan has none either: the
  Extend draft finds the row of a plan error by planning the columns' prefixes.
- Rows that Group, Sort and Partition share: `CubeAggregationRowEditor` (column, function and output name, given its
  function list, the `AggregationUse` and what a function that takes no column shows in the column's place),
  `CubeSortRowEditor` (column, direction, move and remove; `getSortRowProblems`, `getTakenSortColumns`) and
  `CubeColumnChecklist` (the input's columns, ticked, those that can't be compared shown but not tickable), with their
  drafts' helpers in `CubeAggregationRows.ts` and `CubeSortRows.ts`. They are driven by callbacks, so a new editor
  wires them to its own draft. Judge a row with the node Apply would store (`draft.build()`), as the Partition editor
  does, so the row and the panel's Problems list agree.
  `isColumnDisabled` gives the reason a column can't be picked, shown after its type, as Sort does for a type that can't
  be sorted (`isSortableType`) and a column another row has; the column stays shown.
- A whole-number setting (a size, a row index) is a `CubeIntegerField` over text the draft keeps as typed, read with
  `parseWholeNumberText` (`src/stores/editors/CubeIntegerText.ts`): an optional sign and digits, nothing else, and empty
  text gives `undefined`, which the node reports. Never `Number()` the raw text (it reads `''` as 0, `0x10` as 16 and
  `1e3` as 1000) and never fall back to a default. `CubeRowCountDraft` and `CubeRowCountEditor` (Limit's) are the
  example.
- Give each control a stable `aria-label` (numbered per row in a list, e.g. `Sort column 2`): the tests and the
  browser rehearsal find controls by it.
- The editor shows in the floating node editor (PLAN §11.8): 432px wide, its body between 80px and a third of the
  window, which scrolls. Fit that width (wrap long names with `break-words` or `break-all`), and give no list a
  height cap or a scroller of its own: the body is the one scroller. Column and direction pickers stay native
  `<select>` elements, as `CubeColumnPicker` is, and no editor measures the editor or reads its size.
- Text a field stores on blur is kept when the editor closes: the editor's blur runs first. Text an editor keeps in
  React state can register with `nodeEditor.addFlusher` to be applied on close, as the data product warehouse does.
- A dropdown, picker or dialog opened from an editor and shown elsewhere (a portal) must be one of MUI's layers, or
  hold the editor open with `nodeEditor.holdOpen()` while it is open: otherwise a press in it closes the editor.
- A Tailwind class no other file uses yet, such as an arbitrary `grid-cols-[…]`, does nothing in the dev server until
  the deployment's Tailwind build runs again ([hosting.md](./hosting.md)); jsdom tests don't see it either way, so
  check a new layout in the browser.
- Register it in `CUBE_NODE_EDITORS` (`src/components/editors/CubeNodeEditorRegistry.ts`).

## 3. Help text

An entry in `CUBE_NODE_HELP_TEXT` (`src/__lib__/LegendCubeHelpText.ts`), shown in the panel's header. Use the spec's
text (§17.9) where it has one.

## 4. An icon

Map the icon name of the node's definition to a legend-art icon in `NODE_ICONS` (`src/components/CubeNodeIcon.tsx`).

## A node the engine types

Extend's types come from the engine (the core guide). `CubeEditorState` types every Extend that waits on `ERR_TYPING`
through a reaction (`extendsToType`, `retypeExtends`), in one `typeLambdas` call, outside the undo history: the
answer replaces the very nodes sent, in the cube shown and in the undo snapshots that give the engine the same input
(`replaceOutsideHistory` takes a predicate per snapshot), and an answer for a node changed meanwhile is dropped. Each
node is typed as a chain after its input's relation, one chain per first k columns (`src/stores/CubeExtendTyping.ts`),
so a failure names its column.

A chain's types depend on what the engine sees of the input, which Cube's schema doesn't fully show (an Extend's
columns are nullable to Cube, `[1]` to the engine after `toOne()`). So each typing records `upstream`, a digest of the
input's emitted relation and the model (`getCubeExtendUpstream`), and the editor adds its own query rule to
`analysis` (`createStaleCubeExtendTypingRule`): an Extend whose digest differs waits on `ERR_TYPING` and is typed
again. Execute reads that validity as well as the emitter's `canEmit`, since the emitter doesn't know the rule. The
digest covers the whole relation, filter values included, so any edit above an Extend has it typed again. A typing
without a digest, as one loaded, is used as it is; on import every Extend is typed once more, as sources are checked
again, which records one. When the engine can't be reached, a typing still current for its input is kept, with a
warning. Every way out of `retypeExtends` leaves the node not stale, or the reaction would loop.

The canvas shows a waiting node as resolving (`isTypingNode`), the header says so, and the panel leaves `ERR_TYPING`
out of its problems. A new node type the engine types needs the same: today the reaction, the rule and the typing
are Extend's.

## Warnings

A warning is never an error: it doesn't make the node invalid or keep Execute from running. A warning worked out from
the query, as the Sort warning is (`findLostSortOrders` in the core), goes in `CubeEditorState.derivedWarnings`, by
node id, so it follows every edit and undo and is never stored; one about the outside world, such as a table that
changed, is stored in `CubeEditorState.warnings`, by node key. `getNodeWarnings(node)` gives both: the canvas marks the
node (`legend-cube__node--warning`) and lists them in its tooltip after its errors, and the panel shows each one as a
`role="status"` line above the editor. A derived warning waits until the nodes it names have no errors of their own.

Some warnings belong to one control, not to the node, and the editor shows them under it in the warning colour: Join's
'type unknown' on a key whose column the model can't type, Concat's on any such column, and the Join and Filter
editors' warning on a Date that Convert types made from dates and timestamps (`isDateOrTimestampType`), whose dates
match timestamps only at midnight. An editor must not offer a change it warns about, as Concat's never offers Convert
types for a column whose real type Cube doesn't know.

## Columns that change name

The Join editor warns when a join key's column has no type in the model, tracing the column back to its table and the
table's own name for it with `findColumnOrigins` (`src/stores/editors/CubeJoinDraft.ts`). It requires each node's
output to have the column, maps a Rename's new name back to its old one, and follows a Join's same-named keys to the
side the join keeps. A Group's keys and its Distinct Value, Min and Max outputs map back to their columns, and its
counts, sums and averages to none, as a Partition's window functions do, its input columns passing through; a
Concat's columns come from both inputs under the same name. Every other node is
taken to pass its input's columns through under the same name: an Extend's input columns do, and its new columns,
which the input lacks, come from none. A Difference's `x_1` and `x_2` come from `x` on their side, its difference
from none. If a new transform's output columns aren't its inputs'
under the same name (a computed column, say), teach `findColumnOrigins` how they map back, or the warning goes missing
or shows on the wrong column.

## Tests

- `src/components/editors/__tests__/CubeNodeEditorRegistry.test.ts` fails for a type missing a piece: it checks every
  registered type for help text, an icon and an editor, and that each transform's draft gives back its node until
  edited. Add the new help text to its exact list.
- Add the new item, in the spec's menu order, to the lists in `src/components/palette/__tests__/CubePalette.test.tsx`
  and to `TRANSFORMS` in `src/components/canvas/__tests__/CubeCanvasContextMenu.test.tsx`.
- A draft test (`src/stores/editors/__tests__/`) and an editor test (`src/components/editors/__tests__/`), as Join's
  and Filter's are.
- An engine test of the operation in `src/__tests__/LegendCubeOperations.engine-roundtrip-test.ts` (see
  [Testing](./testing.md)): its lambda as the engine parses the printed Pure, its typing against Cube's inferred
  schema, and what it returns, not its text.
- A case of the new node type in `src/__tests__/CubeInferenceConformance.engine-roundtrip-test.ts`, whose coverage
  test fails until there is one: the engine must type every node of the case as Cube infers it.
- If its SQL can differ by database, its shapes at the end of `SHAPES` in
  `src/__tests__/LegendCubeDialects.engine-roundtrip-test.ts` (earlier tests index the first ones by position), so the
  checks every shape gets cover it, and a test of the facts its plans must keep on every database type. A shape some
  database types can't plan at all goes in a list of its own over the types that can: windows are in
  `WINDOW_SHAPES`, over `WINDOW_DATABASE_TYPES` (Spanner, Presto and Composite refuse any window), with the refusal
  pinned.

- A draft that waits for the engine is tested against the fake engine's mocks (`parseExpression`, `typeLambdas`,
  `planLambda` in `FakeCubeEngine`), and an editor that changes a draft from the test wraps the change in `act`. An
  editor with a code editor needs `MockedMonacoEditorInstance.getValue.mockReturnValue('')` before it renders: the
  mocked editor holds no text of its own.

The `v1/` adapter (`V1_CubeLambdaSerializer`) needs no change while the operation's emitter uses only IR and literal
kinds it already writes. A new kind of IR node or literal needs its own case there, with a test in
`src/graph-manager/protocol/pure/v1/__tests__/`.
