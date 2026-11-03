---
'@finos/legend-query-builder': patch
---

Keep limit, sort, distinct and slice, and the Run Query preview limit, when a typed TDS query ends with window columns (`extend(over(...), ~[...])`) or a relation query ends with `select(~[...])`. After `select(~[...])` they are written as the relation functions in either lambda writer mode. These queries, and typed queries with both a limit and a slice, now also load back into the query builder.
