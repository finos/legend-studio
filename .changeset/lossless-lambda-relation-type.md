---
'@finos/legend-graph': patch
---

Add `getLambdaResolvedRelationType` and `getBatchLambdasResolvedRelationType` to the graph manager. They return the engine's relation type as a metamodel `RelationType`, keeping type parameters (`Varchar(5)`), multiplicity, stereotypes and tagged values that `getLambdaRelationType` drops.
