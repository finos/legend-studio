---
'@finos/legend-extension-dsl-data-product': patch
---

Make the `Producer Environment` and `Ingest Definition` columns in the data product Producer Info section deep-link to the external operational-view application when configured:

- Add an optional `operationalUrl` field to `DataProductConfig` — the base URL of the external operational-view app used to inspect a producer environment (and optionally a producer / ingest definition within it).
- Add `DataProductDataAccessState.generateOperationalUrlForIngestUrn(producerUrn?, ingestDefinitionUrn?)` which resolves `DataProductConfig.operationalUrl` + `lakehouseIngestEnv.ingestEnvironmentUrn` and returns `undefined` when either is missing (so callers can disable the click) or when `ingestDefinitionUrn` is supplied without a `producerUrn`.
- Extract the URL builder into a reusable `openOperationUrlLink(operationalUrl, ingestEnvironmentUrn, producerUrn?, ingestDefinitionUrn?)` utility in `DataProductIngestUtils`. The URL shape is `${operationalUrl}/environment/{ingestEnvironmentUrn}[/producer/{producerUrn}[/ingestDefinition/{ingestDefinitionUrn}]]`.
- Compute the best-guess `ingestDefinitionUrn` per ingestion dataset row (via `buildIngestDefinitionUrnFromDataset`) whenever the ingest env config is available, and use it to make the `Ingest Definition` cell clickable. The internal marketplace operations link remains as a PROD-only fallback.
