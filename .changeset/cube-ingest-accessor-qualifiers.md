---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-studio': patch
---

Legend Cube reads every qualifier of an ingest data set, not only `|metadata`: `#I{…|incoming}#`, `#I{…|milestoned}#` and `#I{…|incomingMilestoned}#` too, as an incremental materialized view's function reads them, so Edit MatView, Import Pure and a definition's flow open it, and Save MatView keeps the qualifier (`IngestDatasetQualifier`). A qualifier it doesn't know is still refused. `milestoned` and `incomingMilestoned` are typed as the data set's rows are, as the engine types them; `incoming` by its append log (`CubeIngestDataSet.incomingSchema`): the digest when the write mode keeps one, `LAKE_BATCH_ID` and `LAKE_APPEND_TIME`, and `LAKE_IN_Z` and `LAKE_OUT_Z` when the data set keeps them. A host's `CubeIngestCatalog.resolveSchemas` reads each source's `qualifier` (`CubeIngestDataSetLocation`), by `getCubeIngestSourceSchema`. The Ingest tab still offers rows and batch metadata only.
