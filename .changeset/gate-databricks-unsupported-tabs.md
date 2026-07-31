---
'@finos/legend-extension-dsl-data-product': patch
---

Disabled DataCube, SQL Playground, and Legend Query tabs in the Data Product Viewer for access points with a Databricks target environment, showing a not-yet-supported message instead. These features currently rely on a Snowflake-style warehouse concept that does not map to Databricks compute.
