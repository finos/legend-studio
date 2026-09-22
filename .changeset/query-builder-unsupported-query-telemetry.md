---
'@finos/legend-query-builder': patch
---

Make query builder unsupported-lambda fallback observable via telemetry.

- Fire `query-builder.unsupported-query.launch` on `TelemetryService` when the query lambda can't be built into the form-mode builder and the user falls through to the raw-lambda / unsupported-query editor. The event carries the shared query telemetry envelope (source info flat + `state` nested) plus the standard error dimensions (`errorMessage`, `errorMessageTruncated?`, `errorName`, `httpStatus?`), so the fallback is countable per entry point / GAV rather than only visible in developer logs. The full untruncated stack is still written to `logService.error` alongside.
- Add `isQuerySupported: boolean` to `QueryBuilderQueryInfo`. It rides on every event that already carries `queryInfo` (`query-builder.run-query.launch` / `.success` / `.failure` / `.cancelled`, export, plan, debug-plan), so executions from the unsupported editor are attributable without joining against the fallback event.
- Fix a typo in the event name: the enum value moves from `query-builder.unsupported-query.lanuch` to `query-builder.unsupported-query.launch`. This string was previously only used as a `logService.error` `eventType` (never emitted to `TelemetryService`), so no live telemetry dashboards depended on the misspelling.
