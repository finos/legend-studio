---
'@finos/legend-application-query-bootstrap': major
---

**BREAKING CHANGE:** Renamed package from `@finos/legend-query-app` to `@finos/legend-application-query-bootstrap`. Also, methods returning the collection of plugins and presets like `getLegendQueryPresetCollection()` and `getLegendQueryPluginCollection()` are no longer exported, instead, use `LegendQueryWebApplication.getPresetCollection()` and `LegendQueryWebApplication.getPluginCollection()`.
