---
'@finos/legend-application-data-cube': minor
'@finos/legend-server-lakehouse': minor
'@finos/legend-graph': minor
---

datacube: support iceberg querying flow for lakehouse producers
Description:
If a lakehouse ingested tabled is iceberg enabled, we allow querying the table via duckdb using iceberg extension
Initially we fetch all the data for a particular dataset from a catalog and cache the data. Subsequent operations happen on top of the stored cache.
