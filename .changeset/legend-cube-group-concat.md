---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube gains Group ("Group by Column") and Concat ("Concatenate Another Input").

Group gives one row per value of its group columns, or one row for all the rows with none, each with its
aggregations: Count, Distinct Count, Distinct Value, Sum, Average, Min, Max and Count Rows, which counts every row.
Each is offered on the column types the spec lists, typed and made nullable as the engine types it, and named after
its column until renamed. The grid's quick actions gain `Group by "X"`.

Concat gives the rows of its two inputs, which must have the same columns, matched by position. Its editor shows both
inputs' columns side by side, marking each difference, and offers a Rename or a Restrict before an input when one
makes them match. Its Convert types setting converts types that differ within numbers, strings or dates to the type
they share; the Join and Filter editors warn that a date converted with timestamps matches them only at midnight.

Engine tests hold the schema Cube infers to the engine's for every node type.
