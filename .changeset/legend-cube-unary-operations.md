---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube gains its simple operations:

- Sort ("Sort by Column") orders rows by one or more columns, each ascending or descending. The order is written where
  it is used: before a Limit, Drop or Slice, and before the rows shown. A Sort whose order a later node loses, such as
  a Join, shows a warning.
- Restrict ("Restrict Columns") keeps some columns of its input, in the input's order.
- Rename ("Rename Columns") gives columns new names, refusing a name another column keeps. A Join whose inputs share
  columns it isn't joined on offers to rename them before each input.
- Limit ("Take first <x> rows") keeps the first rows of its input, Drop ("Drop first <x> rows") removes them, and Slice
  ("Take rows <x> to <y>") keeps the rows from a start up to, but not including, a stop, counting from 0. Their sizes
  and bounds are whole-number fields that report a cleared or invalid value instead of falling back to the default.
- Distinct ("Distinct Values") keeps one row of each set of identical rows.
- On SQL Server, Sybase, Sybase IQ, DB2 and MemSQL, read from the runtime's connections, Drop and Slice go through row
  numbers, and on SQL Server a Distinct is padded, as those databases reject the engine's native forms.
- A right-click on a cell of the results offers Sort by and Filter by its column, which add a Sort, or a Filter on the
  cell's value, after the node that ran.
