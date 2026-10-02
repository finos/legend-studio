---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-space-studio': patch
---

Add a unified `editor.legendai-suggest.{exposure,launch,success,failure,apply,discard,abandon,persisted}` telemetry family for the LegendAI "Suggest with AI" flows in the service, dataspace and data product editors. Events carry a `surface` discriminator, the element path (plus `accessPointGroupId` for data products) and a `suggestionId` / `attempt` so one suggestion can be followed from request to push. New signals include request latency, typed failures (`stage`, `errorKind`, `httpStatus` — e.g. entitlement 401/403 vs server errors vs empty responses), model confidence, edits made while a request was pending, suggestions abandoned by leaving the editor, data product apply details (match strategy, renamed / sanitized access points), and whether applied text survived to the next push (`retention`, `editRatio`).

The lifecycle is implemented once in `LegendAISuggestTelemetryTracker` (exposed with the `useLegendAISuggestTelemetry` hook and the `LEGENDAI_SUGGEST_*` enums). The existing per-surface `editor.<surface>.legendai-suggest.*` events are still emitted unchanged. An empty LegendAI response now shows a warning instead of silently doing nothing.
