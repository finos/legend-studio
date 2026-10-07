---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
---

Add the packages of Legend Cube, a visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query hosts the Legend Cube page at `/query/cube`, loaded on first visit. The page picks tables from a bundled or pasted Pure model, runs the query on the engine and shows its rows, with undo, Show Pure, and export and import of the cube's spec; the canvas and its editors come later.
