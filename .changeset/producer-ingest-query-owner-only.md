---
'@finos/legend-extension-dsl-data-product': patch
---

Restrict the producer-side "Open in Legend Query" action on ingest definitions to data product owners. Non-owners now see the action disabled with an explanatory tooltip, and the Producer Info section shows an informational notice with a `Learn more` link (backed by the new `PRODUCER_QUERYING_ENTITLEMENTS` documentation key) pointing to querying-entitlements documentation.
