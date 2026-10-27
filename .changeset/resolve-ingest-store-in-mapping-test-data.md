---
'@finos/legend-graph': patch
---

Fix graph building for mapping test suites whose `storeTestData` references a Lakehouse `IngestDefinition` or `DataProduct` as the store. Previously, `V1_GraphBuilderContext.resolveStore()` only recognized classic `Store` elements (`Database`, `FlatData`, `ModelStore`), causing graph build to fail with `Can't find store '<path>'` for mappings sourced from a Lakehouse ingest's relation function.

Also fix the `V1_MappingTestSuite` protocol field order (`func` before `id`) so transformed entities' fields stay alphabetically sorted, which was blocking a protocol roundtrip test from being enabled for mapping test suites.
