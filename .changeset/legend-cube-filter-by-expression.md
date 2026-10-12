---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube can filter rows by a Pure condition (Filter by Expression), checked by the engine, which now checks Extend's columns and filter conditions through one path. On DuckDB, both filters refuse `%` and `_` in a starts-with, ends-with or contains pattern, which the engine's SQL would match as wildcards.
