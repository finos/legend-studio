---
'@finos/legend-query-builder': patch
---

Allow drag-and-drop of a relation column as the right-hand value of a filter condition when the filter source is also a relation column (e.g. `$x.colA == $x.colB`), and round-trip the same shape on the post-filter side so a projected relation column can be used as the right-hand value of a post-filter condition.
