# Cube — Rebuild Specification

**Purpose.** This document specifies the complete behaviour of **Cube**, a visual query builder over
tabular data sets, in enough detail to reimplement it as a new entry point inside **Legend Query**,
without reading the original source.

It is written for an implementer (human or Claude) who has access to the Legend Query / Legend Studio
codebase but _not_ to the original Cube codebase.

> **A note on names.** A handful of wire-format and configuration identifiers in the original carry a
> vendor prefix — the source discriminator `alloyService`, the config keys `alloyExecutionUrl` /
> `alloyServicesUrl`, and similar. These are quoted verbatim wherever they appear as **literal
> protocol values**, because renaming them would silently break interoperability with the existing
> engine and with saved queries. They are identifiers, not product names. Everything else refers to
> the application as _Cube_ and to its backend as _the engine_.

> **The rebuild does not have to be built the same way.** This spec defines _required behaviour_, not
> an implementation. Framework, state management, component structure, layout engine, and module
> layout are all open. Where a detail of the original's implementation actually encodes a requirement,
> it is flagged **[why]**; where it is incidental it is marked _(original: …)_ and can be ignored.
>
> Two categories are **not** negotiable, because they are observable contracts rather than
> implementation choices:
>
> - the **query semantics** — §3 types, §5 inference/validation, §7 transforms, §8 filters, §10
>   aggregations. These define what a query _means_; changing them changes results.
> - the **wire and storage formats** — §11.2, §8.4, §14. These determine interoperability with the
>   engine and with saved queries.
>
> Everything else — §17 UI, §2.2 architecture, §19.3 module boundaries — is guidance.

---

## 0. Scope and decisions

These decisions were taken before writing the spec and are assumed throughout.

| Decision         | Value                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host application | **Legend Query** — a new entry point that behaves exactly like Cube                                                                                                     |
| Execution        | Abstracted behind a **`CubeQueryEngine`** interface (§11). The existing TDS HTTP API is documented as the reference implementation                                      |
| Protocol scope   | **V1 graph protocol only.** The legacy V0 "Pure TDS" path is excluded from the rebuild — but see the warning in §14.1, because V0 is currently the _storage_ format     |
| Sources in scope | Relational Database Tables, Services, Data Browser Queries, PURE Native Functions, plus a **Data Product / Ingest Definitions** source that the implementer will define |
| Sources dropped  | **Data Lake Datasets** (`dataLake`). This is a deliberate parity regression; the source contract in §6.1 is still general enough to re-add it later                     |

### 0.1 Non-goals

- Porting the V0 `TdsGraphRequest` execution path or the direct-to-Pure-server client.
- Porting the Dropwizard server. Its only real responsibility is the query store (§14), which Legend
  Query should satisfy with its own persistence.
- Pixel-for-pixel reproduction of the Bootstrap/GS-UI-Toolkit styling.

---

## 1. What Cube is

Cube is a **visual, node-based query builder over tabular data sets (TDS)**.

A user:

1. Drags **sources** (a relational table, a registered service, a saved query, a PURE function) onto a canvas.
2. Chains **transforms** (filter, group, join, window, …) off them, forming a directed acyclic graph.
3. Selects one node as the **capture node** — the node whose output is the query result.
4. Executes the graph and browses results in a spreadsheet-style grid with drill-down, column
   formatting, and CSV/XLSX export.
5. Optionally saves the query, or publishes it as a registered service.

The defining characteristics, all of which must be preserved:

- **Graph, not a linear pipeline.** Binary transforms (join, concatenate, column-difference) mean the
  query is a DAG with multiple roots, not a single chain.
- **Live schema inference.** Every node's output schema is computed client-side, incrementally, as the
  user edits. Column pickers only ever offer columns that actually exist at that point in the graph.
- **Live validation.** Every node is validated against its input schemas on every edit, producing
  human-readable error messages attached to that node. The query is executable only when every node is valid.
- **Immutability.** The query model is a persistent (immutable) data structure. Every edit produces a new
  `Query`; the previous one is pushed onto an undo stack.
- **No round-trip to the server for editing.** Schema resolution happens once per source (server call);
  everything downstream is computed locally.

---

## 2. Architecture

