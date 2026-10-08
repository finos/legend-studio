# Adding an operation: the builder half

Start with the core half, in [`@finos/legend-cube`'s guide](../../legend-cube/docs/adding-an-operation.md): the
node, its messages, emitter and codec, and its entry in the node registry. The palette, the context menu and the
canvas read that registry, so the new type shows there with no change here.

The builder adds four pieces: a draft, an editor and help text, in registries keyed by node type, and an icon, keyed by
the icon name the node's definition gives. Join and Filter are the examples to follow.

## 1. A draft

The side panel never edits the document: an editor edits a draft, and the panel's **Apply** stores the draft's node
as one undo step (**Cancel** drops it).

- In `src/stores/editors/Cube<Type>Draft.ts`, extend `CubeNodeDraft<Type>`: observable fields for the settings being
  edited, actions that change them, and `build()`. `build()` returns `original` itself while nothing was edited, and
  otherwise a new node with the same id and `rest`. The panel also treats a node that saves the same as `original`
  as no change.
- Register a factory in `CUBE_NODE_DRAFT_FACTORIES` (`src/stores/editors/CubeNodeDraftRegistry.ts`).
- A transform with nothing to set, such as Distinct, has no draft: it registers an editor that only describes it
  (`CubeDistinctEditor`) and is listed in `CUBE_NODE_TYPES_WITHOUT_SETTINGS`, which the registry test skips when it
  asks for a factory. The panel then shows no Apply or Cancel (PLAN §7.4 item 2).

## 2. An editor

- In `src/components/editors/Cube<Type>Editor.tsx`, an `observer` component taking `CubeNodeEditorProps`:
  `editorState`, `draft`, `inputSchemas` (the inputs' schemas in port order; the panel shows the editor only once all
  are there) and `readOnly` (a cube saved by a newer version: show, don't edit).
- It changes only the draft. An action on the document, such as Join's Swap Inputs, goes through
  `editorState.nodeEditor`, which applies the draft first.
- `CubeColumnPicker` picks a column from a schema, and `CubeValueEditor` takes a value as a column's type wants it.
  `isColumnDisabled` shows a column without letting it be picked, as Sort does for a type that can't be sorted
  (`isSortableType`) and a column another row has.
- A whole-number setting (a size, a row index) is a `CubeIntegerField` over text the draft keeps as typed, read with
  `parseWholeNumberText` (`src/stores/editors/CubeIntegerText.ts`): an optional sign and digits, nothing else, and empty
  text gives `undefined`, which the node reports. Never `Number()` the raw text (it reads `''` as 0, `0x10` as 16 and
  `1e3` as 1000) and never fall back to a default. `CubeRowCountDraft` and `CubeRowCountEditor` (Limit's) are the
  example.
- Give each control a stable `aria-label` (numbered per row in a list, e.g. `Sort column 2`): the tests and the
  browser rehearsal find controls by it.
- An editor must work in either host: today's side panel, or a floating editor anchored under the node, which M3
  decides on (PLAN §11.4, §12.2 question 1). Don't rely on the panel's height: a list scrolls on its own (a
  `max-height` with `overflow: auto`), column and direction pickers stay native `<select>` elements, as
  `CubeColumnPicker` is, and no editor measures the panel or reads its size.
- A Tailwind class no other file uses yet, such as an arbitrary `grid-cols-[…]`, does nothing in the dev server until
  the deployment's Tailwind build runs again ([hosting.md](./hosting.md)); jsdom tests don't see it either way, so
  check a new layout in the browser.
- Register it in `CUBE_NODE_EDITORS` (`src/components/editors/CubeNodeEditorRegistry.ts`).

## 3. Help text

An entry in `CUBE_NODE_HELP_TEXT` (`src/__lib__/LegendCubeHelpText.ts`), shown in the panel's header. Use the spec's
text (§17.9) where it has one.

## 4. An icon

Map the icon name of the node's definition to a legend-art icon in `NODE_ICONS` (`src/components/CubeNodeIcon.tsx`).

## Warnings

A warning is never an error: it doesn't make the node invalid or keep Execute from running. A warning worked out from
the query, as the Sort warning is (`findLostSortOrders` in the core), goes in `CubeEditorState.derivedWarnings`, by
node id, so it follows every edit and undo and is never stored; one about the outside world, such as a table that
changed, is stored in `CubeEditorState.warnings`, by node key. `getNodeWarnings(node)` gives both: the canvas marks the
node (`legend-cube__node--warning`) and lists them in its tooltip after its errors, and the panel shows each one as a
`role="status"` line above the editor. A derived warning waits until the nodes it names have no errors of their own.

## Columns that change name

The Join editor warns when a join key's column has no type in the model, tracing the column back to its table and the
table's own name for it with `findColumnOrigins` (`src/stores/editors/CubeJoinDraft.ts`). It requires each node's
output to have the column, maps a Rename's new name back to its old one, and follows a Join's same-named keys to the
side the join keeps. Every other node is taken to pass its input's columns through under the same name. If a new
transform's output columns aren't its inputs' under the same name (a computed column, say), teach `findColumnOrigins`
how they map back, or the warning goes missing or shows on the wrong column.

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

The `v1/` adapter (`V1_CubeLambdaSerializer`) needs no change while the operation's emitter uses only IR and literal
kinds it already writes. A new kind of IR node or literal needs its own case there, with a test in
`src/graph-manager/protocol/pure/v1/__tests__/`.
