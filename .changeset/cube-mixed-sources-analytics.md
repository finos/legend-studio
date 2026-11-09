---
'@finos/legend-cube-builder': patch
---

Legend Cube in Legend Analytics: a data product cube can read its project's ingest data sets, and an ingest cube its project's data products.

- The Ingest tab on a data product cube lists the definitions its data products' deployment deployed from their project, in the viewer's own environment of the cube's Mode, with no environment or producer to pick. A definition or data set the data product's version lacks is greyed out, saying so; columns are those of that version.
- The Data Product tab on an ingest cube lists only its data sets' project's products of its producer deployment. Adding one reads the data sets again at the product's version, in the same undo step.
- `CubeIngestCatalog.listProjectDefinitions` takes the deployment of the cube's data products, `describe` and `resolveSchemas` take the cube's `project`, and `CubeIngestDefinitionCandidate` has a `disabledReason`.
