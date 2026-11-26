---
'@finos/legend-query-builder': patch
---

Keep limit, sort, distinct and slice, and the Run Query preview limit, when a typed TDS query ends with window columns (`extend(over(...), ~[...])`) or a relation query ends with `select(~[...])`. These are now written in the style of the projection: as the relation functions whenever the projection is a relation, so also for an accessor source in classic mode, which used to get `take()` / `sort(asc(...))`. These queries, and typed queries with both a limit and a slice, now also load back into the query builder.
