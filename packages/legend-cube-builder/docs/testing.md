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
  with it, e.g. `<CubeCanvas editorState={editorState} />`, which floats the node editor from the canvas when a node
  is clicked (as `CubeJoinEditor.test.tsx` does). `TEST__importDocument(editorState, document)` then imports a cube and waits
  for its tables to be typed again, so nothing changes after the test. A `<CubeEditor>` test gets the page's state by
  spying on `CubeEditorState.prototype.registerCommands`, which the page calls once, and reading the spy's
  `mock.contexts[0]` (as `CubeCommands.test.tsx`'s `renderPage` does); it imports a cube through the Import dialog.
- `TEST__findCanvasNode(id)`, `TEST__getCanvasNodes()` and `TEST__getCanvasNodeTooltip(node)` read the canvas; the
  tooltip's text is the node's `aria-description`.
- `TEST__openAddItems()` and `TEST__chooseAddItem(label)` use the header's Add Items, e.g. to open the source dialog on
  a table tab (`'Relational Database Table'`); the empty canvas's link opens it with no tab chosen.
- `src/__test-utils__/CubeNorthwindTestQueries.ts` has the Northwind tables' columns and ready-made queries, e.g.
  `sliceQuery()`.

What jsdom can't do:

- **Fit the canvas.** jsdom measures nothing, so React Flow never reports the nodes measured and the refit never runs.
  Check fitting in a browser (PLAN §11.2 Part B).
- **Show Chrome's own behaviour**, e.g. its date input sending React no Enter key.
- **Print a failing comparison of two queries.** A query holds `BigInt`s, which Jest can't print, so a failing
  `toBe` between queries crashes the worker. Compare them as booleans: `expect(a === b).toBe(true)`.

The floating node editor (PLAN §11.8):

- **A press outside it** closes it on `pointerdown`, which jsdom 20 has no event class for: dispatch
  `new MouseEvent('pointerdown', { bubbles: true, button: 0 })`, as `useCubeNodeEditorDismiss.test.tsx` does
  (`fireEvent.pointerDown` sends no button).
- **Its placement** can be tested once the canvas's rectangle and the window's size are stubbed, as
  `CubeNodeEditorPopper.test.tsx` does; flipping and scrolling are checked in a browser.
- **A tooltip test** lets MUI's 800 ms memory of an open tooltip lapse after each test, or a retry (`jest.retryTimes`,
  set for every package) passes on the shorter `enterNextDelay`, as `CubeCanvas.test.tsx`'s tooltip tests do.

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
  queries, so compare counts and sets, never positions, without a Sort. A Concat's rows come in no order either.
  Facts of the Cube Northwind data a test may rely on: ORDERS has 830 orders, `ORDER_ID` running from 10248 to 11077
  with no gap, in 21 ship countries; CUSTOMERS has 91 rows and SUPPLIERS 29; `CUBETEST.ALLTYPES` has 3 rows, ID 3
  empty but for its key. Better still, check a result against its tables run alone, as the Concat tests do. Avoid
  comparing or sorting on its 32-bit `REAL` columns (`FREIGHT`, `UNIT_PRICE`, `DISCOUNT`), where exact equality
  silently matches nothing.
- `src/__tests__/LegendCubeNorthwind.engine-roundtrip-test.ts` is the slice's automated acceptance (PLAN §11.2 Part
  A). It logs the engine's commit.
- `src/__tests__/LegendCubeOperations.engine-roundtrip-test.ts` checks each operation: its lambda as the engine parses
  the printed Pure, its typing against Cube's inferred schema, and its rows. Its helpers are in
  `src/__test-utils__/CubeOperationsTestUtils.ts`; they take any `CubeEngine` and import no `V1_*` class.
