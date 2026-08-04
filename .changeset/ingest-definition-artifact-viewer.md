---
'@finos/legend-application-studio': patch
'@finos/legend-query-builder': minor
---

Add `IngestionDefinitionArtifactViewer` for viewing generated ingest definition artifacts (mat view explorer, schema grid, SQL sub-tabs for view function / barrier / select, JSON view, fullscreen toggle). Wire a "View SQL" action into the Ingest Definition editor that generates and caches the artifact by hash. Extend `tryToFormatSql` with an optional `language` parameter (defaults to `mysql`) so the viewer can format Snowflake SQL.
