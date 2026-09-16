---
'@finos/legend-query-builder': patch
---

Add `query-builder.opened` — the canonical "a query builder is loaded" event — plus `QUERY_BUILDER_OPENED_FROM` and `QueryBuilderState.logOpened(openedFrom, extra?)`.

Until now each host reported query builder loads through its own route-specific event, so counting opens meant a `UNION` of differently shaped events that each covered only part of the population. This event is emitted by the host once the builder is loaded, carries the shared telemetry envelope (source info spread flat, resolved execution context under `state`), and adds `openedFrom` naming the surface that opened it.

`openedFrom` names the surface only — what is being queried is already carried by `sourceType` and its target field, and `queryId` already marks a saved query, so there is deliberately no `query.creator.data-space`-style cross product. It is carried on this event alone: `TelemetryServicePlugin.setup()` already stamps every payload with `appName` and `appSessionId`, so repeating the surface on high-frequency events like `run-query.*` would duplicate data that is already reachable.

`logOpened()` is called by the host rather than emitted from the constructor, so `state` reflects a resolved execution context rather than a half-built one, and derived states such as `INTERNAL__toBasicQueryBuilderState()` — built on every data preview — do not emit spurious opens.

Only Legend Query emits this today; Legend Studio's entry points are not yet wired up, so `studio.*` values do not exist yet and Studio-originated query builders report no open event.
