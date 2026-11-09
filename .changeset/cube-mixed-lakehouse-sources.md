---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-studio': patch
---

Legend Cube: one cube can read data products and ingest data sets together when they come from the same project, in one Mode.

- In Studio's Create/Edit MatView, the Ingest tab adds a project's data sets to a data product cube, with Mode and warehouse locked to the cube's. The Data Product tab turns an ingest cube into a data product cube of the same Mode and warehouse, in one undo step.
- Edit MatView reopens a view that reads both.
- Hosts whose ingest catalog can't list a data product's project's definitions keep the two apart, with the same message as before.
- Studio's tabs start on the Mode of the ingest definition Cube was opened from.
- Edit MatView refuses an access point that reads the view being edited.
- A disabled source's tooltip names the cube's kind of source.
- New in `@finos/legend-cube`: `lakehouseSourcesAreApart` and `getSourceKindName`.
- New in `@finos/legend-cube-builder`: `CubeIngestCatalog.listProjectDefinitions` and `CubeHost.queryRules`.
