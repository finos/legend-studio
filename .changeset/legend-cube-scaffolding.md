---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
---

Add the packages of Legend Cube, a visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query hosts the Legend Cube page at `/query/cube`, loaded on first visit. The page draws the query as a canvas: tables come from a bundled or pasted Pure model, Join and Filter steps are added from a palette, by drag and drop or from a context menu, and edited in a side panel. It runs the query on the engine and shows its rows, with undo, keyboard shortcuts (F9, Ctrl/Cmd+Z), Show Pure, and export and import of the cube's spec.