### 2.1 Current architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React 17, ~21k LOC — all the intelligence)    │
│                                                          │
│  Sidebar ── Graph canvas ── Details panel ── Results grid│
│                      │                                   │
│              Query (immutable DAG)                       │
│              Meta (presentation + drilldown)             │
│              Schema inference + validation engine        │
└───────────┬──────────────────────┬───────────────────────┘
            │                      │
   ┌────────▼────────┐    ┌────────▼─────────────────────┐
   │ Cube server      │    │ Execution engine             │
   │ (Dropwizard)     │    │ /api/tds/v1/*                │
   │ • query store    │    │ /api/service/v1/*            │
   │   (Mongo+Vermongo)│   │ /api/store/v1/*              │
   │ • auth, identity │    │ (schema, execute, codegen)   │
   └──────────────────┘    └──────────────────────────────┘
```

The Cube server is thin: a versioned Mongo CRUD store for saved queries, plus GS auth and an identity
endpoint. All query semantics live in the browser.

### 2.2 Target architecture

```
Legend Query
    └── "Cube" entry point
            ├── cube-domain      pure model: types, schema, query graph,
            │                    transforms, filters, inference, validation
            │                    (zero host/HTTP dependencies — unit-testable in isolation)
            ├── cube-engine      CubeQueryEngine interface + Legend adapter
            ├── cube-sources     pluggable source registry
            ├── cube-ui          graph canvas, details panels, results grid
            └── cube-persistence save/load via Legend's query persistence
```

`cube-domain` must have **no imports from the host application**. This is the single most important
structural rule: it is what makes the model testable and what let the original survive two protocol
migrations.

---

## 3. Domain model: types and schemas

### 3.1 Type system

Two kinds of type: **primitive** and **enumeration**.

```
Primitive type names:
  Boolean, String, Float, Integer, Number, Date, DateTime, StrictDate

Groupings:
  NUMERIC_TYPES   = [Float, Integer, Number]
  DATE_TYPES      = [Date, DateTime, StrictDate]
  PRIMITIVE_TYPES = [Boolean, String, ...NUMERIC_TYPES, ...DATE_TYPES]
```

Rules:

- Primitives are **singletons** — one interned instance per type name. Equality is reference equality
  in practice but must also be structurally correct.
- An `Enum` has a `name` and a non-empty `values: string[]`. Two enums are equal iff their names match
  (values are not compared).
- `Enum.toString()` returns the enum name; `Primitive.toString()` returns the type name.
- **Type compatibility** (used for join column validation):
  `areCompatibleTypes(a, b) === (isNumeric(a) && isNumeric(b)) || a.equals(b)`
  i.e. any numeric type joins to any other numeric type; otherwise types must be identical.
- Resolving an unknown type name throws: `"<name>" is neither known enum nor primitive type`.

**Enum value qualification.** PURE serialises enum values as `EnumName.VALUE`. The model stores the
unqualified form. Two helpers are needed and are used in many places (aggregation function names, sort
directions, filter operators all arrive qualified):

```
unqualifyEnumValue("SortDirection.Ascending") -> "Ascending"
unqualifyEnumValue("Ascending")               -> "Ascending"   // idempotent
qualifyEnumValue("Ascending", "SortDirection") -> "SortDirection.Ascending"
```

More than one `.` is an error.

### 3.2 Schema

```
SchemaColumn { name: string (non-empty), type: Primitive | Enum }
Schema       { columns: SchemaColumn[] }   // ordered, immutable
```

Required operations:

| Operation       | Semantics                                                              |
| --------------- | ---------------------------------------------------------------------- |
| `lookup(name)`  | first column with that name, or undefined                              |
| `type(name)`    | that column's type, or undefined                                       |
| `names()`       | iterate column names **in order**                                      |
| `equals(other)` | same length **and** same `(name, type)` pairwise **in the same order** |

`Schema.equals` being order-sensitive matters: `Concat` requires `schema1.equals(schema2)`, so
concatenating two inputs whose columns are in different orders is rejected.

---

## 4. The query graph

### 4.1 Nodes

Every node is a `QueryNode`:

```
QueryNode {
  key:   number     // monotonic sequence, assigned at construction; identity for change detection
  id:    string     // unique within the query, user-visible, e.g. "filter101"
  type:  string     // discriminator, e.g. "filter"
  ports: string[]   // named input slots, in order
}
```

- `ports.length === 0` → **source node** (§6)
- `ports.length === 1` → **unary transform**, default port name `["tds"]`
- `ports.length === 2` → **binary transform**, default port names `["tds1", "tds2"]`
  (`Join` overrides these to `["leftTds", "rightTds"]`)

`key` exists because the model is immutable: `query.replace(node)` asserts
`original.key !== node.key`, i.e. you cannot "replace" a node with itself. Use a module-level
incrementing counter.

Each node class also carries **static** metadata used to build menus and wire formats:

```
TYPE      transform discriminator ("filter")
TYPE_V1   wire type name for the V1 protocol ("filter")
FUNCTION  fully-qualified PURE function signature (see §7)
INPUTS    V1 input property names, in port order (["input"] / ["leftInput","rightInput"])
LABEL     menu label ("Filter by Column")
ICON      Font Awesome class
BETA      boolean — renders a "BETA" badge; currently false for every transform
```

> **`ports` vs `INPUTS`.** These are two different naming schemes for the same slots.
> `ports` are the _connection_ port names (used by the graph editor and by the legacy V0 protocol,
> where a connection targets `{nodeId, parameterName}`). `INPUTS` are the _V1 property names_ —
> in V1, inputs are inlined onto the node object as `{..., input: {_type:"nodeRef", id:"..."}}`.
> Keep both; they are not interchangeable.

### 4.2 Connections

```
Connection { source: nodeId, target: nodeId, port: portName }
```

Directed, source → target. `match(source?, target?, port?)` does partial matching with `undefined`
as wildcard; it is used pervasively.

### 4.3 The `Query` aggregate

```
Query { nodes: QueryNode[], connections: Connection[], selected: nodeId | undefined }
```

`selected` is the **capture node** — both the node highlighted in the editor and the node whose output
is executed. There is exactly one.

**Invariants, checked in the constructor (throw on violation):**

1. All node ids are unique.
2. Every connection's source and target reference existing nodes.
3. Connection sources are unique — **a node's output feeds at most one downstream node.** (This is what
   makes the graph a forest of trees converging on the capture node, not an arbitrary DAG.)
4. `selected` is either undefined or the id of an existing node.
5. `selected === undefined` **iff** `nodes.length === 0`.

Port capacity (at most one connection per `(target, port)` pair) is _not_ a constructor invariant —
it is enforced by `canConnect`/`connect`.

### 4.4 Query operations

All return a new `Query`. Each `canX` predicate must be total and side-effect free; the UI uses it to
enable/disable menu items and drop targets.

#### `generateId(type) -> string`

```
ids = nodes.map(n => parseInt(n.id.replace(n.type, ""), 10)).filter(not NaN)
id  = `${type}${Math.max(100, ...ids) + 1}`
```

If that collides, fall back to a linear scan `${type}1`, `${type}2`, … up to 10000, then throw
`too many query nodes of type "<type>" to generate identifier`.

The `Math.max(100, ...)` floor is a compatibility artefact (ids start at 101) and is worth keeping so
that queries exported from the rebuild still look familiar.

#### `select(nodeId)`

Requires the node exists and is not already selected.

#### `add(node, afterId?)`

- Appends `node` to `nodes`.
- If `afterId` is given, **splices** the new node into the chain:
  - adds `Connection(afterId, node.id, node.ports[0])`;
  - if `afterId` already had an outgoing connection `(afterId → T, port p)`, that connection is
    **removed** and replaced with `(node.id → T, port p)`.
- Selection: if nothing was selected, or `afterId === selected`, the new node becomes selected;
  otherwise selection is unchanged.
- Asserts: id not already present; `node.id !== afterId`; if `afterId` given, `node.ports.length > 0`.

#### `move(nodeId, afterId)`

`canMove` requires: both exist, are different, `node.ports.length > 0` (sources can't be moved into a
chain this way), and there is no existing connection `afterId → nodeId`.
Implementation: `disconnect(connections, nodeId)` then splice in after `afterId` using the same
`connectAfter` logic as `add`.

#### `remove(nodeId)`

Removes the node and **heals the chain**: if the removed node had both an incoming connection
`(S → nodeId)` and an outgoing connection `(nodeId → T, port p)`, a new connection `(S → T, port p)`
is created. Otherwise dangling connections are simply dropped.

Selection after removal, in order of preference:

1. unchanged, if the removed node wasn't selected;
2. the source of its incoming connection;
3. the target of its outgoing connection;
4. the last remaining node;
5. `undefined` if the query is now empty.

#### `connect(sourceId, targetId)`

`canConnect` requires: both exist, differ, **the source has no outgoing connection yet**, and the
target has at least one free port. The connection is made to the _first_ free port in port order.

#### `swapInputs(nodeId)`

Only for binary nodes with at least one incoming connection. Flips every incoming connection's port
between `ports[0]` and `ports[1]`. This is how a user turns a left-outer join around.

#### `validate(validity: Map<nodeId, string[]>) -> boolean`

`!isEmpty && every node has an entry in the map that is an empty array`.

---

## 5. Schema inference and validation engine

This is the heart of the application. One function, run after **every** edit, over the whole graph.

```
buildSchemasAndValidity(query) -> {
  schemas:  Map<nodeId, Schema | undefined>,
  validity: Map<nodeId, string[]>          // [] means valid
}
```

### 5.1 Algorithm

Depth-first with memoisation, driven by each node's declared ports:

```
for each node in query.nodes:
    visit(node)

visit(node):
    if node already in schemas/validity: return

    inputIds = node.ports.map(port =>
        connections.find(c => c.target === node.id && c.port === port)?.source)   // in PORT ORDER

    for each defined inputId: visit(that node)        // recurse first

    if any inputId is undefined:
        schemas[node]  = undefined
        validity[node] = ERR_INCOMPLETE
        return

    inputSchemas = inputIds.map(id => schemas[id])

    if any inputSchema is undefined:                  // an upstream node is broken
        schemas[node]  = undefined
        validity[node] = ERR_SCHEMAS
        return

    errors = []
    if not node.validate(inputSchemas, errors):
        schemas[node]  = undefined
        validity[node] = errors.length ? errors : ERR_OTHER
    else:
        schemas[node]  = node.schematize(inputSchemas)
        validity[node] = []
```

Three sentinel messages:

```
ERR_INCOMPLETE = "This node requires more inputs. Please drag and drop another input to associate."
ERR_SCHEMAS    = "This node depends on some invalid inputs. Please correct these first."
ERR_OTHER      = "This graph node is invalid."
```

Expose `isSchemasError(err)` so the UI can style _"the problem is upstream"_ differently from
_"you configured this node wrongly"_.

Properties the implementation must preserve:

- **Input schemas are passed in port order**, always. Every `validate`/`schematize` destructures
  `const [schema1, schema2] = schemas`.
- **Invalid ⇒ no schema.** A node that fails validation produces `undefined`, which poisons everything
  downstream with `ERR_SCHEMAS`. Errors do not cascade as duplicates.
- `ensureSchemas(schemas, ports)` asserts `schemas.length === ports.length` and that every entry is a
  real `Schema`. Call it first in every `validate`/`schematize`.
- Cycles are impossible by construction (invariant 3 in §4.3), so no cycle guard is needed — but an
  explicit visited-set makes the recursion safe anyway.

### 5.2 Two node contracts

Every node implements:

```
schematize(inputSchemas: Schema[]) -> Schema | undefined
validate(inputSchemas: Schema[], errors?: string[]) -> boolean
```

`validate` **appends** human-readable messages to `errors` and returns a boolean. Critically, the
validation combinators are **short-circuiting on `&&` but exhaustive on collections**:

```
validate(cond, message, errors)          // push message if !cond && errors is an array; return !!cond
validateAllItems(array, fn)              // reduce: runs fn for EVERY item, ANDs results
                                         //   (deliberately NOT short-circuiting — the user
                                         //    should see all the broken rows at once)
```

The default `UnaryNode.schematize` returns the input schema unchanged — correct for Sort, Filter,
Distinct, Drop, Limit, Slice.

---

## 6. Sources

### 6.1 The source contract

```
SourceNode extends QueryNode {
  ports      = []                      // always
  schema?:   Schema                    // resolved from the server
  parameters?: ParameterInfo[]         // declared parameters of the underlying artefact
  params?:   { [name]: value }         // user-supplied parameter values
}
```

```
ParameterInfo { name: string, type: Primitive|Enum, multiplicity: string, required: multiplicity === "1" }
```

Every source class provides:

| Member                                            | Purpose                                                         |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `static TYPE`, `TYPE_V1`, `LABEL`, `ICON`, `BETA` | registry + menu metadata                                        |
| `static fromCoordinates(id, coordinates)`         | build an **unresolved** source from what the picker returned    |
| `static fromModelV1(model)`                       | deserialise                                                     |
| `toModelV1()`                                     | serialise                                                       |
| `resolveV1(model, enums, schema)`                 | return a **new** source enriched with server metadata           |
| `updateParams(params)`                            | return a new source with different parameter values             |
| `describe()`                                      | one-line human description for the graph node and details panel |
| `validate(schemas, errors)`                       | see below                                                       |
| `schematize()`                                    | returns `this.schema`                                           |

**Resolution.** A source created from a picker has no schema. `resolveSourcesAsync(query)` collects
every `SourceNode` in the query, sends them to the engine as a bare graph, and receives
`{enums, nodes: {<nodeId>: {schema, name, owner(s), parameters, …}}}`. Each source is then replaced via
`resolveV1`. This happens on load, on source insert, and on explicit refresh.

**Serialisation shape (V1).** Uniform across source types:

```json
{
  "_type": "<TYPE_V1>",
  "id": "<nodeId>",
  "...type-specific properties...",
  "parameterValues": [ { "name": "asOfDate", "value": "2026-01-31" } ]
}
```

`parameterValues` is omitted entirely when there are no params. On read it is folded into a plain
`{name: value}` object.

**Validation.** Shared helper:

```
validateSource(name, schema, parameters, params, errors):
    validate(!!name,   "Required information about this source could not be resolved.")   // ERR_INFO
 && validate(!!schema, "Required schema of this source could not be resolved.")           // ERR_SCHEMA
 && validateParameters(parameters, params, errors)

validateParameters: for every required ParameterInfo, params[p.name] must be !== undefined
    message: `Required parameter "<name>" does not have a value.`
```

Note `validateParameters` uses a non-short-circuiting reduce so _all_ missing parameters are reported.

`describe()` returns the literal string `"(unknown)"` when the source has not been resolved.

### 6.2 Relational Database Table

```
TYPE_V1 = "relational"      LABEL = "Relational Database Table"      ICON = "fas fa-table"
coordinates = { connection: object (non-empty), schema: string, table: string }
```

- Serialised shape: `{_type:"relational", id, connection, schema, table, parameterValues?}` — the
  coordinates are spread directly onto the node, not nested.
- `validate` checks **only** `!!this.schema` (ERR_SCHEMA). No name, no parameters.
- `describe()` → `Table "<table>" from schema "<schema>"`. The connection is deliberately omitted
  because the rendered connection descriptor is very long.
- `resolveV1` ignores the server model and just attaches the schema.
- `coordinates` are validated at construction: `connection` non-empty object, `schema` and `table`
  non-empty strings.

**Picker flow** (`RelationalSources`), which is more involved than the other sources:

1. Load the list of known connections from **two** places in parallel, with `Promise.allSettled` so one
   failure doesn't kill the other:
   - every `relational` source inside every saved query in the query store (read raw envelopes, parse,
     harvest `coordinates.connection`, ignore any envelope that fails to parse);
   - metadata entities of classifier `meta::pure::runtime::PackageableConnection`.
2. User picks a connection, then presses **Test Connection**.
3. "Test Connection" calls the **store generation** endpoint, which introspects the database and
   returns its schemas/tables. Only then is the schema/table picker shown.
4. Changing the connection resets schema and table to undefined.

A source is only offerable when `connection` is valid **and** `schema` and `table` are non-empty strings.

### 6.3 Service

```
TYPE_V1 = "alloyService"    LABEL = "Service"            ICON = "fa fa-server"
properties: serviceId (required non-empty string), name?, owners?: string[]
coordinates: { id }   // the picker returns {id} and it becomes serviceId
```

- Serialised as `{_type:"alloyService", id, serviceId, parameterValues?}`.
- `describe()` → `name` or `"(unknown)"`.
- `validate` → `validateSource(...)`, so it requires name **and** schema **and** all required params.
- **Quirk to preserve:** the server returns the owners field as `owner` on the graph node but `owners`
  in metadata; read as `const {name, owner, owners = owner} = model`.
- **Quirk to preserve:** when a resolved service has no name, substitute the placeholder
  `"Name_toDefine"`. Without this the source fails validation with the unhelpful ERR_INFO message.

### 6.4 Data Browser Query

```
TYPE_V1 = "dataBrowser"     LABEL = "Data Browser Query"    ICON = "fa fa-database"
properties: guid (required non-empty string), name?, owner?: string
coordinates: { id }   // becomes guid
```

- Serialised as `{_type:"dataBrowser", id, guid, parameterValues?}`.
- Identical validation and description rules to Service (§6.3). `owner` here is a single string, not an array.
- This is the source type that motivated the `X-API-Key` header on TDS endpoints (§11.3) — parameterised
  Data Browser inputs require it.

### 6.5 PURE Native Function

```
TYPE_V1 = "pureNative"      LABEL = "PURE Native Function"   ICON = "fa fa-calculator"
properties: functionId (required non-empty string), name?
coordinates: { id }   // becomes functionId
```

- Serialised as `{_type:"pureNative", id, functionId, parameterValues?}`.
- Same validation/description rules. Parameters come from the function's declared signature, so this is
  the source most likely to have required parameters.

### 6.6 Source discovery

Catalogue-backed sources (service / data browser / native function) are all discovered through a single
engine call: `listInputs(type)` (§11.3). The results are normalised into a uniform picker item:

```
{ id, name, owner?, key: `input-${index}`, keys: string[] }   // keys are lower-cased search terms
```

- `keys` for a service: `[name, id, ...owners]`; for a data browser query: `[name, id, owner]`;
  for a native function: `[name, id]`.
- Sorted by `` `${name}#${id}` ``.
- Client-side substring filter over `keys`.
- **Result cap: 300.** If more match, truncate and show `"Too many matching items; list truncated."`.
  If none match, show `"No matching items found."`.
- When the current filter invalidates the selection, auto-reselect the first item.

### 6.7 Data Product / Ingest Definitions

A fifth source, to be defined by the implementer. It must implement the §6.1 contract: a `TYPE_V1`
discriminator, coordinates from a picker, `resolveV1` returning schema + parameters, and `validate`
delegating to `validateSource`. Nothing in the engine, graph, inference, or grid layers needs to know
it exists — registering it in the source registry is sufficient.

---

## 7. Transforms

Fourteen transforms, listed here in **menu order** (which is the order they appear in the sidebar and
the graph context menu, and is not alphabetical):

```
Sort, Group, Filter, Restrict, Rename, Distinct, Drop, Limit,
Slice, Concat, Join, Difference, Partition, Extend
```

Plus `Drilldown`, which is a transform class that never appears in the graph (§12.2), and `Unknown`,
a placeholder for transforms the client doesn't recognise (§7.16).

### 7.0 Reference table

| TYPE         | TYPE_V1            | Arity | INPUTS                    | Ports                 | Label                     |
| ------------ | ------------------ | ----- | ------------------------- | --------------------- | ------------------------- |
| `sort`       | `sort`             | 1     | `[input]`                 | `[tds]`               | Sort by Column            |
| `group`      | `groupBy`          | 1     | `[input]`                 | `[tds]`               | Group by Column           |
| `filter`     | `filter`           | 1     | `[input]`                 | `[tds]`               | Filter by Column          |
| `restrict`   | `restrict`         | 1     | `[input]`                 | `[tds]`               | Restrict Columns          |
| `rename`     | `rename`           | 1     | `[input]`                 | `[tds]`               | Rename Columns            |
| `distinct`   | `distinct`         | 1     | `[input]`                 | `[tds]`               | Distinct Values           |
| `drop`       | `drop`             | 1     | `[input]`                 | `[tds]`               | Drop first \<x\> rows     |
| `limit`      | `limit`            | 1     | `[input]`                 | `[tds]`               | Take first \<x\> rows     |
| `slice`      | `slice`            | 1     | `[input]`                 | `[tds]`               | Take rows \<x\> to \<y\>  |
| `concat`     | `concatenate`      | 2     | `[input1, input2]`        | `[tds1, tds2]`        | Concatenate Another Input |
| `join`       | `join`             | 2     | `[leftInput, rightInput]` | `[leftTds, rightTds]` | Join Another Input        |
| `difference` | `columnDifference` | 2     | `[leftInput, rightInput]` | `[tds1, tds2]`        | Compare Column Values     |
| `partition`  | `window`           | 1     | `[input]`                 | `[tds]`               | Apply Window Functions    |
| `extend`     | `extend`           | 1     | `[input]`                 | `[tds]`               | Extend Columns            |

PURE function signatures (needed if you emit PURE, and useful as canonical semantics):

```
sort       meta::pure::tds::sort_TabularDataSet_1__SortInformation_MANY__TabularDataSet_1_
groupBy    meta::pure::tds::groupBy_TabularDataSet_1__String_MANY__AggregateValue_MANY__TabularDataSet_1_
filter     meta::pure::tds::filter_TabularDataSet_1__Function_1__TabularDataSet_1_
restrict   meta::pure::tds::restrict_TabularDataSet_1__String_MANY__TabularDataSet_1_
rename     meta::pure::tds::renameColumns_TabularDataSet_1__Pair_MANY__TabularDataSet_1_
distinct   meta::pure::tds::distinct_TabularDataSet_1__TabularDataSet_1_
drop       meta::pure::tds::drop_TabularDataSet_1__Integer_1__TabularDataSet_1_
limit      meta::pure::tds::limit_TabularDataSet_1__Integer_1__TabularDataSet_1_
slice      meta::pure::tds::slice_TabularDataSet_1__Integer_1__Integer_1__TabularDataSet_1_
concat     meta::pure::tds::concatenate_TabularDataSet_1__TabularDataSet_1__TabularDataSet_1_
join       meta::pure::tds::join_TabularDataSet_1__TabularDataSet_1__JoinType_1__String_$1_MANY$__String_$1_MANY$__TabularDataSet_1_
extend     meta::pure::tds::extend_TabularDataSet_1__BasicColumnSpecification_MANY__TabularDataSet_1_
difference meta::protocols::tds::extension::columnValueDifference_TabularDataSet_1__TabularDataSet_1__String_$1_MANY$__String_$1_MANY$__String_$1_MANY$__TabularDataSet_1_
partition  meta::protocols::tds::extension::olapGroupBy_TabularDataSet_1__String_MANY__SortInformation_MANY__Pair_$1_MANY$__TabularDataSet_1_
```

Note that `difference` and `partition` are **extension** functions, not core TDS. Check they exist in
your target engine before promising them.

### 7.1 Sort

```
state:  sorts: ColumnDirection[]
V1:     {_type:"sort", id, sorts:[{column, direction:"Ascending"|"Descending"}]}
```

`ColumnDirection { column?: string, direction?: "ASC" | "DESC" }`. Internally `ASC`/`DESC`; the V1 wire
form is `Ascending`/`Descending`. Labels: "Asc"/"Desc"; descriptions: "Ascending"/"Descending".

- `schematize`: unchanged.
- `validate`: `sorts` non-empty ("Sorts cannot be empty."), then every entry validated:
  column present in schema (label "Sort column"), direction non-empty and known.
- `describe()`: `Sort by "<col>" Asc, "<col>" Desc` — missing values render as `(blank)`.
- Quick-action default (from the grid "Sort by X" context menu): `{column, direction: ASC}`.

### 7.2 Group

```
state:  columns: string[], aggregations: ColumnAggregation[]
V1:     {_type:"groupBy", id, columns, aggregations:[{name, column, aggregation}]}
```

- `schematize`: `[...columns.map(lookup), ...aggregations.map(a => a.schematize(schema))]`.
  Returns `undefined` unless every grouping column resolves **and** there is at least one aggregation
  and all aggregations schematize.
- `validate`:
  - `columns` may be empty (a global aggregate); if non-empty, must be unique and all present.
  - `aggregations` must be non-empty, each individually valid, and their output names unique.
- `describe()`: `Group by "a", "b"`.
- Quick-action default (grid "Group by X"): `columns=[X]`, `aggregations=[ColumnAggregation(X, Count)]`.

### 7.3 Filter

```
state:  filter?: Filter          (tree — see §8)
V1:     {_type:"filter", id, filter: <V1 filter tree>}
```

- `schematize`: unchanged.
- `validate`: `"Filter cannot be empty."` if absent, then delegates to the filter tree.
- `describe()`: `Filter by <filter.toString()>`.
- Quick-action default (grid "Filter by X" with the clicked cell's value): `ColumnComparisonFilter(X, Equal, value)`.

### 7.4 Restrict

```
state:  columns: string[]
V1:     {_type:"restrict", id, columns}
```

- `schematize`: `schema.columns.filter(c => columns.includes(c.name))` — note this preserves the
  **input** schema's column order, _not_ the order the user picked them in. Returns `undefined` if
  `columns` is empty or any name is unknown.
- `validate`: non-empty, unique, all present.
- `describe()`: `Restrict Columns to: "a", "b"`.

### 7.5 Rename

```
state:  mappings: [oldName, newName][]
V1:     {_type:"rename", id, mappings:[{from, to}]}
```

(The internal/PURE form uses `{first, second}`; V1 uses `{from, to}`.)

- `schematize`: map over input columns, replacing the name where a mapping matches; types unchanged;
  **order preserved**. Returns `undefined` if `mappings` is empty or any `from` is unknown.
- `validate`, per mapping (all five checks, in order):
  1. old column present in schema (label "Old column");
  2. new name non-empty — `"New column name cannot be empty."`;
  3. new name matches `/^[A-Za-z0-9_ ]{1,100}$/u` — `"New column name is not valid column name."`;
  4. `old !== new` — `` `New column name "<new>" cannot be the same as old column name.` ``;
  5. neither the old nor the new name appears in any _other_ mapping —
     `` `New column name "<new>" cannot be the same as other column name.` ``
     Plus `mappings` non-empty: `"Column renames cannot be empty."`
- `describe()`: `Rename 3 Columns` (singular "Column" when 1).

### 7.6 Distinct

No state. `schematize` unchanged, `validate` always true. `describe()` → `Distinct Values`.

### 7.7 Drop / 7.8 Limit

```
state:  size?: number     default 10
V1:     {_type:"drop"|"limit", id, size}
```

- `schematize`: unchanged.
- `validate`: `validateSize` — must be a safe integer `> 0`; `"Size must be a positive whole number."`
- `describe()`: `Drop first 10 row(s)` / `Take first 10 row(s)`; `(blank)` when undefined.

> **Constructor subtlety.** `this.size = arguments.length > 1 ? size : DEFAULT_SIZE`. Passing an
> explicit `undefined` yields `undefined` (invalid, so the user sees an error); passing nothing yields
> `10`. Reproduce this — it is what lets the user clear the field and see a validation message rather
> than silently getting 10.

### 7.9 Slice

```
state:  start? (default 10), stop? (default 20)
V1:     {_type:"slice", id, start, stop}
```

- `validate`: `validateRange` — `start` is a whole number `>= 0` ("Start row index must be a whole
  number."), `stop` likewise ("Stop row index must be a whole number."), and
  `"Start row index must be less than stop row index."`
- `describe()`: `Take rows 10 to 20`.
- Same `arguments.length` defaulting trick as Drop/Limit, for both parameters.

### 7.10 Concat

Binary, no state.

- `schematize`: `schema1.equals(schema2) ? schema1 : undefined`.
- `validate`: `"Both input schemas must be identical."`
- `describe()`: `Concatenate additional input`.

Remember `Schema.equals` is **order-sensitive**. Users will hit this; the details panel should say so.

### 7.11 Join

```
state:  leftColumns: string[], rightColumns: string[], joinType: "INNER"|"LEFT_OUTER"|"RIGHT_OUTER"
        default joinType = LEFT_OUTER
ports:  ["leftTds", "rightTds"]
V1:     {_type:"join", id, joinType:"Inner"|"LeftOuter"|"RightOuter",
                           joinColumns:[{left, right}]}
```

`joinColumns` is produced by **zipping** `leftColumns` and `rightColumns` positionally.

Internal ↔ V1 join-type mapping: `INNER→Inner`, `LEFT_OUTER→LeftOuter`, `RIGHT_OUTER→RightOuter`.
Descriptions: "Inner", "Left Outer", "Right Outer".

**Output schema** (`buildJoinSchemaColumns`) — the column ordering is specific and must be matched:

```
1. left  join columns, in the order given
2. right join columns, in the order given
3. remaining left  columns, in left schema order
4. remaining right columns, in right schema order
   (deduplicated by name against everything already emitted; an `exclude` set is also honoured —
    used by Difference, §7.12)
```

**Duplicate-column rule.** This is the one genuinely subtle join rule.

```
getDuplicateJoinColumns(s1, s2, cols1, cols2, extra?):
    matching = names where cols1[i] === cols2[i]      // positionally matching join keys
    applied  = extra ? union(extra, matching) : matching
    dupes    = intersection(s1.names(), s2.names()) \ applied
```

i.e. a column name appearing in **both** inputs is only acceptable if it is a join key that is
spelled identically on both sides (or, for Difference, is one of the difference columns). Anything else
is an error:

```
"Duplicate column names between inputs are not supported if they are not part of the join columns: "a", "b""
```

**Validation order:**

1. left join columns non-empty — `"Left join columns cannot be empty."`
2. right join columns non-empty — `"Right join columns cannot be empty."`
3. same length — `"Number of left join columns must be the same as number of right join columns."`
4. per pair: left column present ("Left join column"), right column present ("Right join column"),
   and types compatible — `` `Join columns "<l>" and "<r>" must be of compatible types.` ``
5. the duplicate rule above.

**Autofix.** When the duplicate rule fires, the details panel offers a one-click fix (`renameInputs`):
for each incoming connection _i_ (1-based), splice a `Rename` node in front of it that renames every
offending column `c` to `c_<i>`. Implementation: for each incoming connection, create a `Rename` node,
remove the original connection, and add two connections `(source → rename)` and `(rename → target, originalPort)`.

`describe()` → `Join additional input` (deliberately generic).

### 7.12 Difference ("Compare Column Values")

```
state:  joinColumns1: string[], joinColumns2: string[], differenceColumns: string[]
ports:  ["tds1","tds2"]  (default binary)
V1:     {_type:"columnDifference", id, joinColumns:[{left,right}], differenceColumns}
```

Joins two inputs on the given key columns and, for each _difference column_, emits the left value, the
right value, and their numeric difference.

**Output schema:**

```
buildJoinSchemaColumns(s1, s2, joinColumns1, joinColumns2, exclude = differenceColumns)
  ++  for suffix in ["_1", "_2", "_valueDifference"]:        // outer loop
          for name in differenceColumns:                      // inner loop
              SchemaColumn(`${name}${suffix}`, Float)
```

Note the loop nesting: with difference columns `[a, b]` the output order is
`a_1, b_1, a_2, b_2, a_valueDifference, b_valueDifference` — **not** grouped per column.
The type is **always `Float`**, matching the back-end implementation, even if the inputs were Integer.

**Validation:**

1. the full join-column validation from §7.11;
2. difference columns: non-empty ("Difference columns cannot be empty."), unique, and for each:
   present in **both** schemas (label "Difference column"),
   `` `Difference column "<n>" must have same type in both input schemas.` `` (strict `equals`, not
   compatibility), and `` `Difference column "<n>" must be of numeric type.` ``;
3. the duplicate rule, with `differenceColumns` passed as `extra`.

`describe()` → `Compare Column Values`.

### 7.13 Partition (window functions)

Internally named `Partition` because `Window` confused the IDE; the V1 type is `window` and the UI calls
them "Window Functions".

```
state:  columns: string[]              // partition-by
        sorts: ColumnDirection[]       // order-within-partition
        aggregations: ColumnAggregation[]
V1:     {_type:"window", id, columns, sorts:[{column, direction}], operations:[<operation>]}
```

Operations have **two** V1 shapes depending on whether the aggregation is a rank:

```
rank:  {_type:"olapRank",        name, rank: "Rank"|"DenseRank"}
other: {_type:"olapAggregation", name, column, aggregation}
```

The PURE/internal form is a `Pair`: `{first: {column, function}, second: name}`.

- `schematize`: **input columns + one new column per aggregation** (the input is preserved, unlike
  Group which replaces it). `undefined` unless there is at least one aggregation and all schematize.
- `validate`:
  - partition `columns` unique ("Partition columns cannot have duplicates.") and each present
    (label "Partition column"). **May be empty** — an unpartitioned window.
  - every sort valid.
  - aggregations non-empty, each valid, output names unique.
- `describe()`: `Apply 2 Window Functions` (singular "Function" when 1).

### 7.14 Extend (computed columns)

```
state:  columns: ColumnExpression[]       // {name?, expression}
V1:     {_type:"extend", id, columns:[{name, expression}]}
```

- `schematize`: `[...input.columns, ...columns.map(c => SchemaColumn(c.name, resolveExpressionType(c.expression, schema)))]`,
  or `undefined` if validation fails.
- `validate`: `columns` non-empty ("Columns cannot be empty."), then per column:
  1. `` `"<name>" does not have an expression.` `` if the expression is null/undefined;
  2. `` `"<name>" does not have a valid type.` `` if the expression's type can't be resolved to a
     primitive or enum (resolution errors are swallowed and become `undefined`);
  3. the name must not already exist in the input schema —
     `` `Column "<name>" is already present in the input schema.` ``
     (`name` renders as `(blank)` when empty.)
- `describe()`: `Extend with "x", "y"`.

Expression type resolution is specified in §9.

### 7.15 Drilldown

A transform class that is **not** part of the query graph. It lives in `Meta` (§13) and drives the
grid's hierarchical mode. Fully specified in §12.2.

### 7.16 Unknown

When deserialising a node whose function/type is not in the registry, produce an `Unknown` node:
`ports = []`, `schematize() → undefined`, `validate() → false`, `describe() → Unknown Transform "<id>"`,
and `toModel()` **throws**. This lets a query authored by a newer client be loaded, displayed, and
inspected without crashing — it just can't be executed or re-saved.

Preserve this. It is the only reason forward-compatibility works at all.

---

## 8. Filters

### 8.1 Model

A filter is a tree of three node kinds:

```
ColumnComparisonFilter { columnName: string, operator: string, value?: any }
CompositeFilter        { operator: "And" | "Or", rules: Filter[] }
NotFilter              { rule: Filter }
```

Each carries a `key` (monotonic counter) for React identity.

Discrimination on deserialise, in this order: `model.rule` → NotFilter; `model.rules` → CompositeFilter;
otherwise ColumnComparisonFilter. (So the shape is self-describing; there's no `_type` in the internal form.)

### 8.2 Operators

```
Equal, NotEqual, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual,
StartsWith, DoesNotStartWith, EndsWith, DoesNotEndWith, Contains, DoesNotContain,
In, NotIn, IsEmpty, IsNotEmpty
```

Negation pairs (used for V1 encoding and for the UI's "not" toggle):

```
NotEqual↔Equal   DoesNotStartWith↔StartsWith   DoesNotEndWith↔EndsWith
DoesNotContain↔Contains   NotIn↔In   IsNotEmpty↔IsEmpty
```

**Operator availability by column type** — the single most user-visible table in the filter UI:

| Type                               | Available operators                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Boolean`                          | Equal, NotEqual, IsEmpty, IsNotEmpty                                                                                              |
| `String`                           | Equal, NotEqual, StartsWith, DoesNotStartWith, Contains, DoesNotContain, EndsWith, DoesNotEndWith, IsEmpty, IsNotEmpty, In, NotIn |
| `Enumeration`                      | Equal, NotEqual, IsEmpty, IsNotEmpty, In, NotIn                                                                                   |
| `Float` / `Integer` / `Number`     | Equal, NotEqual, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, IsEmpty, IsNotEmpty, In, NotIn                       |
| `Date` / `DateTime` / `StrictDate` | Equal, NotEqual, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, IsEmpty, IsNotEmpty, In, NotIn                       |

Groupings used for value-widget selection:
`EMPTY_OPERATORS = [IsEmpty, IsNotEmpty]` (no value widget),
`SET_OPERATORS = [In, NotIn]` (multi-value widget).

Human-readable descriptions, used verbatim in the UI and in `describe()`:

```
Equal "is"                        NotEqual "is not"
GreaterThan "is greater than"     GreaterThanOrEqual "is greater than or equal"
LessThan "is less than"           LessThanOrEqual "is less than or equal"
StartsWith "starts with"          DoesNotStartWith "does not start with"
Contains "contains"               DoesNotContain "does not contain"
EndsWith "ends with"              DoesNotEndWith "does not end with"
In "is in list of"                NotIn "is not in list of"
IsEmpty "is empty"                IsNotEmpty "is not empty"
```

### 8.3 Validation

- `ColumnComparisonFilter`: column must exist in the schema, then the value:
  - `SET_OPERATORS` → must be a **non-empty array**;
  - `EMPTY_OPERATORS` → no value required;
  - otherwise → must not be null or undefined.
    Failure message: `"Filter value is required."` (Value _type_ is not checked against the schema — a
    known gap, flagged in §21.)
- `CompositeFilter`: `rules` non-empty (`"Composite filter cannot be empty."`), every rule valid.
- `NotFilter`: delegates.

### 8.4 V1 wire format

Column reference: `{_type:"column", column:"<name>"}`.

```
Equal              -> {_type:"equal",            left: <col>, right: <value>}
LessThan           -> {_type:"lessThan",         left: <col>, right: <value>}
LessThanOrEqual    -> {_type:"lessThanEqual",    left: <col>, right: <value>}
GreaterThan        -> {_type:"greaterThan",      left: <col>, right: <value>}
GreaterThanOrEqual -> {_type:"greaterThanEqual", left: <col>, right: <value>}

StartsWith         -> {_type:"startsWith",       string: <col>, value: <value>}
EndsWith           -> {_type:"endsWith",         string: <col>, value: <value>}
Contains           -> {_type:"stringContains",   string: <col>, value: <value>}

IsEmpty            -> {_type:"isEmpty",          value: <col>}
In                 -> {_type:"in",               value: <col>, values: <array>}

And                -> {_type:"and", rules:[...]}
Or                 -> {_type:"or",  rules:[...]}
Not                -> {_type:"not", rule: {...}}
```

**All six negative operators are encoded as `not` wrapping their positive counterpart.** There is no
`notEqual` wire type. Any operator that can't be mapped throws
`operator "<op>" is not supported in TDS v1 protocol`.

**Decoding** must reverse this, including flattening: a `not` whose child is a simple comparison
becomes the negated operator on a single `ColumnComparisonFilter` rather than a `NotFilter` wrapper.
Only when the child is composite does a real `NotFilter` survive.

### 8.5 Filter builder UI

- The root is always normalised to a `CompositeFilter`: `undefined` → `CompositeFilter(And, [ColumnComparisonFilter("(blank)")])`;
  a bare comparison → wrapped in `CompositeFilter(And, [it])`.
- On emit, a composite with exactly one rule is **unwrapped** back to that rule. So the stored model
  stays minimal while the editor always has a container to add rows to.
- Changing a row's column **resets operator to Equal and clears the value** if the new column's type
  differs from the old one.
- Changing a row's operator clears the value when switching into/out of `EMPTY_OPERATORS`, or when
  switching between single-value and multi-value (`SET_OPERATORS`) shapes.
- Value widget selection (`OmniSelector`):
  - multi + primitive (not Boolean) → free-text multi-value entry;
  - multi + enum → multi-select from the enum's values;
  - single + enum → single-select from the enum's values;
  - otherwise → typed single-value input.
- Filters referencing unsupported constructs render `"This filter is not supported yet."` instead of
  the editor, so an unparseable filter is never silently mangled.

---

## 9. Expressions (for Extend)

Extend columns hold an arbitrary **TDS expression** object. The client does not parse or build these —
it round-trips them through the engine's grammar endpoints — but it **does** infer their result type
locally, because the result type is needed for the output schema.

### 9.1 Editing flow

1. Open the Expression Editor modal. If an expression already exists, call
   `expressionToText(expression)` to render it as grammar source.
2. The user edits free text, with the input schema's columns listed alongside as
   `[columnName]  #Type`.
3. **Validate** (button, or `F10`) calls `textToExpression(text)`. Success stores the object and
   enables Apply; failure shows the error in a read-only error box.
4. Any text edit invalidates the stored object, disabling Apply until re-validated.
5. Engine error messages are truncated at the first `###` (the standard PURE error trailer).

### 9.2 Local type inference

```
resolveExpressionType(expr, schema) -> Primitive | Enum        (throws)
resolveExpressionTypeSafe(...)      -> ... | undefined         (swallows)
```

Literals first:

| JS value                 | Type      |
| ------------------------ | --------- |
| boolean                  | `Boolean` |
| safe integer             | `Integer` |
| other number             | `Number`  |
| string starting with `%` | `Date`    |
| other string             | `String`  |

Then by `expr._type`, with four special cases handled before the lookup table:

```
"min" / "max"  -> resolveExpressionType(expr.values[0], schema)   // values must be a non-empty array
"column"       -> schema.type(expr.column)   (throws `unknown column: "<c>"` if absent)
"if"           -> resolveExpressionType(expr.truth, schema)       // the then-branch
```

(Only the first element / then-branch is inspected; the other branches are assumed consistent.)

Everything else is a static lookup:

| Returns   | `_type` values                                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Boolean` | greaterThan, greaterThanEqual, lessThan, lessThanEqual, parseBoolean, stringContains, startsWith, endsWith, and, or, not, equal, isEmpty, in, matches                                                                                                                                                                         |
| `Date`    | parseDate, adjust, now, today, firstDayOfThisMonth, firstDayOfThisQuarter, firstDayOfThisYear, mostRecentDayOfThisWeek, previousDayOfThisWeek, firstDayOfMonth, firstDayOfQuarter, firstDayOfWeek, firstDayOfYear, mostRecentDayOfWeek, previousDayOfWeek, datePart                                                           |
| `Number`  | absolute, exp, log, floor, ceiling, round, sin, asin, cos, acos, tan, atan, atan2, sqrt, plus, minus, times, mean, stdDevSample, stdDevPopulation, pow, divide, rem, pi, parseInteger, parseFloat, stringIndexOf, length, dateDiff, year, quarterNumber, monthNumber, weekOfYear, dayOfWeek, dayOfMonth, hour, minute, second |
| `String`  | toUpper, toLower, trim, toString, substring, stringConcatenate                                                                                                                                                                                                                                                                |

Unknown `_type` throws `unknown expression type: "<t>"`.

This table was hand-extracted from the engine's return-type annotations and **will drift**. Treat it as
data, keep it in one file, and add a test that fails loudly when the engine rejects an expression whose
type the client thought it knew.

---

## 10. Aggregations and window functions

```
Count, DistinctCount, DistinctValue, Sum, Average, Min, Max, Rank, DenseRank
```

Display names: `DistinctCount → "Distinct Count"`, `DistinctValue → "Distinct Value"`,
`DenseRank → "Dense Rank"`; all others render as-is. Unknown values pass through unchanged so a query
from a newer client still displays sensibly.

### 10.1 Availability by column type

| Column type                     | Offered aggregations                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| Enum                            | **Count only** (distinct aggregations are explicitly not yet supported) |
| Date / DateTime / StrictDate    | Count, DistinctCount, DistinctValue, Min, Max                           |
| Float / Integer / Number        | Count, DistinctCount, DistinctValue, Sum, Average, Min, Max             |
| anything else (Boolean, String) | Count, DistinctCount, DistinctValue                                     |

`Rank` and `DenseRank` are **window-only** and are not offered in this list; they appear only in the
Partition editor, and they take **no column**.

### 10.2 Result types

```
Count, DistinctCount          -> Integer
DistinctValue                 -> same as the input column
Min, Max on a date column     -> same as the input column
Sum, Average, Min, Max        -> same as the input column (numeric)
Rank, DenseRank               -> Integer
Enum column + non-Count agg   -> undefined   (i.e. invalid)
any other mismatch            -> undefined
```

### 10.3 `ColumnAggregation`

```
ColumnAggregation { column?: string, aggregation?: string, name?: string }
```

**Auto-naming** when `name` is not supplied:

- rank with no column → the aggregation's display name (`"Rank"`, `"Dense Rank"`);
- column + known aggregation → `` `${column} ${describeAggregation(aggregation)}` `` e.g. `"Notional Sum"`;
- otherwise undefined.

Serialised forms:

```
internal / PURE   {name, column, function}
V1 (groupBy)      {name, column, aggregation}
V1 (window)       {_type:"olapRank", name, rank} | {_type:"olapAggregation", name, column, aggregation}
PURE pair         {first:{column, function}, second:name}
```

The `function` field arrives enum-qualified and must be unqualified on read.

**Validation**, in order:

1. `"Aggregation function cannot be empty."` / `` `Aggregation function "<a>" is unknown.` ``
2. if rank: `` `Aggregation function "<a>" does not allow column.` `` when a column is set;
   otherwise: column must exist (label "Aggregation column"), then
   `` `Aggregation function "<a>" is incompatible with column "<c>".` ``
3. `"Aggregation output name cannot be empty."`, then
   `` `Aggregation output name "<n>" cannot be the same as input column name.` ``

---

## 11. The engine interface

### 11.1 Contract

Everything the domain needs from a backend, and the only place HTTP should appear:

```ts
interface CubeQueryEngine {
  // ---- source discovery -------------------------------------------------
  listInputs(type?: string): Promise<InputDescriptor[]>;
  listMetadataEntities(classifier: string): Promise<Entity[]>;
  generateStore(input: object): Promise<StoreDescriptor>; // relational introspection

  // ---- schema resolution ------------------------------------------------
  resolveGraph(graph: GraphModel): Promise<{
    enums: EnumModel[];
    nodes: Record<
      NodeId,
      {
        schema?: ColumnModel[];
        name?: string;
        owner?: string | string[];
        parameters?: ParameterModel[];
      }
    >;
  }>;

  // ---- execution --------------------------------------------------------
  execute(request: GraphRequest): Promise<{ columns: Column[]; rows: Row[] }>;
  executeStream(
    request: GraphRequest,
    format: 'csv' | 'xlsx',
  ): Promise<ReadableStream>;

  // ---- expressions ------------------------------------------------------
  textToExpression(code: string): Promise<object>;
  expressionToText(expression: object): Promise<string>;

  // ---- publishing (optional capability) ---------------------------------
  generateCode(request: GraphRequest): Promise<GeneratedCode>;
  getService(pattern: string): Promise<ServiceModel | null>;
  registerService(service: ServiceModel): Promise<RegistrationResult>;
  testService(service: ServiceModel): Promise<unknown>;
  generateTestData(request: GraphRequest): Promise<string>;
  generateTestResults(
    request: GraphRequest,
    testInput: string,
  ): Promise<string>;
}
```

Declare the publishing group as an **optional capability** so a Legend deployment without service
registration can still run Cube with those menu items hidden.

### 11.2 Request construction

```
toGraphRequest(query) = {
  graph:    { nodes: query.nodes.map(toGraphNode) },
  captures: [ { nodeId: query.selected } ]
}

toGraphNode(query, node) = {
  ...node.toModelV1(),
  // one property per declared input, in PORT order:
  [node.constructor.INPUTS[i]]: { _type: "nodeRef", id: <id of node connected to ports[i]> }
}
```

Assertions: `INPUTS.length === resolved input ids length`. Source nodes contribute no input properties.

There are no `connections` in the V1 graph — the edges are inlined as `nodeRef` properties.

### 11.3 Reference implementation: the TDS HTTP API

Base URL from configuration (`executionServer`).

| Method | Path                                                               | Body / Query                                          | Response                                           |
| ------ | ------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------- |
| GET    | `/api/tds/v1/inputs`                                               | `?type=<TYPE_V0>`                                     | `InputDescriptor[]`                                |
| POST   | `/api/tds/v1/metadata`                                             | `graph`                                               | `{enums, nodes}`                                   |
| POST   | `/api/tds/v1/execute`                                              | `GraphRequest`; `?format=csv\|xlsx&sqlExecute=<bool>` | `{columns, rows}` or a byte stream                 |
| POST   | `/api/tds/v1/generate`                                             | `GraphRequest`                                        | `{lambda, mapping, database, connection, runtime}` |
| POST   | `/api/tds/v1/generateTestData`                                     | `GraphRequest`                                        | text                                               |
| POST   | `/api/tds/v1/generateExpectedResults`                              | `{graphRequest, testInput}`                           | text                                               |
| POST   | `/api/tds/v1/grammar/transformGrammarToJson`                       | `{code}`                                              | expression object                                  |
| POST   | `/api/tds/v1/grammar/transformJsonToGrammar`                       | `{expression}`                                        | text                                               |
| POST   | `/api/store/v1/store`                                              | store-generation input                                | store descriptor                                   |
| GET    | `/api/service/v1/generation/active/resolved/uriTemplate/<pattern>` |                                                       | `{serviceSpecification_serviceMongoId}`            |
| GET    | `/api/service/v1/model/storage/<id>`                               |                                                       | `{modelData:{services:[…]}}`                       |
| POST   | `/api/service/v1/register_semiInteractive`                         | wrapped service                                       | registration result                                |
| POST   | `/api/service/v1/doTest`                                           | wrapped service                                       | test result                                        |

Also, against the _services_ base URL (`queryStore`):

| GET | `/metadata/api/classifiers/<classifier>?latest=true` | metadata entities |

Conventions worth carrying over:

- A fixed **`X-API-Key`** header is sent on TDS endpoints only. It exists to allow
  parameterised Data Browser inputs. Your Legend equivalent will differ, but keep the seam.
- `?type=` on `/inputs` takes the **V0** type name (`AlloyService`, `DataBrowserQuery`,
  `NativeFunction`, `LakeDataSet`), not the V1 one. If you keep this endpoint, keep the mapping; if you
  replace it, use V1 names and delete the mapping.
- Service register/test bodies are wrapped:
  `{_type:"composite", serializer:{name:"pure",version:"v1_1_0"}, data:{_type:"data", services:[service], serializer}}`.
- `getService` is a two-hop lookup: resolve the URI template to a mongo id, then fetch the model, then
  dig out `modelData.services[0]`, returning `null` at any miss.

### 11.4 HTTP client behaviour to preserve

- `credentials: "include"`, `mode: "cors"`, `redirect: "manual"` by default so auth redirects are not
  silently followed; the engine clients override to `redirect: "follow"`.
- **Re-authenticate and retry once** on a 401-ish response _or_ on a `TypeError: Failed to fetch`
  (missing CORS headers make a failed auth look exactly like a CORS error). Never retry twice.
- `204 No Content` → resolve `undefined`.
- No `Content-Type` on GET (avoids a CORS preflight).
- Error handling: read the body as text; if it parses as JSON with a `message`, use that; else use the
  raw text; else `"Server error without any additional information occurred."`. **Truncate to 500
  characters.** Attach the trace id and trace URL to the error object so the UI can offer a trace link.
- Downloads are performed by POSTing a hidden form into a hidden iframe (`id="download-container"`),
  not via fetch, so the browser handles the file save.

---

## 12. Results grid

### 12.1 Two modes

A toggle switches the grid between:

| Mode                      | Row model            | Behaviour                                                                                                                                                                         |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server-side** (default) | lazy, paged          | Every grouping/sorting interaction **re-derives the query** and re-executes against the engine. Supports unlimited data and drill-down.                                           |
| **Local**                 | everything in memory | One execution; afterwards ag-Grid does grouping, pivoting, filtering, aggregation client-side. Enables the column/filter tool panels, status bar, row-group and pivot drop zones. |

Switching modes resets the execution counter — the user must press Execute again.
Enabling a drill-down while in local mode **forces a switch back to server-side**.

Grid configuration constants: default column width `100`, group column width `200`, cache block size
`500`, null display value `"(null)"`, stats history capped at `15` entries, export "exporting…" banner
timeout `3000 ms`.

Column types are derived from schema types: numeric → `Number` (right-aligned, numeric filter,
agg funcs count/sum/avg/min/max), date → `Date`, enum or String → `Text`, anything else → untyped.
Non-numeric columns only offer `count` as a local aggregation.

**Execution is explicit.** Nothing runs until the user presses Execute (or `F9`). Editing the query
after an execution marks the grid _stale_ rather than auto-refreshing.

### 12.2 Drill-down

Drill-down turns the flat result into an expandable hierarchy, **without adding anything to the query
graph**. The configuration lives in `Meta`:

```
Drilldown {
  columns:      string[]              // the hierarchy levels, outermost first
  aggregations: ColumnAggregation[]   // explicit measures
  fullSchema:   boolean = true        // auto-aggregate every other column
  excludeKeys:  boolean = false       // when auto-aggregating, skip the hierarchy columns
}
isEmpty := columns=[] && aggregations=[] && fullSchema=true && excludeKeys=false
```

Its node id and type are both the literal `"drilldown"`, and `schematize()` always returns `undefined`
because it is never part of the graph.

**Effective aggregation list:**

```
buildGroupAggregations(schema, drilldown) =
    schema.columns
      .filter(c => drilldown.fullSchema
                && (!drilldown.excludeKeys || !drilldown.columns.includes(c.name))
                && !drilldown.aggregations.some(a => a.column === c.name))
      .map(c => ColumnAggregation(c.name, Count))
      .concat(drilldown.aggregations)
```

i.e. explicit aggregations win; with `fullSchema` on, every remaining column gets a `Count`.

**Query derivation** — on each grid expansion, ag-Grid supplies the expanded `groupKeys`; the client
builds a _derived_ query by appending nodes to the user's query (the user's query is never mutated):

```
deriveQuery(query, groupColumns, groupKeys, aggregations, sorts, limit):
    1. FILTER   one equality predicate per already-expanded level:
                  value === undefined ? IsEmpty : Equal
                  (single rule stays bare; 2+ rules become CompositeFilter(And, rules))
    2. GROUP    columns = (groupColumns.length === 0 || fully expanded)
                            ? []                                   // leaf level: no grouping
                            : groupColumns.slice(0, groupKeys.length + 1)
    3. SORT     see below
    4. LIMIT    appended only when limit > 0
```

Each step appends after `query.selected` and only if its condition holds.

**Sort remapping** is the fiddly part:

```
leaf = grouping && groupColumns.length === groupKeys.length
keep a sort s only if:
     not grouping
  || (!leaf && effectiveGroupColumns.includes(s.column))
  || aggregations.some(a => a.name === s.column)
then: if s.column names an aggregation AND we are at the leaf level,
      rewrite it to sort by that aggregation's SOURCE column instead
```

Rationale: at the leaf level there is no aggregation, so sorting by `"Notional Sum"` must become
sorting by `"Notional"`.

**Key/value round-tripping.** ag-Grid group keys are strings; `undefined`/`null` must survive:

```
convertValueToKey(v) = (v === undefined || v === null) ? "(null)" : v
convertKeyToValue(k) = (k === "(null)") ? undefined : k
```

These two **must be kept in sync**.

**`CUBE AUTO COUNT`.** When serialising a drill-down to the legacy PURE form, an extra
`ColumnAggregation(columns[0], Count)` named `"CUBE AUTO COUNT"` is prepended, and filtered back out on
read. It is a marker column that drove the old back-end's hierarchy support. **Do not port this** unless
your engine needs it; it is V0 baggage.

**Entering drill-down:** the grid context menu's "Drilldown by \<col\>" appends that column to
`meta.drilldown.columns` (creating the Drilldown if absent).

### 12.3 Result caching

The server-side data source keys its cache on `JSON.stringify({groupKeys, valueCols, sortModel})` and
caches the whole result set per key, slicing `[startRow, endRow)` out of it for each block request.
`destroy()` drops the cache; `getRows` must no-op if called after destroy. The cache is **unbounded** —
a known leak (§21).

Explicitly unsupported in the server-side source, asserted rather than silently ignored:
pivot mode (`grid source: pivoting is not supported yet`) and filter model
(`grid source: filtering is not supported yet`).

### 12.4 Context menu

On right-clicking a cell (requires a column; otherwise no menu):

```
[server-side mode only:]
  Drilldown by "<Header>"       icon fa-th-list
  Sort by "<Header>"            icon = Sort.ICON
  Group by "<Header>"           icon = Group.ICON
  Filter by "<Header>"          icon = Filter.ICON     (uses the clicked cell's value)
  separator
Format Column                   enabled only for Number columns
autoSizeAll, resetColumns, separator, copy, copyWithHeaders
Export ▸ csvExport, excelExport
```

The Sort/Group/Filter items create real transform nodes in the query (spliced after the selected node),
using the quick-action defaults in §7.1/7.2/7.3.

### 12.5 Export

- **CSV** and **XLSX**, via `executeStream(request, format)` → browser download
  (`export.csv` / `export.xlsx`).
- A transient "exporting" banner shows for 3 s.
- Export requires a valid query.
- Each export appends a stats entry just like an execution.

### 12.6 Execution statistics

Every execution and export records `StatsEntry { label, timestamp, duration, traceId, sql }`,
capped at the 15 most recent, shown in a popover. `sql` is extracted from the engine response's
activity list when available (look for an activity whose type ends in `::TdsExecuteActivity` and
concatenate its `relationalActivities[].sql`). The popover offers copy-to-clipboard and a trace link.

### 12.7 Row limit

A user-settable display limit, persisted to local storage, applied client-side after execution.
`convertData(data, limit)` converts the compact `rows: [[v1, v2, …]]` wire form into
`{columns, rows: [{colName: value}], limited: boolean}`, truncating to `limit` and setting
`limited = true` when truncation occurred so the UI can warn.

---

## 13. Presentation metadata (`Meta`)

Saved alongside the query, but not part of it:

```
Meta {
  presentation: PresentationInfo
  drilldown?:   Drilldown
  rest:         object            // anything the client doesn't understand — PRESERVED VERBATIM
}
```

`rest` is a deliberate forward-compatibility hatch: unknown keys survive a load/save round trip.
Keep it.

```
PresentationInfo {
  showGraph:    boolean = true         // graph panel expanded?
  columnHints:  ColumnHint[]           // formatting
  columnWidths: ColumnWidth[]          // {field, width}
}
```

Serialisation prunes defaults: `showGraph` is omitted when true, and `PresentationInfo.toModel()`
returns `undefined` entirely when everything is at its default.

`Meta.validate(schema)` → true unless there is a drill-down, in which case the drill-down must validate
against the current capture-node schema. This is why editing the query re-validates the meta.

### 13.1 Column formatting

```
ColumnFormat {
  type?: "number" | "currency" | "percentage"
  decimalPlaces?: integer
  currencySymbol?: string
  thousandsSeparator?: boolean
  redIfNegative?: boolean
  parenthesesIfNegative?: boolean
}
```

- Rendering uses `Intl.NumberFormat` with `style` = decimal / currency / percent and
  `useGrouping = !!thousandsSeparator`.
- `decimalPlaces >= 0` pins both min and max fraction digits; otherwise min 0 / max 20.
- Currency symbols map to ISO codes: `$→USD, €→EUR, £→GBP, ¥→JPY`. **An unrecognised symbol silently
  falls back to decimal style.** (Replacing symbols with ISO codes outright is a listed TODO — do it in
  the rebuild.)
- `parenthesesIfNegative` renders `-1234` as `(1,234)` by formatting the absolute value.
- A format with no `type` serialises to `undefined` and is dropped.
- Group rows whose aggregation is a count are **not** formatted (a count is not money).

`ColumnHint { format, type, field? }` attaches a format to a specific field, or to an entire column
_type_ when `field` is undefined. Resolution prefers an exact field match, then a type-wide hint.
Applying a format "to all" replaces every hint of that type with a single field-less one.

Only `Number` columns are formattable.

---

## 14. Persistence

### 14.1 ⚠️ The storage-format trap

**The saved envelope currently uses the V0 protocol, not V1.**

```
toEnvelope(query, meta, name) = { query: <V0 TdsGraphRequest>, meta: <Meta model>, name }
```

V1 is used for _execution_; V0 is used for _storage_. Dropping V0 — which is the agreed scope — therefore
requires two things that are easy to overlook:

1. **Define a new storage format.** Recommended: store the V1 graph request directly, plus a
   `formatVersion` discriminator:

   ```json
   { "formatVersion": 2,
     "query": { "graph": { "nodes": [...] }, "captures": [ { "nodeId": "..." } ] },
     "meta":  { "presentation": {...}, "drilldown": {...} },
     "name":  "..." }
   ```

   Note V1 has no separate `connections` array and no capture _node_ — the edges are inlined and the
   capture is a node id. Round-tripping V1 → `Query` is therefore straightforward: read `captures[0].nodeId`
   as `selected`, and reconstruct `Connection(sourceId, nodeId, ports[i])` from each node's
   `INPUTS[i] → {_type:"nodeRef", id}` property.

2. **Write a read-only V0 importer**, or accept that every existing saved query becomes unreadable.
   The V0 shape, for reference:

   ```json
   { "graph": { "nodes": [ { "id", "referenceId": {"functionId"} | {"type","id"},
                             "parameterValues": [{"name","value"}] } ],
                "connections": [ { "source": {"id"},
                                   "target": {"id","parameterName"} } ] },
     "captureNodes": [ { "id": "capture" } ] }
   ```

   with a synthetic node `id: "capture"` whose function is
   `apps::global::dsb::sandbox::tds::blocks::tds::asJSON_TabularDataSet_1__JSONResult_1_`, connected via
   parameter name `tds`. The real capture node is the **source of the connection whose target is
   `capture`**; the capture node and its connections are stripped on read.
   A node is a transform iff its `referenceId` has a `functionId` (matched against the function
   signatures in §7.0); otherwise it's a source, matched on `referenceId.type` against the V0 type
   names (`AlloyService`, `DataBrowserQuery`, `NativeFunction`, `LakeDataSet`, `Relational`).

   Decide explicitly whether to import, migrate-on-save, or abandon the existing corpus. **Surface this
   to stakeholders before building.**

### 14.2 Load pipeline

```
fromEnvelope(model):
    query = parse(model.query)
    query = await resolveSourcesAsync(query)       // one engine round-trip for all sources
    meta  = Meta.fromModel(model.meta)

    // legacy migration, still live:
    if a node with id or type "drilldown" exists in the graph:
        remove it from the query and move it into meta.drilldown
```

That last step migrates pre-Meta queries where drill-down was a graph node. Keep it as long as you
import legacy envelopes; drop it with the V0 importer.

### 14.3 Query store API

The existing Dropwizard service, for reference when mapping onto Legend's persistence:

| Method | Path                                                        | Notes                                                           |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/api/queryStore`                                           | create; returns `{id, version}`; creator auto-added to `owners` |
| PUT    | `/api/queryStore/{id}/{version}`                            | update; `version` must equal current, else 400                  |
| DELETE | `/api/queryStore/{id}/{version}?permanent=`                 | soft by default                                                 |
| GET    | `/api/queryStore/{id}`                                      | latest version                                                  |
| GET    | `/api/queryStore/{id}/{version}`                            | specific version; version ≥ 1                                   |
| GET    | `/api/queryStore/{id}/all`                                  | all versions                                                    |
| GET    | `/api/queryStore?owner=&creator=&name=&tag=&includeBodies=` | search; `tag` repeats, matched with `$all`                      |

Document shape:

```
{ reference: {id, version}, name, owners: Set<string>, tags: Set<string>,
  created: {user, time}, lastUpdate: {user, time}, deleted?: bool,
  query: <envelope.query>, meta: <envelope.meta> }
```

Semantics to preserve regardless of backing store:

- **Optimistic concurrency.** The client sends the version it read; a mismatch is a 400 with
  `Cannot update version <v>. Current version is <c>.` (Implemented with Vermongo: the latest doc lives
  in the main collection, superseded versions in a shadow collection.)
- **Owner-only mutation.** Update and delete are rejected with 401 unless the caller is in `owners`:
  `Only current owners can update this query. Current owners are <list>`.
- Update is a **partial merge** — only non-null fields of the request (`query`, `meta`, `owners`,
  `tags`, `name`) overwrite.
- Mongo key encoding: query documents contain user-controlled keys that may include `.` and `$`, which
  Mongo forbids. A dot-encoder escapes them on write and unescapes on read. Any document store you
  target needs the equivalent, or a format that avoids dynamic keys.

### 14.4 Client-side query actions

- **New / Load / Paste** prompt for confirmation when there are unsaved changes:
  `"Unsaved changes to your query will be lost if you continue. Are you sure?"`, and the same message is
  wired to `beforeunload`.
- **Copy / Paste** move the whole envelope through the system clipboard as JSON.
- **Save** is disabled while the query is invalid.
- The load dialog lists saved queries with client-side search over `[id, name, ...owners]` (lower-cased).

---

## 15. Publishing: services, code, tests

### 15.1 Register as a service

A valid saved query can be published as a Legend service.

```
Service {
  name, pattern, owners: string[], documentation,
  execution: { _type:"tds", graph: <GraphRequest> },
  test:      { _type:"tds", data, expectedResult },
  autoActivateUpdates: boolean = true
}
serialised with  _type:"service",  package:"Package_toDefine"
```

- `pattern` is `` `/cube/${queryInfo.id}` ``.
- `name` and `documentation` are both the query name.
- **Owners validation: at least two owners, all non-empty, all distinct.** (Enforced by
  `validateOwners` — `length > 1`.) Owners are entered as a comma-separated string and split/trimmed.
- On open: look up any existing service at that pattern, keep its `test` and `autoActivateUpdates`, and
  **always rebuild `execution` from the current query**.
- Test data and expected results are auto-generated when missing (generate data → re-generate results
  from that data). **Errors from test generation are swallowed** — the dialog still opens.
- `\r` is stripped from test data and results.
- The service link shown after registration is
  `https://<servicesHost>/services#/<uriEncoded pattern without leading slash>`.

### 15.2 Show generated code

`generateCode(request)` returns five PURE artefacts — `lambda`, `mapping`, `database`, `connection`,
`runtime` — displayed in a read-only modal and joined with blank lines for copy-all. `lambda` is
required; `connection` and `runtime` default to empty strings.

---

## 16. Validation message catalogue

Reproduce these verbatim; they are what users read.

**Generic**

```
<Label> cannot be empty.
<Label> cannot have duplicates.
<Label> must be a collection.
<Label> does not have a name.
<Label> "<n>" is not present in the input schema.
<Label> "<n>" is already present in the input schema.
<Label> "<n>" is already present in the output schema.
Size must be a positive whole number.
Row index / Start row index / Stop row index must be a whole number.
Start row index must be less than stop row index.
```

**Graph-level**

```
This node requires more inputs. Please drag and drop another input to associate.
This node depends on some invalid inputs. Please correct these first.
This graph node is invalid.
```

**Sources**

```
Required information about this source could not be resolved.
Required schema of this source could not be resolved.
Required parameter "<name>" does not have a value.
```

**Join / Difference**

```
Left join columns cannot be empty.
Right join columns cannot be empty.
Number of left join columns must be the same as number of right join columns.
Join columns "<l>" and "<r>" must be of compatible types.
Duplicate column names between inputs are not supported if they are not part of the join columns: "a", "b"
Difference column "<n>" must have same type in both input schemas.
Difference column "<n>" must be of numeric type.
Both input schemas must be identical.
```

**Aggregations / sorts**

```
Aggregation function cannot be empty.
Aggregation function "<a>" is unknown.
Aggregation function "<a>" does not allow column.
Aggregation function "<a>" is incompatible with column "<c>".
Aggregation output name cannot be empty.
Aggregation output name "<n>" cannot be the same as input column name.
Sort direction cannot be empty.
Sort direction "<d>" is unknown.
```

**Rename / Extend / Filter**

```
New column name cannot be empty.
New column name is not valid column name.
New column name "<n>" cannot be the same as old column name.
New column name "<n>" cannot be the same as other column name.
"<name>" does not have an expression.
"<name>" does not have a valid type.
Filter cannot be empty.
Filter value is required.
Composite filter cannot be empty.
```

Placeholder for any missing value anywhere in the UI: **`(blank)`**.

---

## 17. User interface

This section specifies the UI as **required behaviour**, not as a component design. The rebuild is free
to use any rendering, layout, and state-management approach that satisfies these contracts. Where the
original's implementation encodes a requirement that isn't obvious, it's called out as
**[why]**; where it's merely how it happened to be built, it's marked _(original: …)_ and you should
feel free to ignore it.

### 17.1 Layout and regions

Four regions, all visible simultaneously:

```
┌────────────────────────────────────────────────────────────┐
│ Header                              realm badge, help menu │
├──────────┬─────────────────────────────────────────────────┤
│          │ Graph toolbar: name* | Undo Collapse | New Load │
│ Sidebar  │                        Save | Add Items ▾       │
│ palette  ├─────────────────────────────────────────────────┤
│          │ Graph canvas (collapsible)                      │
│  (collap-├─────────────────────────────────────────────────┤
│   sible) │ Grid toolbar: stale? local⇄server drilldown     │
│          │               limit | Execute Export Stats      │
│          ├─────────────────────────────────────────────────┤
│          │ Results grid                                    │
└──────────┴─────────────────────────────────────────────────┘
```

Requirements:

- The graph and the grid are **both always present**. Users work by editing the graph and
  re-executing; a modal or wizard flow would break the core loop.
- Collapsing the graph region is persisted _in the saved query_ (`presentation.showGraph`), not in
  local storage — **[why]** a query author can save a query that opens straight into the results.
- Sidebar collapsed state is per-user, in local storage.
- Each region owns an independent async-status surface, so a slow source resolution in the graph
  doesn't block or obscure the grid.

### 17.2 Palette (sidebar)

A flat, ordered list: the five sources, a divider, then the fourteen transforms in the menu order
given in §7. Each entry shows an icon and a label, and is a **drag source**.

- The same list appears in three places — sidebar, the "Add Items" dropdown, and the canvas context
  menu — and must stay in sync. Derive all three from one registry.
- A `BETA` flag on any source or transform renders a badge. (Currently nothing is flagged beta, but the
  mechanism is used when rolling out new node types.)
- Collapsed sidebar shows icons only, with the label as a tooltip.
- Empty-state prompt: _"Drag and drop items above to the query panel top right."_

### 17.3 Graph canvas

**Rendering requirements**

- Directed node-link diagram, laid out **left-to-right** (data flows left to right).
- Automatic layout. The user does not position nodes.
- **Layout must be deterministic.** _(original: nodes sorted by id and connections sorted by
  `port+source+target` before being handed to dagre.)_ **[why]** without a stable sort, an unrelated
  edit reshuffles the whole canvas and the user loses their place. This is a real requirement, however
  you lay out.
- Each node renders: its type icon, and its `describe()` text (§7) — _not_ its raw id. The id appears
  in the tooltip and the editor title.
- Edges into binary nodes are labelled **Left** / **Right** so the user can tell which input is which.
  _(original: inferred from the port name containing "right"/"2" — a `TODO` the rebuild should fix by
  labelling ports explicitly in the node metadata.)_
- Canvas height is capped at 60% of the viewport, so the grid is never pushed off-screen.

**Node visual states** — four, and they must be distinguishable at a glance:

| State          | Meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| normal         | valid                                                            |
| **selected**   | this is the capture node — its output is what executes           |
| **invalid**    | this node's own configuration is wrong; show its error list      |
| **incomplete** | missing inputs, or an upstream node is broken (`isSchemasError`) |

Tooltip content, in priority order: the node's errors (newline-joined, **deduplicated**) → otherwise
its description. If the validity entry is absent entirely, show
_"This node depends on some invalid inputs."_

**Empty state:** _"Load an existing query or [connect to a source] to start a new one."_ — the link
opens the source picker.

#### How the canvas is constructed

The original builds the canvas from scratch — there is no diagramming library, only a layout engine.
You are free to use a diagram component instead (React Flow and similar would cover most of this), but
the pipeline below is what the behaviour above actually requires, and the pitfalls at the end apply
either way.

**The pipeline**, re-run on every render — there is no persistent layout state:

```
1. Build a fresh directed graph
2. Insert nodes     — sorted by id
3. Insert edges     — sorted by (port + source + target)
4. Run layout       — the engine assigns each node an (x, y) and each edge a point list
5. Render nodes     — absolutely positioned boxes
6. Render edges     — one SVG polyline per edge, with an arrowhead marker
7. Size the canvas  — from the laid-out graph height, capped at 60% viewport
```

Steps 2 and 3 are where **[why] determinism** comes from: the layout engine's output depends on
insertion order, so feeding it unsorted model arrays makes the diagram jump whenever an unrelated edit
reorders them. Sort on the way in, every time.

Because layout is recomputed per render rather than stored, the canvas is a **pure function of the
query**. Undo, load, and every edit therefore "just work" with no layout invalidation logic. Keep this
property; it removes a whole class of bugs.

**Layout parameters** _(original: dagre)_

```
rankdir "LR"      ranksep 30      nodesep 30      marginX -32      marginY -32
node box          64 wide × 86 tall
canvas height     graph height + 84, capped at 60% of viewport height
```

**Node rendering.** Each node is an absolutely-positioned box containing a type icon and the
`describe()` text, wrapped in a hover tooltip and a click target that opens the editor.

Node identity for reconciliation is the `QueryNode.key` (§4.1), **not** the node id. Because an edit
replaces the node object with a fresh `key`, that item is torn down and rebuilt rather than updated.
That is harmless given edits commit on close (§17.5), but if you key by `id` instead you get cheaper
updates — just make sure a replaced node still re-renders.

**Edge rendering.** Each edge is its own absolutely-positioned `<svg>` sized to the bounding box of
its point list, containing a single `<path>`:

- the path is a **polyline** (`M … L … L …`) through the layout engine's points — no curves;
- an arrowhead is attached via an SVG `marker` (`M0,0 L0,12 L9,6 z`, `orient="auto"`) on the path end;
- the final point is pulled back ~8px so the arrowhead tip lands on the node edge rather than
  overlapping it;
- the Left/Right edge label is rendered as an SVG `<title>`, i.e. a hover tooltip rather than visible
  text.

**Drag-and-drop wiring.** Three participants, and the priority between them matters:

| Participant              | Accepts                       | Behaviour                                                                                                      |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Node** (drop target)   | palette items and other nodes | A palette item becomes "add, spliced after this node". Another node becomes `connect` if allowed, else `move`. |
| **Canvas** (drop target) | palette items                 | Only fires if **no node handled the drop** — check the "already handled" flag before acting.                   |
| **Node** (drag source)   | —                             | Carries just the node id.                                                                                      |

A node accepts a drop when: the dragged thing is a palette item (always), or it is a _different_ node
for which `canConnect || canMove` is true. That predicate also drives the valid-target highlight, so
the user sees legality before releasing.

#### Pitfalls to avoid

These are real defects in the original's canvas. Fix them rather than reproducing them.

1. **Centre-vs-top-left coordinate mismatch.** Layout engines typically report node **centres**. The
   original passes those straight into CSS `left`/`top`, which expect the **top-left** corner — so
   every node is drawn offset by half its size. The negative layout margins (`-32`, `-32`) and the
   arrow offsets (`+39`, `+29`, `+10`) are empirical fudge factors compensating for this. **Convert
   properly** — `left = x - width/2`, `top = y - height/2` — and every magic constant disappears.
2. **Hit-testing via a DOM attribute.** The context menu discovers which node was right-clicked by
   reading an `itemid` attribute off the DOM element under the cursor. Pass node identity through
   your event/component layer instead.
3. **Fixed node dimensions.** Boxes are hard-coded 64×86 while the content is a variable-length
   description, so long descriptions overflow. Measure, or constrain the text.
4. **Edge labels are tooltips.** "Left"/"Right" on binary inputs is only discoverable by hovering.
   Given how much join correctness depends on which input is which, render them visibly.
5. **No zoom, pan, or viewport controls.** Large queries simply overflow a 60%-viewport box that
   scrolls. A diagramming library gives you this for free and is the main argument for using one.

### 17.4 Graph interactions

| Gesture                          | Effect                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| Click a node                     | Open its editor (§17.5)                                                |
| **Ctrl**+click a node            | Make it the capture node (`select`)                                    |
| Drag palette item → empty canvas | Add that node, unconnected                                             |
| Drag palette item → onto a node  | Add and **splice in after** that node                                  |
| Drag node A → onto node B        | `connect(A, B)` if allowed, else `move(A, B)` — connect takes priority |
| Right-click canvas or node       | Context menu                                                           |
| `Ctrl+Z` or the Undo button      | Restore the previous query                                             |

Rules:

- Drop targets must be **live**: a node highlights as a valid target only when `canConnect || canMove`
  returns true for the dragged item. Users rely on this to discover what's legal.
- A drop handled by a node must not also be handled by the canvas beneath it.
- Context menu items are the full palette, a divider, then **Select Item / Remove Item / Swap Inputs**,
  each individually enabled by `canSelect` / `canRemove` / `canSwapInputs`. Show-but-disable rather
  than hide — **[why]** "Swap Inputs" is undiscoverable otherwise.
- **Undo must produce a new object identity** even when the restored value is structurally equal
  _(original: `new Query(q.nodes, q.connections, q.selected)`)_. **[why]** the previous query is
  reference-equal to one already in the history; without cloning, change detection misses it and the
  UI silently fails to update. Whatever your state layer, make sure undo actually re-renders.
- Undo is enabled exactly when the query has been modified.

### 17.5 The node editor

Clicking a node opens an editor anchored to it _(original: a popover; a side panel or inline drawer
would serve equally well)_.

**Chrome:** the node's `LABEL`, a beta badge if applicable, a help icon carrying the help text from
§17.9, and a **Select** affordance — either a link that makes this the capture node, or the text
"(Selected)" when it already is.

**Three behavioural requirements, all of which matter:**

1. **Changes commit on close, not on keystroke.** The editor accumulates edits locally and emits a
   single replacement node when it closes. **[why]** every edit pushes an undo entry and triggers a
   full re-validation of the graph; per-keystroke commits would make undo useless and re-validate on
   every character.
2. **Dismiss-on-outside-click must be suppressed while a nested editor is open.** Child editors signal
   "I am editing" (`onEditing(true/false)`); while set, clicking away must not close and commit.
   **[why]** without it, opening the Expression Editor modal or a dropdown from inside the node editor
   instantly closes the node editor underneath.
3. **If an upstream node is invalid, show a warning instead of the editor.** There is no input schema,
   so every column picker would be empty and the user would conclude the node is broken. Show the
   upstream error and nothing else.

**Input schemas are provided in port order.** Unary editors get one schema and its column list; binary
editors get both. Column pickers must only ever offer columns from the actual input schema.

### 17.6 Per-node editors

What each editor must let the user do. The validation rules in §7 define what is accepted; these are
the controls needed to reach a valid state.

| Node             | Controls                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sort**         | Ordered list of (column, direction) rows; add / remove / reorder                                                                                                                          |
| **Group**        | Multi-select of grouping columns; list of (column, aggregation, output name) rows. Offered aggregations are filtered by column type per §10.1; output name is auto-generated but editable |
| **Filter**       | The filter tree builder (§8.5)                                                                                                                                                            |
| **Restrict**     | Multi-select of columns to keep                                                                                                                                                           |
| **Rename**       | List of (old column, new name) rows                                                                                                                                                       |
| **Distinct**     | Nothing — description only                                                                                                                                                                |
| **Drop / Limit** | One integer field                                                                                                                                                                         |
| **Slice**        | Start and stop integer fields                                                                                                                                                             |
| **Concat**       | Nothing. Should state the identical-schema requirement, since that is the only way it fails                                                                                               |
| **Join**         | Join type selector (Inner / Left Outer / Right Outer); paired left/right column rows; the duplicate-column **autofix** (§7.11) offered inline when that error fires                       |
| **Difference**   | Paired left/right join-column rows; multi-select of numeric difference columns                                                                                                            |
| **Partition**    | Multi-select of partition columns (may be empty); ordered sort rows; list of window operations, where rank operations take no column                                                      |
| **Extend**       | List of (name, expression) rows; expression opens the Expression Editor (§9.1)                                                                                                            |
| **Sources**      | Read-only coordinates/identity, a parameter form driven by `ParameterInfo` (required ones marked), and a **Refresh** action that re-resolves schema and parameters from the engine        |

**Editing a source node re-resolves it against the engine** (an async operation with a status
indicator); editing a transform is purely local.

The "add a row" affordance in any column-list editor must be disabled once every available column is
already used.

### 17.7 Value entry

A consistent pattern across filters, parameters, and node editors.

- **Display mode** shows the formatted value, or `(blank)` when empty; clicking switches to edit mode.
  Invalid values are visibly marked in _both_ modes.
- **Commit on blur**, with coercion to the column's type. A value that cannot be coerced becomes
  `undefined` — which then fails validation and surfaces a message, rather than being silently kept or
  silently dropped.
- Input affordance by type:

  | Type                   | Input                                                              |
  | ---------------------- | ------------------------------------------------------------------ |
  | String, Enumeration    | text                                                               |
  | Float, Integer, Number | number                                                             |
  | Date, StrictDate       | date                                                               |
  | DateTime               | datetime-local                                                     |
  | Boolean                | dropdown: `true` / `false`, plus an empty option when not required |

- Coercion rules: trim first; empty → `undefined`; `Boolean` accepts only the exact strings `"true"` /
  `"false"`; `Integer` must parse to a **safe** integer; `Float`/`Number` must parse to a number;
  dates are kept as strings and not parsed.
- Enum-typed values are picked from the enum's values, never free-typed.
- Multi-value entry (for `In` / `NotIn`) accepts a list, with the same per-item coercion and validation.

### 17.8 Source picker

A tabbed dialog, one tab per registered source type.

- **Per-tab state is preserved** while the dialog is open, so switching tabs and back does not lose a
  half-built selection.
- The confirm button is disabled until the active tab reports a valid selection. Each source type
  supplies its own validation predicate — e.g. relational requires connection + schema + table, while
  catalogue sources require only a picked item.
- Catalogue tabs (services, data browser queries, functions) provide a search box over the item's
  searchable keys, with the 300-item cap and the two messages from §6.6.
- A tab may **commit immediately** on selection (double-click-to-pick) rather than requiring the
  confirm button.
- Relational is the one multi-step tab: pick connection → **Test Connection** (introspects the
  database) → pick schema and table. Changing the connection resets schema and table.
- Prompt before a tab is chosen: _"Select source type above"_.

Selecting a source **resolves it against the engine before adding it** to the graph, so it lands with
its schema already populated.

### 17.9 Help text

Per-node help, shown from the editor's help icon. This is user-facing copy worth carrying over verbatim.

```
Relational Table   Sources data from relational database table.
Service            Sources data from a service that can have additional parameters where some of
                   them are mandatory and others are optional.
Data Browser       Sources data from Data Browser query that can have additional parameters where some
                   of them are mandatory and others are optional.
PURE Function      Sources data from Pure function that can have additional parameters where some of
                   them are mandatory and others are optional.
Data Lake          Sources data from Data Lake through coordinates of datasource, dataset and warehouse.

Concat      Appends rows from the second previous data set to the rows in the first previous data set.
            The columns must be the same for the both data sets.
Difference  Compares numeric values of specified columns from two previous data sets.
Distinct    Removes duplicate rows from the previous data set.
Drop        Reduces the number of rows in the previous data set, removing the specified number of rows
            from the beginning of the data set.
Extend      Extends outgoing data set with new columns produced by expressions.
Filter      Reduces the number of rows in the previous data set, keeping only rows matching the
            specified criteria.
Group       Aggregates the data from the previous data set using the specified columns and aggregation
            functions.
Join        Joins two previous data sets using specified columns as join keys.
Limit       Reduces the number of rows in the previous data set, keeping the specified number of rows
            from the beginning of the data set.
Partition   Adds new columns with outputs of window functions for optional window partition and order.
Rename      Renames specified columns in the previous data set to new names.
Restrict    Restricts outgoing data set to the specified columns only.
Slice       Reduces the number of rows in the previous data set, keeping only the rows in the specified
            range between "start" and "stop" parameters included.
Sort        Reorders rows of the previous data set by one or more columns, either in ascending or
            descending order per column.
Unknown     Source or transformation unknown to the application.
```

Tooltip on the Select affordance: _"Selects this node as active and its output will be shown in the
grid once query is executed."_

### 17.10 Query identity and modified state

The graph toolbar shows the query name, or **"Unsaved Query"**, with an asterisk when there are
uncommitted changes. Query and presentation modifications are tracked **separately** but both drive the
asterisk — **[why]** changing only a column format still needs saving, and users will not expect that
unless it's indicated.

Hover reveals name, identifier, version, and owners.

### 17.11 Grid toolbar

Covered behaviourally in §12. The controls are: a **stale** indicator (query edited since last
execution), an **exporting** indicator, the local⇄server mode toggle, drill-down configuration, the row
limit, and the Execute / Export / Statistics actions. Execute and Export require a valid query and
valid meta.

### 17.12 Keyboard shortcuts

```
Alt+N  New query        Alt+L  Load query      Alt+S  Save query
Alt+C  Copy query       Alt+V  Paste query
Ctrl+Z Undo             F9     Execute query
F10    Validate expression (expression editor only)
```

Shortcuts must be no-ops when their action is unavailable (undo with no history, save with an invalid
query) rather than erroring. Every shortcut has a visible button equivalent, and the button's tooltip
names the shortcut.

### 17.13 Async operations and errors

Every operation that touches the network goes through one wrapper that provides a pending overlay with
a human-readable label and renders failures in place.

- Labels are lower-case gerund phrases, shown as-is: _resolving source_, _refreshing source_,
  _executing query_, _exporting data_, _loading expression_, _validating expression_,
  _loading registered connections_, _Loading database schemas_.
- Errors show the server's message (truncated at 500 characters) **plus a trace link** when a trace id
  is available. **[why]** this is the primary support workflow — a user pastes the trace link into a
  ticket and an engineer opens the span.
- Failures are rendered inside the region that triggered them, not as a global toast.

### 17.14 Destructive-action confirmation

New / Load / Paste prompt when there are unsaved changes:
_"Unsaved changes to your query will be lost if you continue. Are you sure?"_ The same message is wired
to the browser's `beforeunload`.

### 17.15 Deep links

`?queryId=` opens a saved query. `?sourceType=` + `?sourceId=` start a new query pre-seeded with one
resolved source (ignored if `queryId` is also present). Both are **consumed and stripped from the URL**
on load, so a refresh doesn't re-trigger them.

---

## 18. Configuration, auth, observability

### 18.1 Configuration

Fetched at startup from `./config.json` **in parallel** with an identity call, before React mounts.
The resulting object is frozen; construction is one-time (asserted).

```json
{ "realm": "dev",
  "pureServer": "…", "executionServer": "…", "queryStore": "…",
  "analytics": "…", "analyticsToken": "…",
  "trace": "…", "zipkin": "…",
  "sqlExecute": true,
  "oidcConfig": { "authority", "clientId", "discoveryUrl", "cookieDomain", "scope", "responseType" } }
```

- An empty `queryStore` means "self" and resolves to `window.location.href`.
- Nearly every value is **overridable by URL query parameter**, which is heavily used for debugging:
  `?pureServer=`/`?server=`, `?alloyExecutionUrl=`, `?servicesUrl=`, `?pureAuth=`/`?auth=`,
  `?execution=pure|alloy`, `?sqlExecute=`, `?alloyExecutionMode=fullInteractive|semiInteractive`.
  URL overrides are validated with `new URL(...)` and dropped if malformed.
- `oidcConfig` is accepted only if **all six** fields are non-empty strings, else treated as absent.
- Deep-link parameters: `queryId`, `sourceId`, `sourceType` — open a saved query, or start a new query
  pre-seeded with one source.
- `?execution=` selects the execution backend. In the rebuild this collapses to a single
  `CubeQueryEngine`; keep the switch only if you need more than one.

### 18.2 Auth

Two interchangeable modules behind one interface (`authenticate()`, `unauthenticated(response)`):
GS SSO and a no-op. OIDC (silent renew via a dedicated HTML page) was added on top. The
`unauthenticated()` predicate drives the retry-once logic in §11.4. In Legend Query this is entirely
replaced by the host's auth.

### 18.3 Observability

- **OpenTracing / Zipkin.** Every meaningful operation is wrapped in a span with tags; HTTP requests
  create child spans and inject trace headers. Span names are used verbatim in the stats popover:
  `Execute TDS Query`, `Export TDS Query`, `Resolve Sources`, `Refresh Source`, `Load Services`,
  `Load Data Browser Queries`, `Load Native Functions`, `Load Metadata Entities`,
  `Load Raw Saved Queries`, `Load Saved Queries`, `Create/Update/Delete a Saved Query`,
  `Get/Register/Test TDS service`, `Get TDS code`, `Preprocess Pure request`.
  Failed requests tag `error`; the trace id and a trace URL are attached to `ServiceError` and shown to
  the user. Keep this — it is how support diagnoses slow queries.
- **Product analytics.** A fire-and-forget event stream (failures logged to console, never surfaced).
  The event list doubles as a feature inventory: app loaded; query executed / exported / created /
  loaded / saved / copied / pasted / deleted; graph actioned; grid actioned / drilled / local-mode
  toggled / limit updated / drilldown updated; source selected / link followed / tab activated /
  navigation changed; statistics opened / copied / trace clicked; help actioned; graph view toggled;
  graph undo; side panel toggled; expression help clicked / editor opened / closed / compiled.

---

## 19. Legend Query integration

### 19.1 What maps cleanly

- **TDS functions.** Every core transform maps to a `meta::pure::tds::*` function Legend already has.
  The two extensions (`columnValueDifference`, `olapGroupBy`) are the exception — verify them first.
- **Types.** Cube's eight primitives plus enumerations are exactly Legend's PURE primitives.
- **Grammar round-trip.** Legend Engine already exposes grammar↔JSON transformation; wire
  `textToExpression` / `expressionToText` to it.
- **Persistence.** Legend Query has its own saved-query store with versioning and owners — map §14.3
  semantics onto it rather than porting the Dropwizard service.
- **Auth, telemetry, config.** Use the host's; delete Cube's.

### 19.2 What needs design work

| Area                                        | Issue                                                                                                                                                                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage format**                          | §14.1. Decide on format v2 and the fate of existing V0 envelopes before writing code.                                                                                                                                                                             |
| **Source model**                            | Cube sources are opaque, server-resolved TDS producers keyed by a guid/serviceId/functionId. This is a different mental model from Legend Query's class+mapping+runtime selection. The source registry (§6.1) is the seam; expect this to be the largest adapter. |
| **`columnValueDifference` / `olapGroupBy`** | GS extension functions. Confirm availability or reimplement (window functions are the higher-value of the two).                                                                                                                                                   |
| **Service registration**                    | Cube's `register_semiInteractive` flow and the two-hop service lookup are specific to the original engine. Treat as an optional capability.                                                                                                                       |
| **Graph canvas**                            | Legend Query is form/text-driven; a node-link canvas is new UI. dagre + react-dnd is the proven combination.                                                                                                                                                      |
| **Store generation**                        | Relational "Test Connection" depends on a live introspection endpoint.                                                                                                                                                                                            |

### 19.3 Suggested module boundaries

```
cube-domain       types, Schema, Query, Connection, all node classes,
                  inference + validation, filters, aggregations, expression typing
                  → zero host imports; the bulk of the test suite lives here
cube-engine       CubeQueryEngine interface + Legend adapter + request builders
cube-sources      source registry, source classes, pickers
cube-ui           graph canvas, details panels, grid, dialogs
cube-persistence  envelope v2, legacy importer, Legend store adapter
```

---

## 20. Build order

Each milestone ends with something demonstrable. Milestones 1–3 are headless and should be driven
entirely by tests — do not build UI until the model is correct.

| #   | Milestone                                                                                                                                       | Done when                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Domain core** — types, Schema, Query/Connection, the five invariants, all graph operations, id generation (§3–4)                              | A test suite exercises add/move/remove/connect/swap and every invariant violation throws                               |
| 2   | **Inference + validation engine** (§5) with two trivial node types                                                                              | Sentinel-error propagation is correct: a broken node poisons downstream nodes with `ERR_SCHEMAS`, not duplicate errors |
| 3   | **Unary transforms + filters** — Sort, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice (§7); filter tree, operator matrix, V1 codec (§8) | Appendix B's worked example produces the expected schema at every node                                                 |
| 4   | **Engine interface + first source** — `CubeQueryEngine`, Legend adapter, source resolution, Relational tables (§6.2, §11)                       | Pick a table → schema resolves → execute → rows come back. End-to-end, no UI beyond the crudest                        |
| 5   | **Graph canvas** (§17.3–17.4) — layout, node states, drag-and-drop, context menu, undo                                                          | A user can build a 4-node query by dragging, with live validation feedback                                             |
| 6   | **Node editors** (§17.5–17.7) — the editor shell, commit-on-close, value entry                                                                  | Every milestone-3 transform is configurable through the UI                                                             |
| 7   | **Binary transforms** — Concat, Join (duplicate-column rule + rename autofix), Difference (§7.10–7.12)                                          | A join with colliding column names reports the error and the autofix resolves it                                       |
| 8   | **Group, Partition, Extend** — aggregations, window ops, expression editor + type table (§9, §10)                                               | Aggregation offerings correctly filter by column type; Extend infers its output type                                   |
| 9   | **Remaining sources** (§6.3–6.7) + the source picker (§17.8)                                                                                    | All five source types selectable, with parameter forms                                                                 |
| 10  | **Grid** — server-side and local modes, context menu, limits, export, stats (§12)                                                               | Results browse, export to CSV/XLSX, context-menu actions create real transform nodes                                   |
| 11  | **Drill-down** (§12.2)                                                                                                                          | Expanding a hierarchy level re-derives and re-executes correctly, including leaf-level sort remapping                  |
| 12  | **Presentation meta** (§13) — column formats, widths, graph visibility                                                                          | Formats survive a save/load round trip                                                                                 |
| 13  | **Persistence** (§14) — envelope v2, save/load/copy/paste, deep links, legacy importer if in scope                                              | Optimistic-concurrency conflicts and owner-only mutation behave as specified                                           |
| 14  | **Publishing** (§15) — code export, service registration, test generation                                                                       | Optional capability; hide the UI when the engine doesn't support it                                                    |

Two sequencing notes:

- **Milestone 4 before milestone 5.** Proving the engine round-trip on one source before building the
  canvas means that when the canvas misbehaves you know it's the canvas.
- **Resolve the §14.1 storage-format decision before milestone 13**, ideally before milestone 1 — it
  determines whether you need a V0 reader at all, which in turn affects how much of the V0 node shape
  you need to model.

---

## 21. Known defects, gaps, and decisions for the rebuild

Carried forward from the original. Fix these rather than reproducing them.

**Defects**

- **Red-if-negative is wired to the wrong flag.** The cell class rule `{'text-danger': 'x < 0'}` is
  applied when `parenthesesIfNegative` is set, not `redIfNegative`. So `redIfNegative` does nothing and
  `parenthesesIfNegative` colours cells red as a side effect.
- **Unbounded grid cache.** The server-side data source caches every result set keyed by group/sort
  state and never evicts (`TODO: restrict size of cache`). Long drill-down sessions grow without bound.
- **Filter values are not type-checked.** `validateValue` only checks presence/arrayness; a string typed
  into an Integer filter is accepted locally and fails at execution
  (`TODO: check value type against schema`).
- **`limitItems` mutates the array it returns.** It sets a `limited` property on the returned array
  (`TODO: FIXME`). Return `{items, limited}` instead.
- **Currency uses symbols, not ISO codes.** Only four symbols are recognised and an unknown one
  silently degrades to decimal formatting (`TODO: need to replace currency symbols with ISO 4217`).
- **Rename column-name regex is unreviewed** — `/^[A-Za-z0-9_ ]{1,100}$/u`, marked `TODO: review`. It
  rejects perfectly legal names (hyphens, non-ASCII) and the 100-char cap is arbitrary.
- **Join autofix can create name clashes.** `renameInputs` appends `_1`/`_2` without checking whether
  those names are already taken (`TODO: handle possible name clashes`).
- **Filter `toString()` embeds raw values**, which may be sensitive, into descriptions that reach logs
  and trace tags (`TODO: remove possibly sensitive value`).
- **Expression type inference checks only one branch** of `if`, `min`, and `max`, assuming the others
  agree. A heterogeneous expression gets a confidently wrong type.
- **Analytics token is committed in `config.json`.** Move it to a deploy-time secret.

**Gaps**

- Pivoting and grid-level filtering are unsupported in server-side mode (asserted, not degraded).
- Enums support only `Count` as an aggregation.
- No `Difference`-style validation that the two inputs are semantically comparable beyond types.
- `Unknown` nodes can be displayed but neither executed nor re-saved.

**Decisions required before coding**

1. **Storage format and legacy migration** (§14.1). The single highest-risk item.
2. **Availability of `columnValueDifference` and `olapGroupBy`** in the target engine.
3. **Whether service registration is in scope** for the Legend entry point.
4. **Data Lake re-inclusion** — currently dropped; the contract supports re-adding it.
5. **Minimum owner count for published services** — currently two, enforced silently.

---

## Appendix A: constants quick reference

```
Transform type codes   concat difference distinct drilldown drop extend filter group
                       join limit partition rename restrict slice sort unknown
Source V1 types        relational alloyService dataBrowser pureNative (dataLake — dropped)
Source V0 types        Relational AlloyService DataBrowserQuery NativeFunction LakeDataSet
Join types             INNER LEFT_OUTER RIGHT_OUTER   (wire: Inner LeftOuter RightOuter)
Sort directions        ASC DESC                       (wire: Ascending Descending)
Composite operators    And Or
URL parameters         queryId sourceId sourceType
Marker column          "CUBE AUTO COUNT"
Blank placeholder      "(blank)"
Null grid value        "(null)"
Default Drop/Limit size      10
Default Slice start/stop     10 / 20
Source picker result cap     300
Grid default column width    100
Grid group column width      200
Grid cache block size        500
Stats history cap            15
Export banner timeout        3000 ms
Error message truncation     500 chars
Max node id per type         10000
Node id floor                101
```

## Appendix B: worked example

A concrete end-to-end case. Use it as the acceptance test for milestones 1–4: if your implementation
produces exactly these schemas and exactly this request JSON, the core is right.

### C.1 The query

_"Total notional by region for large trades, biggest first, top 10."_

Two relational sources joined on book, filtered, grouped, sorted, limited.

```
relational101 (TRADING.TRADES)        relational102 (TRADING.BOOKS)
        │                                      │
        └──────────► join101 ◄─────────────────┘
               (Inner, bookId = bookId)
                        │
                   filter101  (notional > 1000000)
                        │
                   group101   (by region, Sum of notional)
                        │
                    sort101   ("notional Sum" Descending)
                        │
                   limit101   (10)        ◄── capture node
```

### C.2 Internal model

```
nodes:
  RelationalTableSource relational101  {connection, schema:"TRADING", table:"TRADES"}
  RelationalTableSource relational102  {connection, schema:"TRADING", table:"BOOKS"}
  Join                  join101        leftColumns:["bookId"] rightColumns:["bookId"] joinType:INNER
  Filter                filter101      ColumnComparisonFilter("notional", GreaterThan, 1000000)
  Group                 group101       columns:["region"]
                                       aggregations:[ColumnAggregation("notional","Sum")]
  Sort                  sort101        sorts:[ColumnDirection("notional Sum","DESC")]
  Limit                 limit101       size:10

connections:
  relational101 → join101   port "leftTds"
  relational102 → join101   port "rightTds"
  join101       → filter101 port "tds"
  filter101     → group101  port "tds"
  group101      → sort101   port "tds"
  sort101       → limit101  port "tds"

selected: "limit101"
```

Note the aggregation's output name `"notional Sum"` is **auto-generated** by the rule in §10.3
(`` `${column} ${describeAggregation(aggregation)}` ``), and `sort101` then references that generated
name — not the underlying column.

### C.3 Expected schema at every node

| Node            | Output schema (ordered)                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `relational101` | `tradeId` Integer, `bookId` Integer, `notional` Float, `tradeDate` StrictDate                                         |
| `relational102` | `bookId` Integer, `bookName` String, `region` Region _(enum)_                                                         |
| `join101`       | **`bookId` Integer**, `tradeId` Integer, `notional` Float, `tradeDate` StrictDate, `bookName` String, `region` Region |
| `filter101`     | _unchanged from join101_                                                                                              |
| `group101`      | `region` Region, **`notional Sum` Float**                                                                             |
| `sort101`       | _unchanged from group101_                                                                                             |
| `limit101`      | _unchanged from group101_                                                                                             |

The join schema is the part most likely to be got wrong. Per §7.11 the order is: left join columns →
right join columns → remaining left → remaining right, deduplicated by name. So **`bookId` moves to
the front**, and the right-hand `bookId` is dropped as a duplicate of the join key.

`group101` replaces the schema entirely (grouping columns + aggregation outputs), unlike `partition`,
which would have appended to it.

`Sum` over a `Float` yields `Float` (§10.2).

### C.4 Expected V1 request

```json
{
  "graph": {
    "nodes": [
      {
        "_type": "relational",
        "id": "relational101",
        "connection": { "...": "..." },
        "schema": "TRADING",
        "table": "TRADES"
      },

      {
        "_type": "relational",
        "id": "relational102",
        "connection": { "...": "..." },
        "schema": "TRADING",
        "table": "BOOKS"
      },

      {
        "_type": "join",
        "id": "join101",
        "joinType": "Inner",
        "joinColumns": [{ "left": "bookId", "right": "bookId" }],
        "leftInput": { "_type": "nodeRef", "id": "relational101" },
        "rightInput": { "_type": "nodeRef", "id": "relational102" }
      },

      {
        "_type": "filter",
        "id": "filter101",
        "filter": {
          "_type": "greaterThan",
          "left": { "_type": "column", "column": "notional" },
          "right": 1000000
        },
        "input": { "_type": "nodeRef", "id": "join101" }
      },

      {
        "_type": "groupBy",
        "id": "group101",
        "columns": ["region"],
        "aggregations": [
          { "name": "notional Sum", "column": "notional", "aggregation": "Sum" }
        ],
        "input": { "_type": "nodeRef", "id": "filter101" }
      },

      {
        "_type": "sort",
        "id": "sort101",
        "sorts": [{ "column": "notional Sum", "direction": "Descending" }],
        "input": { "_type": "nodeRef", "id": "group101" }
      },

      {
        "_type": "limit",
        "id": "limit101",
        "size": 10,
        "input": { "_type": "nodeRef", "id": "sort101" }
      }
    ]
  },
  "captures": [{ "nodeId": "limit101" }]
}
```

Checkpoints:

- Inputs are **inlined as `nodeRef` properties** named by `INPUTS`, in port order. There is no
  `connections` array.
- The capture is a **node id**, not a node.
- Enum-ish values are written in their wire form: `INNER` → `"Inner"`, `DESC` → `"Descending"`.
- `joinColumns` is the positional **zip** of `leftColumns` and `rightColumns`.
- The filter is encoded positively; had it been `LessThanOrEqual`'s negation or any of the six negative
  operators, it would appear wrapped in `{"_type":"not","rule":{…}}` (§8.4).

### C.5 Failure walkthroughs

Exercise these; they cover the three distinct error mechanisms.

**(a) Disconnect `relational102` from `join101`.**

```
join101    schema=undefined  validity=["This node requires more inputs. Please drag and drop
                                        another input to associate."]
filter101  schema=undefined  validity=["This node depends on some invalid inputs. Please correct
                                        these first."]
group101, sort101, limit101  — same ERR_SCHEMAS message
query.validate() === false
```

The incomplete node reports `ERR_INCOMPLETE`; everything downstream reports `ERR_SCHEMAS`. The error
does **not** duplicate down the chain.

**(b) Give both tables a `region` column, keeping the join on `bookId`.**

`join101` fails validation with:

```
Duplicate column names between inputs are not supported if they are not part of the join columns: "region"
```

because `region` is in both input schemas and is not a positionally-matching join key. The node editor
offers the autofix (§7.11), which splices a `Rename` before each input mapping `region` → `region_1`
and `region_2` respectively.

**(c) Change `group101`'s aggregation to `Sum` over `region` (an enum).**

```
Aggregation function "Sum" is incompatible with column "region".
```

Per §10.1 an enum column offers only `Count`; `resolveAggregationType(Sum, Region)` returns `undefined`.

**(d) Rename the aggregation output to `region`.**

```
Aggregation output name "region" cannot be the same as input column name.
```
