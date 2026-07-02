---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
'@finos/legend-query-builder': patch
---

Add a `Producer Info` section to the data product viewer that lists ingestion datasets per access point group (APG), with a clickable ingest definition link (for SDLC-deployed data products), producer environment, and a `Query` action that opens the dataset in Legend Query via the new `INGEST_QUERY` route. Show an `Owner` label when the current user is in `dataProductOwners`.
