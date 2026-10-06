---
'@finos/legend-application-data-cube': patch
---

Fix the column types Data Cube synthesizes for local files, Iceberg tables and cached results. DuckDB `DECIMAL(p,s)` columns now load and keep their precision and scale instead of failing with "failed to find matching relational data type". In cached results, timestamps keep their time part (`Timestamp` instead of `Date`), decimals are `Decimal(18,3)` (what the cache stores), numerics are `Numeric`, and `Float4` columns no longer fail caching.
