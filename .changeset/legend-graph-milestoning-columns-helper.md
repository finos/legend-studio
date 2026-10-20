---
'@finos/legend-graph': minor
---

Export `V1_getMilestoningColumnsForWriteMode`, a context-free helper that returns the milestoning system columns (`LAKE_IN_ID`, `LAKE_OUT_ID`, `LAKE_DIGEST`, and for business-temporal write modes `LAKE_FROM`/`LAKE_THRU`) injected for a given ingest dataset write mode. This is the same logic `V1_AccessorHelper.ts` uses internally to build an ingest dataset's relation type, now reusable by callers that don't have a built graph/`V1_GraphBuilderContext` at hand.
