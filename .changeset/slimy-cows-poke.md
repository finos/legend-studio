---
'@finos/legend-graph': patch
---

pr: #443
Account for cycles and duplication when resolving all child set implementations and `leaf` set implementations of an `operation set implementation`. Also, since we don't try to _understand_ how each operation works, we will disregard the operation type in this resolution.
