---
'@finos/legend-data-cube': patch
'@finos/legend-application-data-cube': patch
---

Persist the resolved column name/type list (`relationType`) on a saved DataCube's specification, and reuse it when reopening an unmodified DataCube to skip the `lambdaRelationType` engine round trip.
