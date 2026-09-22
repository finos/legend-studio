# Query Telemetry

How Legend Query and the query builder report usage, and how to read those events when building dashboards.

Events are emitted through `TelemetryService.logEvent(eventType, data)`. Each `eventType` is a string constant (`LEGEND_QUERY_APP_EVENT`, `QUERY_BUILDER_EVENT`), and `data` is a flat-ish JSON object whose shape is described below.

## The payload envelope

Every query telemetry event is built from the same three parts. Knowing which part a field lives in is most of what you need to write a query against this data.

| Part            | Where it sits                    | What it answers                                      | Mutable?                           |
| --------------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| **source info** | spread **flat** at the top level | _Where was the query builder opened from?_           | no — fixed at construction         |
| **`state`**     | nested under `state`             | _What has the builder resolved to for execution?_    | yes — tracks the user's selections |
| **`change`**    | nested under `change`            | _What did the user just do?_ (authoring events only) | n/a                                |

```jsonc
{
  // ── source info: the route the user arrived on, spread flat ──
  "sourceType": "data-product",
  "groupId": "com.company.demo",
  "artifactId": "demo-model",
  "versionId": "1.4.0",
  "dataProduct": "demo::MyProduct",
  "accessType": "lakehouse",
  "accessId": "ap1",

  // ── state: what the builder resolved to ──
  "state": {
    "class": "demo::Person",
    "mapping": "demo::PersonMapping",
    "runtime": "demo::PersonRuntime",
  },

  // ── change: the authoring action (only on *.change events) ──
  "change": {
    "action": "add",
    "sourceType": "explorer-property",
    "columnCount": 3,
  },
}
```

### Why source info and `state` are separate

They answer different questions and have different lifecycles. For a query opened directly on a mapping, _both_ carry a `mapping` — the flat one is the mapping in the URL, `state.mapping` is the mapping currently selected. When they differ, the user switched. For a data space or data product query the flat layer has no mapping at all, because the entry point _resolves_ to one; only `state` has it.

Merging them into one flat object would make "arrived on mapping X" indistinguishable from "currently querying mapping X".

### Source info varies by entry point

`sourceType` is the discriminator. All variants carry the project GAV (`groupId`, `artifactId`, `versionId`) except `unselected`.

A **saved query** (opened via `/existing/:queryId`) reports the `sourceType` of whatever it _targets_ — a saved data space query is `data-space`, same as a freshly created one — and additionally carries **`queryId`**. So slice by `sourceType` to ask "what is being queried", and use the presence of `queryId` to separate saved from newly authored:

```sql
-- saved queries only
WHERE data.queryId IS NOT NULL
-- newly authored only
WHERE data.queryId IS NULL
```

| `sourceType`          | Additional fields                          |
| --------------------- | ------------------------------------------ |
| `mapping`             | `mapping`, `runtime`                       |
| `service`             | `service`                                  |
| `data-space`          | `dataSpace`, `executionContext`            |
| `data-space.template` | `dataSpace`, `templateQueryId`             |
| `data-product`        | `dataProduct`, `accessType`, `accessId`    |
| `data-product.sample` | `dataProduct`, `sampleQueryId`             |
| `ingest`              | `ingestDefinitionPath`, `dataSet`          |
| `unselected`          | — (landed on `/` without picking anything) |

Every variant may additionally carry `queryId` when the query was opened from a saved query rather than created fresh.

Defined in `packages/legend-application-query/src/__lib__/LegendQuerySourceInfo.ts`.

### Gotchas

