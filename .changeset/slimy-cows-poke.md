---
'@finos/legend-graph': patch
'@finos/legend-studio': patch
---

Account for cycles and duplication when resolving all child set implementations and `leaf` set implementations of an `operation set implementation`. Also, since we don't try to `understand` how each operation works, we will disregard the operation type in this resolution.
