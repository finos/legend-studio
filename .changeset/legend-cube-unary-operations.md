---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube: Sort ("Sort by Column") orders rows by one or more columns, each ascending or descending; the order is written where it is used, before a Limit, Drop or Slice and before the rows shown. Restrict ("Restrict Columns") keeps some columns of its input, in the input's order; Rename ("Rename Columns") gives columns new names, refusing a name another column keeps, and a Join whose inputs share columns it isn't joined on offers to rename them before each input; Limit ("Take first <x> rows") keeps the first rows of its input, Drop ("Drop first <x> rows") removes them, and Slice ("Take rows <x> to <y>") keeps the rows from a start up to, but not including, a stop, counting from 0, and Distinct ("Distinct Values") keeps one row of each set of identical rows. Their sizes and bounds are whole-number fields that report a cleared or invalid value instead of falling back to the default.
