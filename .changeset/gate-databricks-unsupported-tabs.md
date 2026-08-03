---
'@finos/legend-extension-dsl-data-product': patch
---

Disabled DataCube, SQL Playground, Legend Query, and Power BI tabs in the Data Product Viewer for access points whose target environment isn't Snowflake (e.g. Databricks, BigQuery, DuckDb), showing a not-supported message instead. The Data Product Viewer's auto-generated Lakehouse runtime only ever synthesizes a Snowflake connection, so non-Snowflake access points would otherwise fail at query time.
