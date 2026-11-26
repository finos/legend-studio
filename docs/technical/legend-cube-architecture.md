# Legend Cube architecture

How Legend Cube is built: its two packages, the cube document and its saved spec, and how a cube becomes the lambda
the engine runs, and back. For the people who change Cube; users read the
[user guide](https://legend.finos.org/cube). The diagrams are Mermaid, which GitHub draws.

## The packages

```mermaid
flowchart TB
  subgraph hosts["Hosts: each gives the page a CubeHost"]
    query["Legend Query<br/>LegendQueryCubeHost"]
    studio["Legend Studio<br/>EmbeddedCubeEditor: Create and Edit MatView"]
    analytics["Legend Analytics<br/>LegendAnalyticsCubeHost"]
  end
  subgraph builder["@finos/legend-cube-builder"]
    components["components/<br/>CubeEditor: canvas, palette, node editors, grid"]
    stores["stores/<br/>CubeEditorState and its parts (MobX)"]
    port["graph-manager/<br/>CubeEngine port, catalogs"]
    v1["graph-manager/protocol/pure/v1/<br/>V1_LegendCubeEngine: the only V1_* code"]
  end
  subgraph core["@finos/legend-cube: host-free, no dependencies"]
    graphFolder["graph/: CubeDocument, Query, QueryNode"]
    inference["inference/: schemas and validity"]
    ir["ir/: QueryEmitter, Cube IR, QueryReader"]
    spec["spec/: the saved spec codec"]
  end
  engine[("Legend Engine")]

  hosts --> components
  components --> stores
  stores --> port
  port -. implemented by .-> v1
  stores --> core
  v1 --> core
  v1 -- "legend-graph's engine client" --> engine
```

- **`@finos/legend-cube`** is the domain model and runs anywhere JavaScript runs: no browser, no Node, no Legend code
  ([its README](../../packages/legend-cube/README.md#host-free-rule) has the rule and its guards). It knows nothing of
  the engine's protocol: it writes and reads the **Cube IR**, its own Pure AST.
- **`@finos/legend-cube-builder`** is the page, its MobX stores, and the engine adapter. The stores talk to the engine
  only through the `CubeEngine` port (`graph-manager/CubeEngine.ts`); `V1_LegendCubeEngine` implements it, and is the
  one place that turns the Cube IR into the engine's protocol JSON and back.
- **A host** makes a `CubeHost` (the application store, the engine, the model catalog, and the catalogs it offers:
  data products, ingest, projects, connections) and renders `CubeEditor`. `LegendCubeHost` in the builder does most of
  it; see [hosting](../../packages/legend-cube-builder/docs/hosting.md).

## The cube document and its spec

```mermaid
flowchart LR
  subgraph doc["CubeDocument (in memory)"]
    context["context<br/>model: the model kind and what it needs<br/>runtime: the runtime's path"]
    query["query: Query, immutable<br/>nodes: QueryNode[] (sources and steps)<br/>connections: input edges<br/>selected: the step that runs"]
    meta["meta.presentation<br/>graph shown, column widths and formats, drill-down"]
  end
  registry["NodeRegistry<br/>a definition per node kind:<br/>node, codec, emitter, query rules"]
  specjson[("spec JSON, formatVersion 1<br/>{ formatVersion, name, context,<br/>query: { selected, nodes }, meta }")]

  doc -- "encodeCubeSpec / serializeCubeSpec" --> specjson
  specjson -- "decodeCubeSpec / parseCubeSpec" --> doc
  registry -. "each node's codec" .- specjson
```

- **The query graph is the only source of truth.** Every edit makes a new `Query`; the editor keeps the old ones for
  Undo. Nothing derived (schemas, the lambda, the results) is stored in the document, but what the engine answered: a
  source's schema snapshot, an Extend's column types, a Filter by Expression's check.
- **The spec** is the document as JSON: each node is `kind`, `id`, `inputs` and its own fields, written by its kind's
  codec (`spec/codecs/`). Values are typed, numbers written as strings so no digit is lost. Unknown keys and kinds are
  kept. A resolved source keeps a **schema snapshot**, so a cube opens typed; an unresolved one is typed again on
  import.
- **The registry** (`createNodeRegistry()`) lists the node kinds, in palette order; the palette, the context menu, the
  codec, the emitter and the reader all read it.

A spec's query, abbreviated (the example "Top customers by orders"):

```json
{
  "selected": "limit101",
  "nodes": [
    {
      "kind": "relational",
      "id": "relational101",
      "database": "…NorthwindDatabase",
      "schema": "NORTHWIND",
      "table": "ORDERS"
    },
    {
      "kind": "relational",
      "id": "relational102",
      "database": "…NorthwindDatabase",
      "schema": "NORTHWIND",
      "table": "CUSTOMERS"
    },
    {
      "kind": "rename",
      "id": "rename101",
      "inputs": ["relational102"],
      "mappings": [{ "from": "CUSTOMER_ID", "to": "CUSTOMER" }]
    },
    {
      "kind": "join",
      "id": "join101",
      "inputs": ["relational101", "rename101"],
      "joinType": "INNER",
      "leftColumns": ["CUSTOMER_ID"],
      "rightColumns": ["CUSTOMER"]
    },
    {
      "kind": "group",
      "id": "group101",
      "inputs": ["join101"],
      "columns": ["COMPANY_NAME", "COUNTRY"],
      "aggregations": [{ "function": "CountRows", "name": "ORDER_COUNT" }]
    },
    {
      "kind": "sort",
      "id": "sort101",
      "inputs": ["group101"],
      "sorts": [
        { "column": "ORDER_COUNT", "direction": "DESC" },
        { "column": "COMPANY_NAME", "direction": "ASC" }
      ]
    },
    { "kind": "limit", "id": "limit101", "inputs": ["sort101"], "size": 10 }
  ]
}
```

## From an edit to a typed graph

```mermaid
flowchart TB
  edit["A node editor's draft, Apply<br/>(or the palette, a grid action, Import)"] --> apply["CubeEditorState.applyQuery(next)<br/>pushes the old Query for Undo"]
  apply --> infer["buildSchemasAndValidity(query, rules)<br/>each node's output schema and its errors,<br/>from its inputs' schemas"]
  infer --> ui["Canvas, editors, palette<br/>show the schemas and the errors"]
  apply --> typing{"Does a node need<br/>the engine to type it?"}
  typing -- "a source" --> resolve["engine.resolveSchemas<br/>the table's or access point's columns"]
  typing -- "an Extend, a Filter by Expression" --> types["engine.typeLambdas<br/>emitTypingLambda: {| relation}"]
  resolve --> infer
  types --> infer
```

- **Inference is local and synchronous**: each node's `schematize` and `validate` run on its inputs' schemas, so the
  canvas knows every node's columns without the engine.
- **The engine types what Cube can't**: a source's columns (`resolveSchemas`), and the type of an expression the user
  wrote (`typeLambdas`, on the relation up to the node). Their answers feed inference again.
- **Query rules** are checks across the graph, e.g. that the database a step runs on can run it (`ir/CubeDialects.ts`:
  Pivot and JSON steps need certain databases).

## Running a cube

```mermaid
sequenceDiagram
  actor User
  participant Exec as CubeExecutionState
  participant Run as runCubeQuery (CubeQueryRun.ts)
  participant Emit as QueryEmitter (legend-cube)
  participant Port as CubeEngine port
  participant V1 as V1_LegendCubeEngine
  participant Engine as Legend Engine

  User->>Exec: Execute (F9)
  Exec->>Run: query, model, runtime, inferred schema, row limit
  opt a Drop, Slice, Limit or Distinct, or a step only some databases run
    Run->>Run: loadModelOutline, then the run's database type
  end
  Run->>Emit: emitExecutionLambda({ rowLimit, runtime, databaseType })
  Emit-->>Run: Cube IR: {| relation->sort(…)->limit(rowLimit + 1)->from(runtime) }
  Run->>Port: execute(model, lambda)
  Port->>V1: execute
  V1->>V1: executionContextOf: the model the run needs<br/>(the cube's, or built for a data product, ingest data set or direct connection)
  V1->>V1: executionBodyOf: V1_serializeCubeLambda(IR) as protocol JSON, written losslessly
  V1->>Engine: POST /pure/v1/execution/execute
  Engine-->>V1: the result, as text
  V1-->>Run: CubeResult: columns, rows, SQL (read losslessly)
  Run->>Run: check the columns against the inferred schema, by position
  Run-->>Exec: rows (at most the limit), whether more exist, SQL, the lambda
  Exec-->>User: the grid, and the run listed in Runs
```

- **The emitter** walks the graph from the step that runs to its sources; each node kind's emitter (`ir/emitters/`)
  writes its Pure function, e.g. a Group is `groupBy(~[…], ~[…])`. A Sort's order is written where it is used: before
  a Limit, Drop or Slice, and again before the run's own limit. A window is bound with a `let`.
- **`rowLimit + 1`** rows are fetched to tell whether there are more than the limit.
- **The columns are checked**, since rows are read by position: the engine must return the inferred schema's columns,
  in order.
- **Every run is listed in Runs** with the lambda it sent: Show Pure and Copy JSON there show exactly what ran.

The Pure of the example above, as Show Pure prints it (no row limit there):

```
|#>{showcase::northwind::store::NorthwindDatabase.NORTHWIND.ORDERS}#
  ->join(
    #>{showcase::northwind::store::NorthwindDatabase.NORTHWIND.CUSTOMERS}#->rename(~CUSTOMER_ID, ~CUSTOMER),
    meta::pure::functions::relation::JoinKind.INNER,
    {l, r|$l.CUSTOMER_ID == $r.CUSTOMER}
  )
  ->select(~[CUSTOMER_ID, CUSTOMER, ORDER_ID, …, FAX])
  ->groupBy(~[COMPANY_NAME, COUNTRY], ~[ORDER_COUNT: x|1:y|$y->count()])
  ->sort([~ORDER_COUNT->descending(), ~COMPANY_NAME->ascending()])
  ->limit(10)
  ->sort([~ORDER_COUNT->descending(), ~COMPANY_NAME->ascending()])
  ->from(showcase::northwind::mapping::StoreRuntime)
```

Each node's part: `relational101` and `relational102` are the `#>{…}#` accessors, `rename101` the `rename`,
`join101` the `join` and the `select` that orders its columns, `group101` the `groupBy`, `sort101` the first `sort`,
`limit101` the `limit`; the last `sort` is the order of the rows the step that runs gives, and `from` binds the
runtime.

## One IR, many uses

```mermaid
flowchart LR
  q["Query"] --> emitter["QueryEmitter"]
  emitter -- "emitExecutionLambda<br/>with a row limit" --> exec["engine.execute<br/>Execute, the grid's fetches,<br/>Pivot's Load values, JSON samples"]
  emitter -- "emitExecutionLambda<br/>no row limit" --> other["engine.exportCsv: CSV export<br/>engine.renderPure: Show Pure"]
  emitter -- "emitExecutionLambda<br/>row limit 1" --> plan["engine.planLambda<br/>Validate in Extend and<br/>Filter by Expression"]
  emitter -- "emitRelation<br/>no runtime, no limit" --> host["buildCubeRunningStepLambda<br/>Studio's MatView, as protocol JSON"]
  emitter -- "emitTypingLambda" --> typing["engine.typeLambdas"]
  dd["deriveDrilldownLevel<br/>(legend-cube drilldown/)"] -- "a level's query:<br/>Filter, Group, Sort nodes" --> q
```

- **The grid's server-side mode** runs each drill-down level as a query of Cube's own nodes, derived from the run's
  (`deriveDrilldownLevel`): a Filter of the expanded keys, a Group, a Sort. So every database workaround the emitter
  knows applies to the grid too.
- **Everything the engine runs goes through the emitter**; nothing builds Pure by hand.

## The way back: a lambda into a cube

```mermaid
flowchart LR
  text["Pure text<br/>(Import Pure)"] -- "engine.parseExpression<br/>(the engine's grammar)" --> json["lambda protocol JSON"]
  saved["a saved MatView's lambda<br/>(Studio's Edit MatView)"] --> json
  json -- "readCubeLambdaJson<br/>(V1_readCubeLambda)" --> irin["Cube IR"]
  irin -- "splitCubeLambda" --> parts["its sources, steps,<br/>runtime and limit"]
  parts -- "readCubeQuery<br/>(ir/reader/QueryReader.ts)" --> qback["Query: a node per step"]
  qback --> typed["sources resolved,<br/>Extends typed (typeLambdas)"]
```

The reader knows each node kind's Pure (the patterns in `ir/reader/StepPatterns.ts`), so a lambda Cube wrote reads
back into the same steps; a step it can't read is named in the error.

## Where to look

| What                               | Where                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| A node kind: node, codec, emitter  | `legend-cube/src/nodes/`, `spec/codecs/`, `ir/emitters/`, registered in `nodes/NodeRegistry.ts`   |
| Its editor, draft, help text, icon | `legend-cube-builder/src/components/editors/`, `stores/editors/`, `__lib__/LegendCubeHelpText.ts` |
| Schemas and validity               | `legend-cube/src/inference/SchemaInference.ts`                                                    |
| The emitter and the IR             | `legend-cube/src/ir/QueryEmitter.ts`, `CubeIR.ts`, `printIR` in `IRPrinter.ts`                    |
| Database rules                     | `legend-cube/src/ir/CubeDialects.ts`                                                              |
| The spec                           | `legend-cube/src/spec/CubeSpecCodec.ts`                                                           |
| A run                              | `legend-cube-builder/src/stores/CubeQueryRun.ts`, `CubeExecutionState.ts`, `CubeGridFetcher.ts`   |
| The engine adapter                 | `legend-cube-builder/src/graph-manager/protocol/pure/v1/V1_LegendCubeEngine.ts`                   |
| Lambda to and from protocol JSON   | `v1/V1_CubeLambdaSerializer.ts`, `v1/V1_CubeLambdaReader.ts`                                      |
| Import Pure                        | `legend-cube-builder/src/stores/CubeLambdaImportState.ts`, `legend-cube/src/ir/reader/`           |

Adding a step touches both packages: [the core half](../../packages/legend-cube/docs/adding-an-operation.md) and
[the builder half](../../packages/legend-cube-builder/docs/adding-an-operation.md).
