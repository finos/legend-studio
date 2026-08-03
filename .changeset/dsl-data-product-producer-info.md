---
'@finos/legend-extension-dsl-data-product': patch
---

Refactor `DataProductConfig` to group producer-side settings under a new optional `producer: DataProductProducerConfig` field (breaking-shape change on the config JSON — callers must nest `operationalUrl` and `deploymentLegendServiceUrl` under `producer`). Add a required `deploymentViewUrl` on `DataProductProducerConfig` used to deep-link an AppDir deployment id.

Consolidate producer environment metadata in the Producer Info section into a single info card rendered once above the per-APG groups (via the new exported `DataProductProducerEnvironmentInfo` component), replacing the previous per-row `Producer Environment` / `AppDir ID` columns in the ingestion datasets grid. Resolve AppDir deployment ids to human-readable deployment names via a single `executeLegendUserService` call per data product, and render each AppDir as a link to `${producer.deploymentViewUrl}/${deploymentId}` when configured.
