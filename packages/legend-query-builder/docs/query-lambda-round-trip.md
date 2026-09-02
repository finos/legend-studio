# Query Builder — The Lambda Round Trip

> Technical reference for `@finos/legend-query-builder`.
>
> Audience: engineers working on the query builder, the graph manager
> (`@finos/legend-graph`), or any application that embeds `QueryBuilderState`.

A query in Legend has no single representation. It exists as five different
things at different points in its life, and the query builder's central job is
converting between them without losing information:

```
 raw JSON  ⇄  V1_RawLambda  ⇄  ValueSpecification / LambdaFunction  ⇄  QueryBuilderState
    │                                                                      │
    └──────────────────── PURE grammar text ───────────────────────────────┘
                          (via the engine)
```

This document traces that cycle in both directions, explains why each hop
exists, and covers where the engine sits in it.

**Contents**

1. [The representations](#1-the-representations)
2. [Inbound: JSON → UI state](#2-inbound-json--ui-state)
3. [Outbound: UI state → JSON](#3-outbound-ui-state--json)
4. [How the lambda reaches the engine](#4-how-the-lambda-reaches-the-engine)
5. [Grammar (text) mode](#5-grammar-text-mode)
6. [When the round trip fails](#6-when-the-round-trip-fails)
7. [Change detection](#7-change-detection)

---

## 1. The representations

### 1.1 `RawLambda` — the transport form

[`RawLambda`](../../legend-graph/src/graph/metamodel/pure/rawValueSpecification/RawLambda.ts)
is deliberately dumb:

```ts
export class RawLambda extends RawValueSpecification implements Hashable {
  body?: object | undefined;
  parameters?: object | undefined;
}
```

`body` and `parameters` are **untyped JSON**. Nothing is resolved, nothing is
validated. Its protocol twin `V1_RawLambda` serializes them with serializr's
`raw()`, which passes the payload through verbatim:

```ts
export const V1_rawLambdaModelSchema = createModelSchema(V1_RawLambda, {
  _type: usingConstantValueSchema(V1_RawValueSpecificationType.LAMBDA),
  body: raw(),
  parameters: raw(),
});
```

That opacity is the point. A `RawLambda` can hold a query using functions this
version of Studio has never heard of, round-trip it to the engine, and store it
again — byte-for-byte. It is what gets **persisted** (`Query.content`, service
executions) and what goes **over the wire**.

### 1.2 `ValueSpecification` / `LambdaFunction` — the metamodel form

[`LambdaFunction`](../../legend-graph/src/graph/metamodel/pure/valueSpecification/LambdaFunction.ts)
is the resolved tree:

```ts
export class LambdaFunction implements Hashable {
  functionType: FunctionType; // parameters + return type
  openVariables: Map<string, VariableExpression>;
  expressionSequence: ValueSpecification[]; // the actual expressions
}
```

Every node is a real `ValueSpecification` — `SimpleFunctionExpression`,
`AbstractPropertyExpression`, `VariableExpression`, `InstanceValue`, … — and
every reference into the model is a resolved `PackageableElementReference`
pointing at a live `Class`, `Property`, or `Enum` in the `PureModel` graph.

This is the form the query builder can actually reason about: you cannot ask a
blob of JSON "what class does this property belong to", but you can ask a
resolved `AbstractPropertyExpression`.

`LambdaFunction` is wrapped in a `LambdaFunctionInstanceValue` whenever it needs
to be treated as a `ValueSpecification` (which is how it crosses the
serialization boundary — see below).

### 1.3 `QueryBuilderState` — the UI form

[`QueryBuilderState`](../src/stores/QueryBuilderState.ts) is not a tree at all.
It is a set of MobX-observable, purpose-built sub-states:

| Sub-state               | Holds                                                   |
| ----------------------- | ------------------------------------------------------- |
| `explorerState`         | the class explorer tree + mapping model coverage        |
| `filterState`           | the filter tree                                         |
| `fetchStructureState`   | projection / graph-fetch columns, aggregations, sorting |
| `parametersState`       | `LambdaParameterState[]` — parameters and their values  |
| `constantState`         | `let` constants                                         |
| `milestoningState`      | business/processing temporal parameters                 |
| `watermarkState`        | watermark expression                                    |
| `executionContextState` | mapping + runtime                                       |
| `resultState`           | execution results, grid config                          |
| `unsupportedQueryState` | the escape hatch (§6)                                   |

The mapping from one flat expression tree to a dozen independent observable
states is lossy in one direction and reconstructive in the other. That
asymmetry is the source of most of the complexity below.

### 1.4 Why not fewer representations?

- **Raw ⇄ metamodel** exists because persistence must survive functions the
  client cannot interpret, while the UI needs resolved references.
- **Metamodel ⇄ UI state** exists because a query builder is not a tree editor.
  Users think in "filters", "columns", "sorts" — not in nested
  `SimpleFunctionExpression` parameters.
- **Grammar text** exists because the engine is the only thing that can parse
  and print PURE.

---

## 2. Inbound: JSON → UI state

Entry point:
[`QueryBuilderState.initializeWithQuery(query: RawLambda, …)`](../src/stores/QueryBuilderState.ts),
which delegates to `rebuildWithQuery` and then snapshots for change detection:

```ts
initializeWithQuery(query, defaultParameterValues?, gridConfig?): void {
  this.rebuildWithQuery(query, { defaultParameterValues });
  this.resetQueryResult({ gridConfig });
  this.changeDetectionState.initialize(query);
  this.changeHistoryState.initialize(query);
}
```

### 2.1 `RawLambda` → `ValueSpecification`

Inside `rebuildWithQuery`, the conversion is two graph-manager calls composed:

```ts
const valueSpec = observe_ValueSpecification(
  this.graphManagerState.graphManager.buildValueSpecification(
    this.graphManagerState.graphManager.serializeRawValueSpecification(query),
    this.graphManagerState.graph,
  ),
  this.observerContext,
);
```

Read it inside-out — **JSON is the pivot**:

| Step | Call                                        | Transformation                                          |
| ---- | ------------------------------------------- | ------------------------------------------------------- |
| 1    | `serializeRawValueSpecification(rawLambda)` | `RawLambda` → `V1_RawLambda` → `PlainObject` (raw JSON) |
| 2    | `buildValueSpecification(json, graph)`      | JSON → `V1_ValueSpecification` → `ValueSpecification`   |
| 3    | `observe_ValueSpecification(...)`           | makes the tree MobX-observable                          |

Step 2 is where the real work happens
([`V1_PureGraphManager.buildValueSpecification`](../../legend-graph/src/graph-manager/protocol/pure/v1/V1_PureGraphManager.ts)):

```ts
buildValueSpecification(json: PlainObject, graph: PureModel): ValueSpecification {
  return V1_buildValueSpecification(
    V1_deserializeValueSpecification(json, plugins),
    new V1_GraphBuilderContextBuilder(graph, graph, extensions, logService).build(),
  );
}
```

- `V1_deserializeValueSpecification` dispatches on the `_type` discriminator —
  `'func'`, `'property'`, `'var'`, `'lambda'`, `'collection'`, `'string'`,
  `'packageableElementPtr'`, `'classInstance'`, … (the full set is
  `V1_ValueSpecificationType` in
  [`V1_ValueSpecificationSerializer.ts`](../../legend-graph/src/graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.ts)).
  Output: a `V1_*` protocol tree — still just data, but typed.
- `V1_buildValueSpecification` walks that tree with a **graph builder context**
  and resolves every path against the `PureModel`. `"model::Person"` stops being
  a string and becomes a reference to the actual `Class`.

Note the `V1_Lambda` case specifically — the protocol `V1_Lambda` becomes a
`LambdaFunctionInstanceValue` wrapping a built `LambdaFunction`, with a **cloned
processing context** so the lambda's own variables don't leak into the enclosing
scope:

```ts
visit_Lambda(valueSpecification: V1_Lambda): ValueSpecification {
  const instanceValue = new LambdaFunctionInstanceValue();
  instanceValue.values = [
    V1_buildLambdaBody(
      valueSpecification.body,
      valueSpecification.parameters,
      this.context,
      this.processingContext.clone(), // clone the context for lambda
    ),
  ];
  return instanceValue;
}
```

This is why the top-level result is unwrapped with a `guaranteeType` before
processing:

```ts
const compiledValueSpecification = guaranteeType(
  valueSpec,
  LambdaFunctionInstanceValue,
  `Can't build query state: query builder only support lambda`,
);
processQueryLambdaFunction(
  guaranteeNonNullable(compiledValueSpecification.values[0]), // the LambdaFunction
  this,
  { parameterValues: previousStateParameterValues },
);
```

### 2.2 `LambdaFunction` → `QueryBuilderState`

[`processQueryLambdaFunction`](../src/stores/QueryBuilderStateBuilder.ts) is
short, and its brevity hides the dispatch machinery underneath:

```ts
export const processQueryLambdaFunction = (
  lambdaFunction,
  queryBuilderState,
  parameterOptions?,
) => {
  if (lambdaFunction.functionType.parameters.length) {
    processParameters(
      lambdaFunction.functionType.parameters,
      queryBuilderState,
      parameterOptions,
    );
  }
  lambdaFunction.expressionSequence.map((expression) =>
    QueryBuilderValueSpecificationProcessor.process(
      expression,
      lambdaFunction,
      queryBuilderState,
    ),
  );
};
```

`QueryBuilderValueSpecificationProcessor` is a `ValueSpecificationVisitor<void>`
that walks the tree and **mutates the appropriate sub-state** as it recognises
each function.

**The traversal is inverted relative to how you read the query.** The source
comment on the processor explains this better than a paraphrase can, so it is
worth reading in full — but the essential point:

```
Person.all()->filter(x|$x.age > 0)->project([x|$x.name], ['Name'])->sort([desc('Name')])
```

is, structurally:

```
sort(project(filter(all(Person), …), …), …)
```

So the tree root is `sort`, and `getAll` is the _deepest_ node. Reading order is
`all → filter → project → sort`; traversal order is the reverse. The processor
therefore carries two pieces of context:

- `parentExpression` — the enclosing `SimpleFunctionExpression`, used to
  validate usage (e.g. `desc()` is only legal inside `sort()`).
- `parentLambda` — the enclosing `LambdaFunction`, needed to resolve variables.

`processChild(...)` is how the processor recurses while supplying that context.

Recognised functions are matched against `QUERY_BUILDER_SUPPORTED_FUNCTIONS` and
routed to the owning sub-state — `filter()` populates `filterState`, `project()`
and `groupBy()` populate `fetchStructureState`, `let` statements populate
`constantState`, and so on. Anything unrecognised takes the path in §6.

Finally `fetchStructureState.initializeWithQuery()` runs, letting the
fetch-structure implementation do its own post-processing once the whole tree
has been consumed.

---

## 3. Outbound: UI state → JSON

Entry point: [`QueryBuilderState.buildQuery()`](../src/stores/QueryBuilderState.ts).

```ts
buildQuery(options?: { keepSourceInformation: boolean }): RawLambda {
  if (!this.isQuerySupported) { /* … see §6 … */ }
  return buildRawLambdaFromLambdaFunction(
    buildLambdaFunction(this, {
      keepSourceInformation: Boolean(options?.keepSourceInformation),
      useTypedRelationFunctions: this.isFetchStructureTyped,
    }),
    this.graphManagerState,
  );
}
```

### 3.1 `QueryBuilderState` → `LambdaFunction`

[`buildLambdaFunction`](../src/stores/QueryBuilderValueSpecificationBuilder.ts)
assembles the expression sequence **in a fixed order**, because the order of
composition _is_ the semantics of the query:

1. **Source.** A `Class` source produces `getAll()` /
   `getAllVersions()` / `getAllVersionsInRange()` depending on
   `queryBuilderState.getAllFunction` and the class's milestoning stereotype
   (milestoned classes get their temporal parameters injected here by
   `milestoningState`). A non-class source produces an `AccessorInstanceValue`.
2. **Watermark** — `buildWatermarkExpression(watermarkState, lambdaFunction)`.
3. **Filter** — `buildFilterExpression(filterState, lambdaFunction)`.
4. **Fetch structure** — `buildFetchStructure(...)`; projection columns,
   aggregations, sorting, graph-fetch trees.
5. **Execution context** — `buildExecutionContextExpression(...)`, typically a
   `from(mapping, runtime)` wrapper. Skippable via `skipExecutionContext`
   (see §3.3).
6. **Constants** — `let` expressions are **prepended** to the expression
   sequence.
7. **Parameters** — assigned to `lambdaFunction.functionType.parameters`.

Each step takes the `lambdaFunction` built so far and wraps it, so the tree
grows outward from `getAll()`.

### 3.2 `LambdaFunction` → `RawLambda`

[`buildRawLambdaFromLambdaFunction`](../../legend-graph/src/graph-manager/helpers/ValueSpecificationGraphManagerHelper.ts):

```ts
export const buildRawLambdaFromLambdaFunction = (
  lambdaFunction,
  graphManagerState,
): RawLambda => {
  const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue();
  lambdaFunctionInstanceValue.values = [lambdaFunction];
  return guaranteeType(
    graphManagerState.graphManager.transformValueSpecToRawValueSpec(
      lambdaFunctionInstanceValue,
      graphManagerState.graph,
    ),
    RawLambda,
  );
};
```

And `transformValueSpecToRawValueSpec` is, again, **JSON as the pivot**:

```ts
transformValueSpecToRawValueSpec(valueSpecification, graph): RawValueSpecification {
  const json = this.serializeValueSpecification(valueSpecification); // metamodel → V1 → JSON
  return this.buildRawValueSpecification(json, graph);               // JSON → V1_RawLambda → RawLambda
}
```

- `serializeValueSpecification` runs `V1_transformRootValueSpecification`
  (metamodel → `V1_*` protocol, dropping resolved references back down to
  paths) then `V1_serializeValueSpecification` (protocol → JSON).
- `buildRawValueSpecification` deserializes that same JSON as a
  `V1_RawValueSpecification` and builds a `RawLambda` — whose `body` and
  `parameters` are the JSON sub-objects, untouched.

So the outbound path is the exact mirror of §2.1. In both directions the two
worlds only ever meet as plain JSON; there is no direct `LambdaFunction ⇄
RawLambda` converter, by design.

### 3.3 The three build variants

| Method                                  | Used for                        | Difference                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildQuery()`                          | general use, text mode, compile | the full lambda                                                                                                                                                                                                                                                            |
| `buildQueryForPersistence()`            | saving to the query store       | delegates to `buildQuery()` by default; overridden by `DataProductQueryBuilderState` to call `buildQueryLambdaWithoutExecutionContext()` — the execution context is persisted separately on `Query.executionContext`, so embedding it in the lambda too would duplicate it |
| `resultState.buildExecutionRawLambda()` | running the query               | passes `isBuildingExecutionQuery: true`, which routes parameters through `buildExecutionQueryFromLambdaFunction`                                                                                                                                                           |

That last one matters. For execution, parameters whose values are **function
calls** cannot stay as lambda parameters — the engine would have nothing to bind
them to. `buildExecutionQueryFromLambdaFunction`
([`LambdaParameterState.ts`](../src/stores/shared/LambdaParameterState.ts))
handles this by:

1. removing those parameters from `functionType.parameters`, and
2. prepending `let` statements that assign their values.

Plain-valued parameters are left as parameters and supplied separately as
`parameterValues` on the execution input.

---

## 4. How the lambda reaches the engine

Everything the client sends the engine carries a **`V1_RawLambda`**, never a
`LambdaFunction`. The engine does its own parsing and compilation; shipping the
resolved metamodel would be both redundant and lossy.

### 4.1 Execution

[`V1_ExecuteInput`](../../legend-graph/src/graph-manager/protocol/pure/v1/engine/execution/V1_ExecuteInput.ts)
is the payload:

```ts
export class V1_ExecuteInput {
  clientVersion: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   * @discrepancy model
   */
  function!: V1_RawLambda;
  mapping: string | undefined;
  model!: V1_PureModelContext;
  runtime: V1_Runtime | undefined;
  context!: V1_RawExecutionContext;
  parameterValues: V1_ParameterValue[] = [];
}
```

Assembled by `createExecutionInputWithPureModelContext` in
[`V1_PureGraphManager.ts`](../../legend-graph/src/graph-manager/protocol/pure/v1/V1_PureGraphManager.ts):

- `V1_transformRawLambda(lambda, …)` — `RawLambda` → `V1_RawLambda`.
- `model` — the `V1_PureModelContext`, chosen in `createExecutionInput`:

  ```ts
  let context: V1_PureModelContext = graph.origin
    ? this.buildPureModelSDLCPointer(graph.origin, undefined) // GAV pointer
    : this.getFullGraphModelData(graph); // the whole model inline
  ```

  When the graph carries an `origin` — which is exactly what the minimal-graph
  build stamps on it (`{ origin: new LegendSDLC(groupId, artifactId, version) }`)
  — only a **pointer** is sent and the engine resolves the model itself. This is
  what makes the minimal graph viable end-to-end: the client never held the
  whole model, and never needs to send it.

  Elements that exist only client-side (`options.floatingExecutionElements` —
  e.g. the adhoc Lakehouse runtimes registered as `_internal_`) are appended as
  a `V1_PureModelContextData` and combined via `V1_PureModelContextCombination`,
  so a pointer-based context can still carry them.

- `mapping` / `runtime` — sent as separate fields…

…**unless** `options.forceFromExpression` is set. In that case the manager
rewrites the lambda body to wrap it in a `from()` expression and clears the
separate fields:

```ts
__fromExpression = (
  mapping: string | undefined,
  runtime: string,
  body: object,
): object => ({
  _type: 'func',
  function: 'from',
  parameters: [
    body,
    mapping ? { _type: 'packageableElementPtr', fullPath: mapping } : undefined,
    { _type: 'packageableElementPtr', fullPath: runtime },
  ].filter(isNonNullable),
});
```

Note this is hand-built **raw JSON**, not metamodel construction — legitimate
precisely because `V1_RawLambda.body` is opaque. Multi-expression bodies (i.e.
lambdas with `let` statements) get only their **last** expression wrapped, since
that is the one producing the result.

### 4.2 Compilation / type-checking

`compileQuery()` does not use a separate compile endpoint — it asks the engine
for the lambda's return type and treats success as "compiles":

```ts
yield this.graphManagerState.graphManager.getLambdaReturnType(
  this.buildQuery({ keepSourceInformation: true }),
  this.graphManagerState.graph,
  { keepSourceInformation: true },
);
```

`keepSourceInformation: true` is deliberate. Source information maps expressions
back to positions, which is what lets a compilation error be **pinned to the
right element in form mode** rather than reported as an opaque failure. It is
pruned everywhere it isn't needed (`pruneSourceInformation`), since it
substantially inflates the payload.

`getLambdaRelationType` is the equivalent for relation-typed fetch structures.

### 4.3 Grammar transformation

| Direction          | Graph manager API                                                     | Engine                                                                                  |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| text → lambda      | `pureCodeToLambda(code, lambdaId, options)`                           | `transformCodeToLambda`; result becomes `new RawLambda(result.parameters, result.body)` |
| lambda → text      | `lambdaToPureCode(lambda, pretty)` / `lambdasToPureCode(map, pretty)` | `transformLambdaToCode(s)`                                                              |
| value specs → text | `valueSpecificationsToPureCode(map, pretty)`                          | serializes each via `serializeValueSpecification` first                                 |

The client never parses or prints PURE itself.

---

## 5. Grammar (text) mode

[`QueryBuilderTextEditorState`](../src/stores/QueryBuilderTextEditorState.ts)
implements the "edit as text" escape hatch, and it is a complete lap of the
cycle.

**Opening the modal** (`openModal`):

```ts
const rawLambda = this.queryBuilderState.buildQuery(); // §3
if (mode === TEXT) {
  this.setQueryRawLambdaState(new QueryBuilderRawLambdaState(rawLambda));
}
if (mode === JSON) {
  this.setLambdaJson(
    JSON.stringify(
      pruneSourceInformation(
        graphManager.serializeRawValueSpecification(rawLambda),
      ),
      null,
      DEFAULT_TAB_SIZE,
    ),
  );
}
```

JSON mode is **read-only** — it displays the exact protocol payload, source
information stripped.

**While open**, `convertLambdaObjectToGrammarString` calls `lambdasToPureCode`
to render the text; `convertLambdaGrammarStringToObject` calls `pureCodeToLambda`
to parse edits back, capturing `ParserError` for inline display.

**Closing the modal** (`closeModal`) — the round trip completes:

```ts
yield flowResult(this.convertLambdaGrammarStringToObject()); // text → RawLambda
if (this.parserError) {
  notifyError(`Can't parse query. Please fix error before closing: …`);
} else {
  this.queryBuilderState.rebuildWithQuery(this.rawLambdaState.lambda, {
    // → §2
    preserveParameterValues: true,
    preserveResult: true,
  });
}
```

A parse error **blocks closing**; the user cannot escape text mode with a query
the client cannot represent. But a query that parses and yet isn't
_recognisable_ to the processor will close fine and land in the unsupported
state below — those are different failures.

---

## 6. When the round trip fails

`rebuildWithQuery` wraps the entire inbound conversion in a `try`/`catch`. On
any failure — deserialization, unresolvable reference, unrecognised function
shape — it degrades rather than throwing:

```ts
} catch (error) {
  logService.error(LogEvent.create(QUERY_BUILDER_EVENT.UNSUPPORTED_QUERY_LAUNCH), error);
  this.resetQueryResult({ preserveResult: options?.preserveResult });
  this.resetQueryContent();
  this.unsupportedQueryState.setLambdaError(error);
  this.unsupportedQueryState.setRawLambda(query);   // keep the original, verbatim
  this.setSourceElement(undefined);
  const parameters = buildLambdaVariableExpressions(query, this.graphManagerState)
    .map((param) => observe_ValueSpecification(param, this.observerContext))
    .filter(filterByType(VariableExpression));
  processParameters(parameters, this, { parameterValues: previousStateParameterValues });
}
```

Two things survive the failure:

- **The original `RawLambda`**, stored on `unsupportedQueryState`. The user gets
  a text view instead of the form, and can still run and save the query — it is
  never rewritten or lost.
- **The parameters**, recovered independently via
  `buildLambdaVariableExpressions`, which converts only
  `rawLambda.parameters[]` (not the body). Parameters are structurally simple
  enough to build even when the body is not, so the parameter panel keeps
  working.

`buildQuery()` mirrors this on the way out — when `!isQuerySupported`, it
returns the stored raw lambda with freshly serialized parameters spliced in,
rather than trying to rebuild from state that was never populated:

```ts
if (!this.isQuerySupported) {
  const parameters = this.parametersState.parameterStates.map((e) =>
    this.graphManagerState.graphManager.serializeValueSpecification(
      e.parameter,
    ),
  );
  this.unsupportedQueryState.setRawLambda(
    new RawLambda(parameters, this.unsupportedQueryState.rawLambda?.body), // body untouched
  );
  return guaranteeNonNullable(this.unsupportedQueryState.rawLambda);
}
```

There is also a node-level escape hatch: `INTERNAL__UnknownValueSpecification`
holds an unrecognised sub-tree as `readonly content: PlainObject`, letting a
_mostly_ supported query keep one opaque fragment (e.g. a derivation expression
inside `project()`) without failing wholesale.

**Design principle:** the query builder will refuse to _edit_ a query it does
not understand, but it will never silently _alter_ one.

---

## 7. Change detection

[`QueryBuilderChangeDetectionState`](../src/stores/QueryBuilderChangeDetectionState.ts)
answers "has the user modified the query?" — and notably does **not** do it by
rebuilding and comparing lambdas:

```ts
initialize(initialQuery: RawLambda): void {
  this.hashCodeSnapshot = this.querybuilderState.hashCode;  // hash of the UI STATE
  this.querySnapshot = initialQuery;                        // the raw lambda, for diffing
}

get hasChanged(): boolean {
  return this.querybuilderState.hashCode !== this.hashCodeSnapshot;
}
```

The comparison is on `QueryBuilderState.hashCode` — a hash over the observable
sub-states (see `QueryBuilderStateHashUtils.ts`), not over the serialized
lambda. This is a deliberate performance trade: checking for changes on every
keystroke by running the full §3 pipeline (build tree → transform → serialize)
would be far too expensive, whereas the state hash is cheap and MobX-memoized.

`querySnapshot` retains the original `RawLambda` separately, so the diff view
(`QueryBuilderDiffViewState`) can show a real before/after in grammar form.

One consequence worth knowing: because the hash covers UI state rather than the
emitted lambda, two states that serialize to equivalent lambdas but differ in
some non-semantic way can register as "changed". This errs toward prompting the
user to save — the safe direction.

---

## 8. Summary

```
                    PERSISTENCE (Query.content)  ◄──────────┐
                             │                              │
                             ▼                              │
   ┌──────────────────  RawLambda  ─────────────────────┐    │
   │                  (opaque JSON)                     │    │
   │                        │                           │    │
   │  serializeRawValueSpecification                    │ buildRawValueSpecification
   │                        ▼                           │    │
   │                    raw JSON  ────────────────────► │    │
   │                        │            ▲              │    │
   │  buildValueSpecification            │ serializeValueSpecification
   │  (resolves against PureModel)       │              │    │
   │                        ▼            │              │    │
   │              LambdaFunction ────────┘              │    │
   │                        │            ▲              │    │
   │  processQueryLambdaFunction         │ buildLambdaFunction
   │  (visitor → sub-states)             │ (ordered assembly)
   │                        ▼            │              │    │
   │                 QueryBuilderState ──┘              │    │
   └────────────────────────────────────────────────────┘    │
                             │                               │
                             └──────► V1_ExecuteInput.function (V1_RawLambda) ──► ENGINE
```

Three invariants hold throughout:

1. **JSON is the only bridge** between the raw and metamodel worlds, in both
   directions. There is no direct converter, and adding one would bypass the
   protocol layer that makes version tolerance work.
2. **The engine only ever sees `V1_RawLambda`.** The resolved metamodel is a
   client-side convenience; it never crosses the wire.
3. **An unparseable query is preserved, not repaired.** Every failure path keeps
   the user's original bytes.
