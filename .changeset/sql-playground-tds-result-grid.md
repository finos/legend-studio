---
'@finos/legend-query-builder': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-product': patch
---

Add `TEMPORARY_PlaygroundTDSResultGrid` component to SQL playground and refactor SQL execution result handling to use typed result classes (`QueryExecutionResult`, `CsvSqlExecutionResult`) instead of plain CSV objects
