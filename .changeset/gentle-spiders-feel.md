---
'@finos/legend-graph': patch
---

Align the Snowflake `Compute` specification with the engine metamodel. Every property is optional and copied verbatim rather than coerced on load. Adds `generation`, `maxConcurrencyLevel`, `statementQueuedTimeoutInSeconds`, `statementTimeoutInSeconds` and the ADAPTIVE-only `maxQueryPerformanceLevel` / `queryThroughputMultiplier`; removes the retired `STANDARD_GEN_1` / `STANDARD_GEN_2` resource constraints, `autoResume` and `resourceMonitor`. `AppDirComputeOwner.production` becomes optional so a Compute can be saved before an AppDir ID is known. App-directory node conversion is shared with Data Product.