- **`change.sourceType` is not `sourceType`.** On `projection.change`, `change.sourceType` describes where a column came from (`explorer-property`, `function`, …). The top-level `sourceType` is the entry point. Different fields, same name, different nesting depth.
- **`state` may be absent.** It is omitted when none of class/mapping/runtime has resolved — typical for events fired mid-setup. Source info is still present, so the event is never anonymous. `state` is also _partial_: a user who picked a class but no mapping gets `{"class": "..."}`.
- **`state.runtime` is absent for inline runtimes.** Engineered/inline runtimes have no element path. Those events carry `"isInlineRuntime": true` instead, so the population stays visible.
- **Creator events have no `state`.** No execution context exists yet at initialization time.
- **`__numberOfInteruptions`** (one `r` — that spelling is in the codebase) appears in `timings` when the browser tab was backgrounded mid-operation. Those samples are unreliable for latency work.
- **`errorMessage` is capped at 2000 characters.** When a message was clipped, the payload also carries `errorMessageTruncated: true`. Check that flag before concluding a substring is absent — a `NOT LIKE '%foo%'` over truncated rows will produce false negatives. The full message is always in the log service. Note the cap is a size control, not a redaction: it does not guarantee sensitive values are absent.

## Event catalogue

### Query builder opened (`@finos/legend-query-builder`)

**The canonical "a query builder is loaded" signal.** Prefer this over any route-specific load event when counting opens.

| Event                  | Payload                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `query-builder.opened` | `openedFrom` · envelope · `timings` · `restoredFromRecent` |

`openedFrom` names the **surface** that opened the builder — `query.creator` or `query.saved` today. It does not encode what is being queried: `sourceType` already carries that, and `queryId` already marks a saved query. It is carried on this event only; `appName` and `appSessionId` (stamped on every event by the telemetry service) cover "which app" and provide the join key.

> Legend Studio does not emit this yet, so `studio.*` values do not exist and Studio-originated query builders produce no open event. Scope by `appName` when that matters.

### Query creator (`@finos/legend-application-query`)

Fired when a user lands on a query creator route and it **fails**.

| Event                                           | Payload                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `query-editor.initialize-query-creator.failure` | source info · `restoredFromRecent` · `timings` · `errorMessage` · `errorName` · `httpStatus` |

There is no `.success` counterpart — a successful load is reported by `query-builder.opened`, which covers saved queries too. The failure event survives because a failed load never builds a query builder, so it is the only record that an attempt happened. Creator failure rate is `failure / (failure + opened where openedFrom = 'query.creator')`.

`restoredFromRecent` is `true` when the most recently visited data product or data space was reopened rather than specified by the route.

### Saved query lifecycle (`@finos/legend-application-query`)

| Event                               | Payload                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `query-editor.create-query.success` | `query` identity · extra metadata                                                                                    |
| `query-editor.update-query.success` | `query` identity · extra metadata                                                                                    |
| `query-editor.rename.query.success` | `query` identity                                                                                                     |
| `query-editor.delete-query.success` | `query` identity (partial when the entry was not in the loaded list)                                                 |
| `query-editor.create-query.failure` | `queryName` (no `query` block — see below) · `errorMessage` · `errorMessageTruncated?` · `errorName` · `httpStatus?` |
| `query-editor.update-query.failure` | ditto                                                                                                                |
| `query-editor.rename-query.failure` | ditto                                                                                                                |
| `query-editor.delete-query.failure` | ditto                                                                                                                |

These carry a `query: { id, name, groupId, artifactId, versionId }` block and **no source info**. Rename and delete fire from the query picker, where a user may act on one query while editing another — attaching the loaded builder's source info would attribute the row to the wrong query.

A failed **create** carries `queryName` instead of a `query` block: the server assigns the id and the request never got that far, so there is no query to identify. Filter on the absence of `query` to find saves that never persisted.

Note `rename.query.success` has a dot where the others have a hyphen. That name is already released; the failure counterpart uses the regular `rename-query.failure` form.

### Query execution (`@finos/legend-query-builder`)

