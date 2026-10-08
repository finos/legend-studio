---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube: Limit ("Take first <x> rows") keeps the first rows of its input, Drop ("Drop first <x> rows") removes them, and Slice ("Take rows <x> to <y>") keeps the rows from a start up to, but not including, a stop, counting from 0, and Distinct ("Distinct Values") keeps one row of each set of identical rows. Their sizes and bounds are whole-number fields that report a cleared or invalid value instead of falling back to the default.
