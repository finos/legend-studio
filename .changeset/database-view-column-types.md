---
'@finos/legend-graph': patch
---

Type database view columns from their source columns: a view column that maps straight to a table column (directly, through a join, from an included database, or through a view built earlier) now takes that column's type, and its nullability when no join is involved, instead of an invented `VARCHAR(50)`. Computed columns, and columns over a view built later, keep the `VARCHAR(50)` placeholder. The protocol and element hashes are unchanged.
