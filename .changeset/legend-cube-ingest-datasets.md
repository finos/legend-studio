---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
---

Add ingest data sets as a Legend Cube source (beta, in progress): the `#I` accessor, the core ingest data set source, one kind of source per cube across tables, data products and ingest data sets, and typing a data set from what its ingest definition declares, the `cubeIngest` model and its runs, and the ingest catalog. Legend Query reads the optional `lakehouse.platformUrl`.
