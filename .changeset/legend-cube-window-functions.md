---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Add window functions to Legend Cube: Apply Window Functions (Partition), with partition columns, sort columns, and Count, Distinct Count, Distinct Value, Sum, Average, Min, Max, Count Rows, Rank, Dense Rank and Row Number. Every window that isn't the node being run is bound with a `let`, so a later filter can't run before it.
