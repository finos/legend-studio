# @finos/legend-cube-builder

## 0.0.3

### Patch Changes

- [#5634](https://github.com/finos/legend-studio/pull/5634) [`3260216`](https://github.com/finos/legend-studio/commit/3260216a6c3468ff506065b929b7c5093ea81e69) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube: the canvas fits the query again when only its height changes, e.g. when the splitter above the results grid moves. Both packages document how to host the page, how to test it, and how to add an operation.

- [#5644](https://github.com/finos/legend-studio/pull/5644) [`0335b3f`](https://github.com/finos/legend-studio/commit/0335b3f5fa7604f3c58a22485effb7a6b395860d) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Legend Cube gains its simple operations:

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
  - Read from the runtime's connections, the databases whose engine SQL is rejected or takes the wrong rows get another
    form: Drop and Slice go through row numbers on SQL Server, Sybase and Sybase IQ, and Drop also on DB2, MemSQL and
    ClickHouse; on Sybase IQ, so does every Limit; and a Distinct is padded on SQL Server and Sybase IQ.
  - A right-click on a cell of the results offers Sort by and Filter by its column, which add a Sort, or a Filter on the
    cell's value, after the node that ran.

## 0.0.2

### Patch Changes

- [#5591](https://github.com/finos/legend-studio/pull/5591) [`fbde437`](https://github.com/finos/legend-studio/commit/fbde4379fcaa2693f4661c0974ded1379a841ed1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add the packages of Legend Cube, a visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query hosts the Legend Cube page at `/query/cube`, loaded on first visit. The page draws the query as a canvas: tables come from a bundled or pasted Pure model, Join and Filter steps are added from a palette, by drag and drop or from a context menu, and edited in a side panel. It runs the query on the engine and shows its rows, with undo, keyboard shortcuts (F9, Ctrl/Cmd+Z), Show Pure, and export and import of the cube's spec.