| Event                                                   | Payload                                                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `query-builder.run-query.launch`                        | envelope · `queryInfo`                                                                                                        |
| `query-builder.run-query.success`                       | envelope · `queryInfo` · `timings` · `elementCount` · `dependenciesCount` · `executionDurationMs`                             |
| `query-builder.run-query.failure`                       | envelope · `queryInfo` · `timings` · `errorMessage` · `errorName` · `httpStatus` · `executionTraceId` · `executionDurationMs` |
| `query-builder.run-query.cancelled`                     | envelope · `queryInfo`                                                                                                        |
| `query-builder.export-query-data.success` / `.failure`  | envelope (+ error fields on failure)                                                                                          |
| `query-builder.generate-plan.success` / `.failure`      | envelope (+ error fields on failure)                                                                                          |
| `query-builder.debug-plan.success` / `.failure`         | envelope (+ error fields on failure)                                                                                          |
| `query-builder.embedded-data-cube.success`              | envelope · execution report                                                                                                   |
| `query-builder.mapping-model-coverage-analysis.success` | envelope · execution report                                                                                                   |

`queryInfo` is a shape-only summary of the query — counts and booleans, no user values and no element identifiers: `fetchStructureType`, `isQuerySupported`, `isTypedFetchStructure`, `parameterCount`, `constantCount`, `hasFilter`, `filterNodeCount`, `watermarkEnabled`, `milestoningKind`, and for TDS `projectionColumnCount`, `windowColumnCount`, `aggregationColumnCount`, `postFilterNodeCount`, `hasLimit`, `hasDistinct`, `sortColumnCount`, `hasSlice`.

`isQuerySupported` is `false` when the query lambda could not be built into the form-mode builder and the user landed on the raw-lambda / unsupported-query editor instead — filter on it to separate supported-mode activity from unsupported-lambda fallback on any event carrying `queryInfo`.

`timings` breaks the run into phases:

| Key                                                             | Phase                                    |
| --------------------------------------------------------------- | ---------------------------------------- |
| `query-builder.run-query.prepare`                               | building the lambda and parameter values |
| `graph-manager.v1.engine-operation.graph.collect-input.success` | serializing the engine request           |
| `graph-manager.v1.engine-operation.server-call.success`         | **the engine execution itself**          |
| `query-builder.run-query.process-result`                        | materializing results into the grid      |
| `total`                                                         | client-side wall clock                   |

On a failure, the laps that are _missing_ are the signal: no `server-call.success` means the query never reached the engine.

### Unsupported query fallback (`@finos/legend-query-builder`)

| Event                                    | Payload                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `query-builder.unsupported-query.launch` | envelope · `errorMessage` · `errorMessageTruncated?` · `errorName` · `httpStatus?` |

Fired when the query lambda could not be built into the form-mode builder and the user fell through to the raw-lambda / unsupported-query editor. Countable per entry point / GAV via the envelope. The full untruncated stack is still written to the log service alongside — this event is a count, not a debugging record.

Also observable on any downstream event carrying `queryInfo` via `isQuerySupported: false` — that's the way to attribute _executions_ from the unsupported editor, since this event only fires at the fallback point.

### Query authoring (`@finos/legend-query-builder`)

All fire from UI callsites only, so loading a saved query produces no authoring noise. All carry the full envelope plus `change`.

| Event                                    | `change` fields                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `query-builder.execution-context.change` | `subtype`: `class` / `mapping` / `runtime`                                                         |
| `query-builder.projection.change`        | `action`: `add`/`remove`/`move`/`clear`/`add-derivation` · `sourceType` · `columnCount`            |
| `query-builder.aggregation.change`       | `action: 'operator-change'` · `operatorName`                                                       |
| `query-builder.window.change`            | `action`: `add`/`edit`/`remove` · `columnCount`                                                    |
| `query-builder.graph-fetch.change`       | `action`: `add`/`remove`/`check-toggle`/`serialization-change` · `nodeCount` · `serializationType` |
| `query-builder.parameter.change`         | `action`: `add`/`edit`/`remove` · `parameterCount`                                                 |
| `query-builder.constant.change`          | `action`: `add`/`edit`/`remove` · `constantCount`                                                  |
| `query-builder.result-modifier.change`   | `limitSet` · `distinctOn` · `sortColumnCount` · `sliceSet`                                         |
| `query-builder.watermark.change`         | `enabled`                                                                                          |
| `query-builder.milestoning.change`       | `subtype`: `business-date`/`processing-date`/`all-versions`/`all-versions-in-range`                |
| `query-builder.filter.change`            | `action`: `remove`/`group-operation-change` · `groupOperation`                                     |
| `query-builder.post-filter.change`       | same as `filter.change`                                                                            |

