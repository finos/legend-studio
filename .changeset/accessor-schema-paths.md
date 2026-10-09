---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
---

Fix relational store accessors (`#>{db.schema.TABLE}#`) built from a lambda. A table name that exists in several schemas now comes from the schema in the path, instead of the first schema that has it, which also rewrote the query to that schema on save. `#>{db.TABLE}#` now means the default schema, as in the engine, instead of the first table of the database, and is saved as written: `RelationalStoreAccessor` gains `hasExplicitSchema`. A quoted table name containing a dot, which the grammar splits into several path parts, is joined back. A path with no table, or with more than three parts, is now an error instead of resolving to some other table.
