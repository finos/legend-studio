---
'@finos/legend-query-builder': patch
---

Replace `QueryBuilderTDSState.useColFunc` with a `TDS_PROJECTION_MODE` enum (`PROJECT`, `PROJECT_COL`, `SELECT`) so the projection step can be emitted in three forms. Adds round-trip support for relation `select(~[...])` queries (`RELATION_SELECT`).
