---
'@finos/legend-query-builder': patch
---

Fix building lambda for queries whose source is an `Accessor` (relation source) and that use aggregations. Aggregations now route through the relation `project()->groupBy(...)` path based on `useRelation` instead of `isFetchStructureTyped`, and `buildRelationAggregation` correctly handles `QueryBuilderRelationColumnProjectionColumnState` and `QueryBuilderDerivationProjectionColumnState` map lambdas instead of assuming an `AbstractPropertyExpression`.
