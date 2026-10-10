---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
---

Legend Cube reads the data sets of deployed ingest definitions (beta), as Data Cube's producer source picks them: an Ingest tab and an "Ingest Dataset" palette item (Mode, the viewer's environment, a producer deployment, one of its definitions, a data set), typed from what the definition declares, and run through the `#I` accessor on a lakehouse runtime with the cube's warehouse, which the data set's panel edits. A cube reads one kind of source: tables, data products or ingest data sets. Legend Query offers it when its optional `lakehouse.platformUrl` is set.
