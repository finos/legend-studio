---
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

Support SingleStore computes: `SinglestoreComputeSpecification` (a required `clusterSize`, `S_00` to `S_64`) is read, written and change-tracked like the Snowflake and Databricks specifications, and the compute editor shows a cluster-size selector for it instead of the "not supported in form mode" message.
