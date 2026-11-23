---
'@finos/legend-cube-builder': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-studio': patch
---

A definition's flow no longer says a materialized view's columns couldn't be loaded. `readCubeDefinition` lists the views a definition reads apart (`materializedViews`), as Cube doesn't type a view yet, and `describeCubeDefinitionMaterializedViews` gives the note for them; a view's tooltip says so too. An access point's Definition panel (Marketplace, and Studio's data product preview) and the ingest definition Overview show that note, and keep "Couldn't load the columns" for a data set whose ingest definition the host doesn't have. The access point flow's telemetry lists the views (`materializedViews`).
