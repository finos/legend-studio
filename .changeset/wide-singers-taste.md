---
'@finos/legend-application-query-deployment': patch
'@finos/legend-extension-dsl-data-quality': patch
'@finos/legend-application-query': patch
'@finos/legend-query-builder': patch
'@finos/legend-lego': patch
---

Add TDS cell selection stats bar to the query builder results grid. When two or
more cells are selected in the results grid, a stats bar is shown below the
grid displaying count, unique count, empty count, and type-specific statistics
(min, max, sum, avg for numeric; min/max dates for date columns; min/max length
for string columns) along with an inline distribution histogram.
