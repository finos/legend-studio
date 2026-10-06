---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
'@finos/legend-application-query-deployment': patch
---

Add the packages of Legend Cube, a canvas-based visual query builder: `@finos/legend-cube` (the host-free domain model) and `@finos/legend-cube-builder` (the UI and the Legend engine adapter). Legend Query mounts a placeholder page at `/query/cube` when the new `TEMPORARY__enableLegendCube` option is on; only the local development config turns it on.