Drag-and-drop _reordering_ is deliberately not reported for window columns or filter nodes — it would emit on every hover-driven reorder. Projection reordering is reported, as a discrete `move` on drop.

## Worked example: top data spaces queried

> "Which data spaces are queried most?"

**Pick the event.** You want executions, not opens, so `query-builder.run-query.success`. Using `query-builder.opened` would count people who opened the builder and never ran anything — useful as a funnel numerator, but not the same question.

**Pick the field.** The data space is part of the _entry point_, so it is flat: `dataSpace`. Not `state.dataSpace` — `state` only ever holds class/mapping/runtime.

**Filter by `sourceType`.** `dataSpace` is only present when `sourceType` is `data-space` or `data-space.template`. Filtering on it avoids mixing in data-product rows that happen to have a null column.

This counts **both** newly authored and saved queries, which is almost always what you want — running a saved query is still querying that data space, and saved queries are typically the bulk of activity. Add `AND data.queryId IS NULL` only if you specifically mean "queries authored from scratch".

```sql
SELECT
  data.dataSpace          AS data_space,
  COUNT(*)                AS runs,
  COUNT(DISTINCT user_id) AS users
FROM telemetry_events
WHERE event_type = 'query-builder.run-query.success'
  AND data.sourceType IN ('data-space', 'data-space.template')
  AND event_time >= NOW() - INTERVAL '30' DAY
GROUP BY data.dataSpace
ORDER BY runs DESC
LIMIT 20
```

`COUNT(DISTINCT user_id)` alongside the raw count matters: one person running the same query in a loop looks identical to broad adoption otherwise.

### Variations

**Include failures**, so a data space that is popular but broken doesn't look unpopular:

```sql
WHERE event_type IN (
  'query-builder.run-query.success',
  'query-builder.run-query.failure'
)
```

then `SUM(CASE WHEN event_type LIKE '%.failure' THEN 1 ELSE 0 END)` for a failure rate per data space.

**Saved vs. newly authored, per data space** — the split `queryId` exists for:

```sql
SELECT
  data.dataSpace AS data_space,
  SUM(CASE WHEN data.queryId IS NOT NULL THEN 1 ELSE 0 END) AS saved_query_runs,
  SUM(CASE WHEN data.queryId IS NULL     THEN 1 ELSE 0 END) AS ad_hoc_runs,
  COUNT(DISTINCT data.queryId)                              AS distinct_saved_queries
FROM telemetry_events
WHERE event_type = 'query-builder.run-query.success'
  AND data.sourceType = 'data-space'
GROUP BY 1
```

**All entry points, not just data spaces** — coalesce the variant-specific field:

```sql
SELECT
  data.sourceType AS entry_point,
  COALESCE(data.dataSpace, data.dataProduct, data.service, data.mapping) AS target,
  COUNT(*) AS runs
FROM telemetry_events
WHERE event_type = 'query-builder.run-query.success'
GROUP BY 1, 2
ORDER BY runs DESC
```

**Which execution context each data space resolves to** — this is where the flat/nested split earns its keep:

```sql
SELECT
  data.dataSpace           AS data_space,
  data.executionContext    AS declared_context,   -- from the route
  data.state.mapping       AS resolved_mapping,   -- what the builder used
  COUNT(*)                 AS runs
FROM telemetry_events
WHERE event_type = 'query-builder.run-query.success'
  AND data.sourceType = 'data-space'
GROUP BY 1, 2, 3
```

