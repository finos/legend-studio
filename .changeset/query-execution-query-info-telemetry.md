---
'@finos/legend-query-builder': patch
---

Enrich query-execution telemetry with timing and authoring-state shape.

- The `query-builder.run-query.success` and `query-builder.run-query.failure` payloads now include an `executionDurationMs` field (wall-clock milliseconds from the start of `runQuery` to the resolution/failure of the promise).
- `report.timings` on `run-query.success` is now broken into named phases instead of reporting only a `total`:
  - `query-builder.run-query.prepare` — building the execution lambda and parameter values
  - `graph-manager.v1.engine-operation.graph.collect-input.success` — serializing the engine request
  - `graph-manager.v1.engine-operation.server-call.success` — **the engine execution itself**
  - `query-builder.run-query.process-result` — materializing the result into the grid
    The two engine laps were already being measured inside `V1_PureGraphManager` and discarded, because `QueryBuilderResultState` never passed the optional `report` argument to `graphManager.runQuery`; it now does.
- `run-query.failure` carries the same `timings`, collected up to the point of failure. Which laps are _missing_ is the signal: no `...server-call.success` means the query never reached the engine, so the failure is pre-flight rather than in-flight.
- Because the `StopWatch` now starts at the top of `runQuery` rather than just before the engine call, `timings.total` and the execution duration shown in the results panel both widened to include the prepare phase. The old figure is recoverable as `total - prepare`.
- `run-query.launch` and `run-query.cancelled` now carry the shared context envelope, so launches and cancellations can be sliced by entry point and execution context (and a launch -> success funnel is computable per data product). Previously they carried neither.
- All four `run-query.*` events (`launch` / `success` / `failure` / `cancelled`) now include a `queryInfo` payload summarizing the current authoring state:
  - `fetchStructureType` (`TABULAR_DATA_STRUCTURE` / `GRAPH_FETCH`)
  - `isTypedFetchStructure` (TDS only): `true` when all projection columns are relation-based (typed relation function family), `false` for classic property-driven TDS
  - `parameterCount`, `constantCount`
  - `hasFilter`, `filterNodeCount`
  - `watermarkEnabled`
  - `milestoningKind` (`get-all` / `all-versions` / `all-versions-in-range` / `none`)
  - When `fetchStructureType` is TDS: `projectionColumnCount`, `windowColumnCount`, `aggregationColumnCount`, `postFilterNodeCount`, `hasLimit`, `hasDistinct`, `sortColumnCount`, `hasSlice`

`queryInfo` is exposed on `QueryBuilderState` as `getQueryInfo(): QueryBuilderQueryInfo` and only carries shape/counts — no user values, no element identifiers.

**Payload shape (breaking for the execution events).** Class/mapping/runtime context moves out of the flat top level and into a nested `state` key. The entry point (`sourceInfo` — `sourceType`, project GAV, `dataSpace` / `dataProduct` / `service` / …) stays spread flat where it is. Previously `getStateInfo()` merged the two, which made "arrived on mapping X" indistinguishable from "currently querying mapping X" and returned nothing at all unless class, mapping _and_ runtime had all resolved — discarding the source info along with them. Affects `run-query.success`, `export-query-data.success`, `generate-plan.success`, `debug-plan.success`, `embedded-data-cube.success` and `mapping-model-coverage-analysis.success`.

Dashboards slicing by `groupId` / `artifactId` / `versionId` / `dataProduct` / `dataSpace` are unaffected. Dashboards reading `class` / `mapping` / `runtime` must move to `state.class` / `state.mapping` / `state.runtime`.

`QueryBuilderState` gains `getExecutionContextInfo()` and `safeGetTelemetryContext()` for this; `getStateInfo()` is deprecated for telemetry use but retained.

`state` also reports `isInlineRuntime: true` for queries running against an inline (engineered) runtime. Those have no element path, so `runtime` is absent — previously that population was indistinguishable from "no runtime selected yet", and in fact emitted no context at all.

**`run-query.failure` additionally carries `executionTraceId`** when the error is an `ExecutionError` that has one — the single most useful field for following a failed execution into backend traces. The four failure payloads (`run-query`, `generate-plan`, `debug-plan`, `export-query-data`) are now built by one `QueryBuilderResultState.buildFailureTelemetryData()` helper so they share a set of dimensions with each other and with the creator-failure events (`errorMessage`, `errorName`, `httpStatus`).

Two unrelated bugs fixed in the export path while instrumenting it: a failed download left `exportState` stuck `IN_PROGRESS` because the `.catch` branch never called `fail()`, and a synchronous export failure ended up marked SUCCEEDED because the outer catch called `complete()` after `fail()` (`complete()` defaults to `hasSucceeded = true`).

`errorMessage` on all four failure events is now capped at 2000 characters, with `errorMessageTruncated: true` present on the payload when it was clipped. The full message continues to go to the log service.
