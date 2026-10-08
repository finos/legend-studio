# @finos/legend-cube-builder

## 0.0.2

### Patch Changes

- [#5591](https://github.com/finos/legend-studio/pull/5591) [`fbde437`](https://github.com/finos/legend-studio/commit/fbde4379fcaa2693f4661c0974ded1379a841ed1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add the packages of Legend Cube, a visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query hosts the Legend Cube page at `/query/cube`, loaded on first visit. The page draws the query as a canvas: tables come from a bundled or pasted Pure model, Join and Filter steps are added from a palette, by drag and drop or from a context menu, and edited in a side panel. It runs the query on the engine and shows its rows, with undo, keyboard shortcuts (F9, Ctrl/Cmd+Z), Show Pure, and export and import of the cube's spec.
