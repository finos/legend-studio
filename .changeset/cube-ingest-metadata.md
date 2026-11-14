---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-graph': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-studio': patch
---

Legend Cube reads queries of an ingest data set's batch metadata, `#I{ingest.dataSet|metadata}#`. It draws them read-only, in the data product viewer and in Studio's ingest definition Overview, and opens them in its editor, Edit in Cube included. Their columns are the batch metadata's, as legend-graph types them, and Cube writes the accessor back with its qualifier. Cube refuses a qualifier it can't type yet, e.g. `incoming`, naming it, where it used to read the data set's rows instead. legend-graph exports the batch metadata's relation type as protocol, `V1_getIngestMetadataRelationType`, for a reader with no graph.
