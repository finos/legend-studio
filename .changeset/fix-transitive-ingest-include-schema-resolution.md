---
'@finos/legend-graph': patch
---

Fix graph build failure `Can't find schema '<X>' in database '<DB>'` when a parent `Database` `include`s a child `Database` whose schemas come from `include Ingest`. The relation resolver in `V1_GraphBuilderContext.resolveRelation` now walks classic database includes transitively to find ingest-generated databases (child DB's `includedStoreSpecifications`), instead of only looking at the owner database's own ingest includes. Also fixes the `V1_findSchema` error message to render the database path instead of `[object Object]`.
