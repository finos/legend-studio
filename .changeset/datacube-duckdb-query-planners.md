---
'@finos/legend-application-data-cube': patch
---

Add `LegendDataCubeApplicationPlugin.getExtraDuckDBQueryPlanners()`, through which a plugin can contribute a planner other than the engine server for cached sources, local files and cached Iceberg tables (whose SQL DataCube runs on its own DuckDB). Each contributed planner adds one experimental setting, off by default, which uses the planner instead of the engine server. With no planner contributed, nothing changes. `LegendDataCubeApplicationPlugin` is now exported.