**Adoption funnel per data space** — opened -> ran -> succeeded, one uniform query:

```sql
SELECT
  data.dataSpace AS data_space,
  SUM(CASE WHEN event_type = 'query-builder.opened'              THEN 1 ELSE 0 END) AS opened,
  SUM(CASE WHEN event_type = 'query-builder.run-query.launch'    THEN 1 ELSE 0 END) AS launched,
  SUM(CASE WHEN event_type = 'query-builder.run-query.success'   THEN 1 ELSE 0 END) AS succeeded,
  SUM(CASE WHEN event_type = 'query-builder.run-query.cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM telemetry_events
WHERE event_type IN ('query-builder.opened')
   OR event_type LIKE 'query-builder.run-query.%'
  AND data.sourceType = 'data-space'
  AND app_name = 'legend-query'    -- `opened` is Legend Query only today
GROUP BY 1
```

Scope both sides by `app_name`: `run-query.*` fires from Studio too, but `opened` does not yet, so an unscoped funnel would show more runs than opens.

**Engine time vs. client time**, to tell a slow backend from a slow browser:

```sql
SELECT
  data.dataSpace AS data_space,
  APPROX_PERCENTILE(data.timings['graph-manager.v1.engine-operation.server-call.success'], 0.5) AS p50_engine_ms,
  APPROX_PERCENTILE(data.timings['query-builder.run-query.process-result'], 0.5)                AS p50_render_ms,
  APPROX_PERCENTILE(data.timings['total'], 0.5)                                                 AS p50_total_ms
FROM telemetry_events
WHERE event_type = 'query-builder.run-query.success'
  AND data.sourceType = 'data-space'
  AND data.timings['__numberOfInteruptions'] IS NULL   -- drop backgrounded tabs
GROUP BY 1
```

> Column access syntax for nested fields (`data.state.mapping`, `data.timings['total']`) varies by warehouse — adjust for yours.

## Wiring up a new host (e.g. Legend Studio)

`query-builder.opened` is defined in `legend-query-builder`, so any host can emit it:

1. Add a `studio.*` value to `QUERY_BUILDER_OPENED_FROM` (additive).
2. Call `queryBuilderState.logOpened(openedFrom, extra?)` once the builder is loaded.

Legend Studio constructs query builders directly from ~13 editor surfaces rather than through `QueryEditorStore`, and only two of them currently pass `sourceInfo` at all — so most Studio-originated `run-query.*` events carry no `sourceType`. Wiring `logOpened()` is the point at which those become attributable.

Two things to settle when that happens: Studio can have several query builders open under one `appSessionId`, so session alone will not attribute a later `run-query` to its `opened` (either add a per-builder id or accept session-level attribution); and if explicit calls prove too easy to forget across that many surfaces, emitting from the `QueryBuilderState` constructor remains available as an upgrade — though it would need to suppress derived states such as `INTERNAL__toBasicQueryBuilderState()`, which is built on every data preview.

## Adding a new event

1. Add the constant to `QueryBuilderEvent.ts` or `LegendQueryEvent.ts`.
2. Add a payload type in the matching telemetry helper. Extend `QueryBuilderTelemetryContext` so the event inherits the envelope, and nest anything event-specific under `change`.
3. Add a `logEvent_*` static to the helper — these are pure pass-throughs, the shape lives in the type.
4. Call it from the **UI callsite**, not from state-mutation code, so query load and deserialization don't emit. Spread `queryBuilderState.safeGetTelemetryContext()` as the first property.
5. Add a changeset describing the payload, and a unit test asserting the emitted shape.

Telemetry must never break a user action. Use the `safeGet*` accessors on `QueryBuilderState` — they swallow and log rather than throw. Keep payloads shape-only: counts, booleans and element paths, never user-entered values.
