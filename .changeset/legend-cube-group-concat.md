---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube gains the aggregations Group will use: Count, Distinct Count, Distinct Value, Sum, Average, Min, Max and
Count Rows, which counts every row. Each is offered on the column types the spec lists, with the result type and
nullability the engine gives. Its engine tests hold the schema Cube infers to the engine's for every node type.
