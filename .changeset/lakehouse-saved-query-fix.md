---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
'@finos/legend-application-query': patch
---

Fix opening saved queries that target a `LakehouseAccessPoint`:

- `@finos/legend-graph`: Add `__internal__RelationType` to `LakehouseAccessPoint` and cache it during `buildLakehouseAccessDataProductAnalysis` so downstream consumers can avoid re-deriving it. Extract `V1_buildRelationTypeFromAccessPointImplementation` into `V1_AccessorHelper` for reuse, and use the cached relation type in the `DATA_PRODUCT_ACCESSOR` value-specification builder (fail-fast when missing).
- `@finos/legend-query-builder`: Use the shared helper in `DataProductQueryBuilderState.resolveDataProductAccessor` to remove duplicated relation-type derivation logic.
- `@finos/legend-application-query`: Route saved queries with `QueryDataProductLakehouseExecutionContextInfo` through the minimal-graph path (instead of falling through to `buildFullGraph`), and map them to a `LegendQueryDataProductQueryBuilderState` with `DataProductAccessType.LAKEHOUSE` in `initQueryBuildStateFromQuery`. Gate the mapping assertion in `buildQueryForPersistence` on `requiresMappingForExecution` so Lakehouse queries (which have no mapping) can be saved. Make the Lakehouse runtime configuration modal available for `LakehouseDataProductExecutionState` in `LegendQueryDataProductQueryBuilder`, matching the existing behaviour for `ModelAccessPointDataProductExecutionState`.
