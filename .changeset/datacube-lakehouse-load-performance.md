---
'@finos/legend-application-data-cube': patch
---

Reduce Lakehouse DataCube load time by avoiding redundant or repeated engine compile calls:

- **Lakehouse Producer:** reuse the already-deployed ingest definition's column schema instead of calling the engine's `lambdaRelationType` to re-derive it.
- **Lakehouse Consumer:** reuse the data product's deployed generation artifact for plain access-point queries instead of calling `lambdaRelationType`, falling back to the engine for custom queries or when no artifact is found.
- **Lakehouse Consumer:** run the independent entitlement-environment and data-product lookups concurrently instead of sequentially.
