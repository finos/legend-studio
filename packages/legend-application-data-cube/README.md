# @finos/legend-application-data-cube

Legend DataCube core

## Extending DataCube

A plugin extends DataCube by subclassing `LegendDataCubeApplicationPlugin`, exported from this package, and is registered by the deployment with `LegendDataCube.create().withPlugins([...])`. To contribute a query planner for cached sources, local files and cached Iceberg tables, see [Adding a query planner to Legend DataCube](../../docs/technical/datacube-query-planner-plugin.md).
