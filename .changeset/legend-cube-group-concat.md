---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube gains Group ("Group by Column"): one row per value of its group columns, or one row for all the rows
with none, each with its aggregations. The aggregations are Count, Distinct Count, Distinct Value, Sum, Average, Min,
Max and Count Rows, which counts every row. Each is offered on the column types the spec lists, typed and made
nullable as the engine types it, and named after its column until renamed. Its engine tests hold the schema Cube
infers to the engine's for every node type.
