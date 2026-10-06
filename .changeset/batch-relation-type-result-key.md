---
'@finos/legend-graph': patch
'@finos/legend-extension-dsl-data-product': patch
---

Fix batch lambda relation typing: read the engine's `result` map (not `results`), which made every `lambdaRelationType/batch` call throw, and share one parser between the graph manager and direct engine-client callers.