- `src/__tests__/CubeInferenceConformance.engine-roundtrip-test.ts` holds Cube's inference to the engine's (PLAN
  §11.5): it types every node of every case in one batch and compares names, positions, precise types with their
  parameters, and nullability exactly (`TEST__typingDifferences`). Where the engine misreports nullability (an outer
  join's padded columns, the FULL merged key, a Difference's keys named apart, an Extend's columns after `toOne()`), a
  case lists the columns in `widerNullable`, and Cube must say nullable
  there. Every registered node type needs a case, or the coverage test fails, but a data product's access point
  (`NOT_TYPED_BY_THE_ENGINE`: the open-source engine reads no data product; `CubeDataProduct.engine-roundtrip-test.ts`
  types its stand-in). A case whose Concat converts types names the types it converts (`converted`), so a case that
  silently stops converting fails. A case's every node must be valid. The saved-spec samples are typed the same way,
  node by node, but one-way (`CubeSpecCorpus.engine-roundtrip-test.ts`).
- **Sort descending in order tests.** H2 scans ORDERS in ascending `ORDER_ID` order, so a test that sorts ascending,
  or numbers rows by `ORDER_ID`, passes without the sort; the operations tests sort descending, with a control test
  pinning H2's own order.
- **Database workarounds** (PLAN §11.4) are checked two ways. The operations tests write them for `SqlServer` and run
  them on the fixture's H2, which takes both forms, so their rows can be compared with the native forms'.
  `src/__tests__/LegendCubeDialects.engine-roundtrip-test.ts` plans them, never running anything, on a test-only copy
  of the fixture model with a static connection per database type (`CUBE_ENGINE_TEST__generatePlanSql`), and checks
  facts about the SQL: row numbers in the Sort's order, no `limit m,n`, no `top N distinct`; for Group, its reduces,
  HAVING and the GROUP BY target after two Renames (an engine issue, pinned); for Concat, one UNION ALL, each input's
  Sort and Limit in its own subquery, and no SQL cast when it converts types. A check that should catch
  a missing workaround must fail without it: run it once with the workaround off before relying on it.
- **Windows** (PLAN §11.6) are planned in `WINDOW_SHAPES` over `WINDOW_DATABASE_TYPES`, since Spanner, Presto and
  Composite refuse any window (pinned): an OVER clause with no frame, `count(col)` and `count(1)` for the counts,
  `rank()`, `dense_rank()` and `row_number()`, a Filter after a Partition as a `WITH n_…` and a `WHERE` outside the
  window, never QUALIFY, and the capture's ORDER BY at the root. Run, they are checked three ways: the operations
  tests ("Partition on the engine"), with values worked out on the fixture (rows tied on the sort share a running
  value and a rank); `LegendCubeDirectConnectionOperations.engine-roundtrip-test.ts` on H2 and DuckDB, a second
  database that runs them, windowed Distinct Count included; and `CubeWindowComposition.engine-roundtrip-test.ts`,
  which runs pairs and triples of nodes with a Partition against a small JavaScript reference with SQL's null rules
  and default frame, checks every Partition is written in the array form, and shows (its negative control) that the
  single form, unbound, gives wrong rows. The core's `PartitionEmitter.test.ts` pins the emitted text.
  `CubeWindowIsolation.engine-roundtrip-test.ts` checks the lets themselves through the adapter, with a test-only
  window: they run, type, show in Show Pure, and put an error inside a let on its window.
- **Difference and Extend** (PLAN §11.7). The operations tests run a Difference against a reference computed from its
  inputs' own rows, every numeric family included; the plan-only test pins its join (a native `full outer join` on
  every type but H2, where the engine emulates it) and its `coalesce(…, 0) - coalesce(…, 0)`, never a cast, and an
  Extend's columns written as their expressions; both run on H2 and DuckDB through the direct connection.
  `CubeExpressions.engine-roundtrip-test.ts` covers Extend's engine calls: an expression parsed with its digits and
  locations, typed as a chain after its input over the cube's model (its own enumerations and functions too), the
  failing column found and located, a plan that fails, and a run. A test that needs a typed Extend without the engine
  builds one with `TEST__typedExtend` (`src/__test-utils__/CubeExpressionTestUtils.ts`), whose types the conformance
  cases check against the engine.
- `src/__tests__/CubeExamples.engine-roundtrip-test.ts` compiles the Sports and Trades sample models and opens every
  example cube (PLAN §6.9) as the Examples dialog does: it types its tables, checks every node types as Cube infers it
  (Sum outputs nullable to Cube only, PLAN §5.7) and runs it, counting rows.
- `src/__tests__/CubeNorthwindRelationTypes.json` records the engine's relation type for every table of the bundled
  model. If the test comparing with it fails, the engine's typing changed: check the change, then record the file
  again by hand.

### Direct connections

