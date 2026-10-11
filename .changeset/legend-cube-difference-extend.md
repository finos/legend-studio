---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Add Compare Column Values (Difference) and Extend Columns to Legend Cube. Difference joins two inputs on key columns, keeping every row of both, and for each numeric difference column `x` gives `x_1`, `x_2` and `x_valueDifference`, an empty value counting as 0. Extend adds columns computed by Pure expressions, written inline, which the engine checks, types against the cube's model and plans for its database; a column can use the ones before it, and the builder types an Extend again in the background when its input changes.
