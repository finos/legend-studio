---
'@finos/legend-cube-builder': patch
---

Expect Explore JSON's "total of" an array to be 0, not empty, for a row whose array is empty or missing, as the engine now sums no elements to 0 on DuckDB.
