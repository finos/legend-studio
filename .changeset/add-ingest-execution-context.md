---
'@finos/legend-graph': patch
'@finos/legend-application-query': patch
---

Add support for `IngestExecutionContext` (`V1_QueryIngestExecutionContext` / `QueryIngestExecutionContext`) as a new `QueryExecutionContext` type with `ingestDefinitionPath` and `dataSet` fields.

Add an `INGEST_QUERY` route (`/ingest/:gav/:ingestDefinitionPath/:dataSet`) to Legend Query with a scaffolded `IngestQueryCreator` that fetches only the ingest definition entity from Depot (no full graph build) and opens the editor against an `IngestLegendQueryBuilderState` (extends `AccessorQueryBuilderState`).
