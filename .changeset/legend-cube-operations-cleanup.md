---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube cleans up its operations: Min and Max on strings and Booleans, Distinct Count and Distinct Value on enumerations, a Join's shared columns compared in any case, no backtick in the names it gives columns, a `startsWith`, `endsWith` or `contains` given a pattern that isn't a literal refused unless the cube runs on Snowflake, the grid's Filter by on a 32-bit float finding its rows, and the row limit read as a whole number.
