---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
'@finos/legend-application-studio': patch
---

Type data product and matview accessors from the engine with `getLambdaResolvedRelationType`, so their columns keep type parameters (`Varchar(5)`) and nullability. Without a data product artifact, the query builder no longer turns nullable columns into `[1]`. `resolveDataProductAccessor` also accepts the resolved `RelationType`; passing `RelationTypeMetadata` still works but is deprecated.

Behaviour change: a column whose type isn't in the graph (for example an enum that isn't loaded) is now typed `Any`, with a warning logged, instead of `String` (data product and matview accessors) or failing the whole accessor (the query builder without an artifact, data products read from their artifact, and data product analysis). Such a column can be projected, but offers no filter operators. New export `V1_buildResolvedRelationTypeFromAccessPointImplementation`; `V1_buildRelationTypeFromAccessPointImplementation` is unchanged.
