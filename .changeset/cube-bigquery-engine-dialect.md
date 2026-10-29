---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Follow the engine's BigQuery dialect (legend-engine#5108) in the dialect roundtrip tests: BigQuery now plans a static PIVOT (still refused by Cube until it is run against BigQuery), and writes no `NULLS FIRST`/`NULLS LAST` in a window's sort, leaving BigQuery's own order, empty values low.
