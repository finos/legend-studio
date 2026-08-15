---
'@finos/legend-graph': patch
---

Fix roundtrip hashCode drift for relational class mappings that reference tables from an ingest-generated (lakehouse) database via an outer `Database` `include`. When transforming a `TableAlias` back to a `V1_TablePtr`, we now preserve the user's originally-serialized database path (e.g. the outer `Database` the mapping actually referenced) whenever it differs from the synthetic `INTERNAL__LakehouseGeneratedDatabase.path`, instead of unconditionally rewriting to the owning ingest path. The guard also skips the rewrite when there is no serialized path so the resolved path is not clobbered with an empty string.
