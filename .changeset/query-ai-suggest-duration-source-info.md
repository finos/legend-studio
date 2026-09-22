---
'@finos/legend-application-query': patch
---

Enrich Legend AI title/description suggest telemetry in Legend Query with fetch latency, entry-point source info, and a new success event:

- Add `query-editor.legendai-query-suggest.success`, emitted when a suggestion is returned to the user. Its payload carries `durationMs` (wall-clock duration of the suggester call) plus the query's `sourceInfo` spread flat, so success rate and fetch latency can be sliced by dataspace / mapping / service / data product entry point.
- Extend `query-editor.legendai-query-suggest.launch`, `.apply`, and `.discard` with the same flat `sourceInfo` fields, matching how `sourceInfo` is reported on every other query telemetry event.
- Extend `query-editor.legendai-query-suggest.failure` with `durationMs` and flat `sourceInfo`, so failed calls can be measured for latency and grouped by entry point (and HTTP-status buckets can still be inferred from `errorMessage`).
- Wire the existing rename-query dialog through `launch` / `success` (previously it only emitted `failure`), so rename-side suggest usage is visible.
