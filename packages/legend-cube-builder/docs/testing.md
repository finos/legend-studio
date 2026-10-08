# Testing Legend Cube's builder

The builder has two test groups:

- **`core`** (the default group): unit tests and jsdom page tests against a fake engine. No engine needed:
  `TEST_GROUP=core yarn workspace @finos/legend-cube-builder test`.
- **`engine-roundtrip`**: tests against a real engine on `localhost:6300`, in files named
  `*.engine-roundtrip-test.ts`: `TEST_GROUP=engine-roundtrip yarn workspace @finos/legend-cube-builder test`.

A plain `yarn workspace @finos/legend-cube-builder test` runs both, so it fails without an engine. Add a path pattern to
run some files, e.g. `TEST_GROUP=core yarn workspace @finos/legend-cube-builder test source-picker`. The core
(`@finos/legend-cube`) has no engine tests.

## Page tests, against a fake engine

- `const { host, fake } = TEST__createCubeHost()` gives a host over `createFakeCubeEngine()`'s engine, and `fake`,
  its Jest mocks, answering from `FAKE_NORTHWIND_OUTLINE` and `FAKE_NORTHWIND_SCHEMAS`. Override an answer per test,
  e.g. `fake.execute.mockRejectedValueOnce(…)`, or pass answers to `TEST__createCubeHost(answers)`.
- `TEST__renderInCubeApplication(<CubeEditor host={host} />, host.applicationStore, LEGEND_CUBE_TEST_ID.EDITOR)`
  renders the page in a Legend application and waits for it.
- A test of one part of the page makes the state itself, `new CubeEditorState(host, document)`, and renders the part
  with it, e.g. `<CubeCanvas editorState={editorState} />` and `<CubeNodeEditorPanel editorState={editorState} />`
  (as `CubeJoinEditor.test.tsx` does). `TEST__importDocument(editorState, document)` then imports a cube and waits
  for its tables to be typed again, so nothing changes after the test. A `<CubeEditor>` test has no handle on the
  state, so it imports through the Import dialog.
- `TEST__findCanvasNode(id)`, `TEST__getCanvasNodes()` and `TEST__getCanvasNodeTooltip(node)` read the canvas.
- `src/__test-utils__/CubeNorthwindTestQueries.ts` has the Northwind tables' columns and ready-made queries, e.g.
  `sliceQuery()`.

What jsdom can't do:

- **Fit the canvas.** jsdom measures nothing, so React Flow never reports the nodes measured and the refit never runs.
  Check fitting in a browser (PLAN §11.2 Part B).
- **Show Chrome's own behaviour**, e.g. its date input sending React no Enter key.
- **Print a failing comparison of two queries.** A query holds `BigInt`s, which Jest can't print, so a failing
  `toBe` between queries crashes the worker. Compare them as booleans: `expect(a === b).toBe(true)`.

Drag and drop goes through react-dnd's HTML5 backend: fire `dragStart`, `dragEnter`, `dragOver`, `drop` and
`dragEnd` on the elements.

**Proving a test.** To show a new test fails without the code it covers, change the code in a copy of the package
outside the checkout, never in place: a running `yarn dev:ts` rebuilds `lib/` from the changed file, and the dev server
would serve it.

## Engine tests

- **The engine:** a local legend-engine, or the repo's docker compose
  (`fixtures/legend-docker-setup/grammar-test-setup/grammar-test-setup-docker-compose.yml`), on `localhost:6300`. CI
  runs the group on that docker image.
- **No `fetch` in Jest:** the repo's Jest setup blocks it. Engine tests reach the engine through axios: the
  `CUBE_ENGINE_TEST__*` helpers (`src/__test-utils__/CubeEngineTestSupport.ts`) for direct calls, and
  `V1_createEngineBackedCubeEngine()` (`src/graph-manager/protocol/pure/v1/__test-utils__/`). The latter returns
  `{ engine, calls }`: a real `V1_LegendCubeEngine` whose client calls are spied onto those helpers (and legend-graph's
  `ENGINE_TEST_SUPPORT__grammarToJSON_model`), and the spies. Make it in `beforeEach` or in the test: the repo's Jest
  config restores mocks before each test, so an engine made in `beforeAll` would call the real client, and the
  blocked `fetch`.
- **Assert meaning, not text.** The CI engine image changes with every engine merge, so assert row counts, the set of
  keys returned, types and nullability, not SQL or Pure formatting, and never an engine answer that is a known
  defect.
- **Rows come back in the database's order** unless a Sort reaches the node that runs, and H2's order changes between
  queries, so compare counts and sets, never positions, without a Sort. Facts of the Cube Northwind data a test may
  rely on: ORDERS has 830 orders, `ORDER_ID` running from 10248 to 11077 with no gap. Avoid comparing or sorting on its
  32-bit `REAL` columns (`FREIGHT`, `UNIT_PRICE`, `DISCOUNT`), where exact equality silently matches nothing.
- `src/__tests__/LegendCubeNorthwind.engine-roundtrip-test.ts` is the slice's automated acceptance (PLAN §11.2 Part
  A). It logs the engine's commit.
- `src/__tests__/LegendCubeOperations.engine-roundtrip-test.ts` checks each operation: its lambda as the engine parses
  the printed Pure, its typing against Cube's inferred schema, and its rows. Its helpers are in
  `src/__test-utils__/CubeOperationsTestUtils.ts`; they take any `CubeEngine` and import no `V1_*` class.
- `src/__tests__/CubeNorthwindRelationTypes.json` records the engine's relation type for every table of the bundled
  model. If the test comparing with it fails, the engine's typing changed: check the change, then record the file
  again by hand.

The engine tests in `src/__tests__/` import `V1_*` classes there, as an exception to the V1 rule: they need both the
`v1/` adapter and `stores/`, which the import-hierarchy lint rule keeps apart.
