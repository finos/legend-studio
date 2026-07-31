---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-server-lakehouse': patch
'@finos/legend-graph': patch
---

Replace per-ingest-environment fan-out for Snowflake account options with a single `GET /subscriptions/targets` call. Adds `V1_DataSubscriptionTargetsResponse` (with `V1_dataSubscriptionTargetsResponseModelSchema` and `V1_deserializeDataSubscriptionTargetsResponse`), exposes `LakehouseContractServerClient.getSubscriptionTargets`, and wires a new `subscriptionTargets` observable on `DataProductDataAccessState` that is lazily populated (once per store instance) when the Create Subscription dialog is opened. Removes the `lakehouseIngestEnvironmentDetails` state and `fetchLakehouseIngestEnvironmentDetails` fan-out from `DataProductDataAccessState`, and drops the URN-based "Suggested Accounts" grouping in the subscription creator in favor of a flat list sourced from the targets API. Also renames the internal helper `V1_deseralizeDataSubscriptionTarget` to `V1_deserializeDataSubscriptionTarget` (now exported).
