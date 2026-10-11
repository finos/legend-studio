---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Add Lag, Lead, NTile, Percent Rank, Cumulative Distribution, First and Last to Legend Cube's Apply Window Functions. Lag and Lead read a column from the row so many rows before or after, by the window's sort; First and Last read the partition's first and last rows; NTile splits each partition into buckets; Percent Rank and Cumulative Distribution place each row in its partition. Each needs a sort column.
