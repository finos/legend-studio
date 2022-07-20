---
'@finos/legend-query': major
---

**BREAKING CHANGE:** Renamed `LegendQueryStore` to `LegendQueryBaseStore`, `LegendQueryPlugin` to `LegendQueryApplicationPlugin`, `LegendQueryConfig` to `LegendQueryApplicationConfig`. We also unified `LegendQueryApplicationPlugin` and `LegendApplicationPlugin` in `LegendQueryPluginManager` so we have removed `getQueryPlugins()` method, use `getApplicationPlugins()` instead.
