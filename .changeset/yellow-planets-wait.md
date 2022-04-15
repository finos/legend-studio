---
'@finos/legend-graph': patch
---

When building the graphs, raw lambdas' shortened paths will no-longer be auto-resolved when the graph is immutable (i.e. when building `dependencies`, `generation`, and `system` graphs). This would help improve the overall graph building performance.
