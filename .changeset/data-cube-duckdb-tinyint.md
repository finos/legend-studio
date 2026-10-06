---
'@finos/legend-application-data-cube': patch
---

Fix loading local files and Iceberg tables with `TINYINT` columns in Data Cube: the DuckDB type was matched as `TININT`, so such tables failed with "failed to find matching relational data type".
