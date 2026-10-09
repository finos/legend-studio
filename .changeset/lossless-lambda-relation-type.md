---
'@finos/legend-graph': patch
---

Add `getLambdaResolvedRelationType` and `getBatchLambdasResolvedRelationType` to the graph manager. They return the engine's relation type as a metamodel `RelationType`, keeping type parameters (`Varchar(5)`), multiplicity, stereotypes and tagged values that `getLambdaRelationType` drops. A column whose type isn't in the graph (for example an enum that isn't loaded) is typed `Any` and listed in `unresolvedColumns` instead of failing the whole relation type. The same behaviour is available as `V1_buildResolvedRelationTypeFromV1RelationType`; `V1_buildRelationTypeFromV1RelationType` is unchanged and still throws.