- `TEST__createCubeHost()` also gives `connections`, a fake connection explorer
  (`src/__test-utils__/FakeCubeConnectionExplorer.ts`) whose `listSchemas` answers `CUBE_DIRECT` and whose `listTables`
  answers `FAKE_DIRECT_TABLES`, each a Jest mock.
- On the engine, `V1_createEngineBackedCubeEngine()` also spies `buildDatabase` (schema exploration), and
  `V1_createEngineBackedCubeConnectionExplorer()` gives a real explorer. `directH2Connection(schema)` and
  `directDuckDBConnection(schema)` (`src/__test-utils__/CubeDirectConnectionFixtures.ts`) build small databases from
  setup SQL.
- **Setup SQL runs on every pooled connection**, so a setup must first drop what it creates. Each engine test file
  still uses its own schema names, so files never depend on each other's data.
- **Never assert an engine answer that is a known defect.** Schema exploration types H2's and DuckDB's `DECIMAL(10,2)`
  as `Numeric(0,0)` and DuckDB's `VARCHAR(5)` as `Varchar(0)`; only the core's DuckDB sample
  (`packages/legend-cube/src/spec/__tests__/fixtures/direct/`) holds those types, and no engine test reads it.

### Data products and ingest data sets

- **Fakes.** `TEST__createCubeHost()` also gives `dataProducts`, a fake data product catalog
  (`src/__test-utils__/FakeCubeDataProductCatalog.ts`). An ingest catalog is opt-in: build one per test with
  `createFakeCubeIngestCatalog()` (`src/__test-utils__/FakeCubeIngestCatalog.ts`) and pass its `catalog` as the host's
  `ingestCatalog`; without it, Cube offers no Ingest tab.
- **The open-source engine reads neither.** It has no data product or ingest definition to read, can't parse an ingest
  definition, and can't type or run a `#I{...}#` accessor. So the engine tests stand each source in for with a Pure
  function declaring the relation type the source would have, over an H2 table:
  `src/__tests__/CubeDataProduct.engine-roundtrip-test.ts` for access points, and
  `src/__tests__/CubeIngest.engine-roundtrip-test.ts` for ingest data sets. The ingest one swaps each accessor Cube
  emits for its stand-in, then checks the nodes downstream (a Filter on `LAKE_OUT_ID`, a Join of two data sets, a
  Group) against the engine's typing, and runs them.
- **Testable locally:** reading a definition's data sets and types, the URN parser, the saved model, the source
  dialog, the panels and the re-checks, all with fakes; downstream lambdas, on the stand-ins.
- **Not testable locally:** the ingest servers' answers, the parse of a deployed definition's grammar, compiling and
  running `#I{...}#`, the environment name and whether a warehouse is accepted. Those are checked in an internal
  deployment (PLAN §11.2 Part B2).

The engine tests in `src/__tests__/` import `V1_*` classes there, as an exception to the V1 rule: they need both the
`v1/` adapter and `stores/`, which the import-hierarchy lint rule keeps apart.

### Depot databases

- **Fakes.** `createFakeCubeProjectCatalog()` (`src/__test-utils__/FakeCubeProjectCatalog.ts`) gives a catalog to pass
  as the host's `projectCatalog`; without one, Cube offers no Project tab. Its `com.example:sales` holds the fake
  engine's Northwind Database, so the fake engine types its tables.
- **CI:** `src/__tests__/CubeDepotSamples.engine-roundtrip-test.ts` compiles the mock depot's committed sample
  projects and types every table of their own Databases. The engine fetches a pointer's project from a depot, which CI
  doesn't run, so no CI test sends a pointer.
- **By hand (`cube-local`):** with the engine on :6300 and `yarn dev:mock-depot-server` on :6200,
  `TEST_GROUP=cube-local yarn workspace @finos/legend-cube-builder test` runs the real catalog, the engine's pointer
  fetch and the Project tab end to end (`src/__tests__/CubeDepot.cube-local-test.ts`). Its depot client sends its GETs
  through axios, since the repo's Jest setup blocks `fetch`.
- **Changing the sample projects:** edit `fixtures/legend-mock-server/scripts/generate-cube-depot.mjs` and run it with
  the engine up (`node scripts/generate-cube-depot.mjs`). The engine caches a pointer's project per version, so restart
  it after changing a version it has fetched.
