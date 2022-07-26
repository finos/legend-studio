---
'@finos/legend-query-app': major
---

**BREAKING CHANGE:** Methods returning the collection of plugins and presets like `getLegendQueryPresetCollection()` and `getLegendQueryPluginCollection()` are no longer exported, instead, use `LegendQueryWebApplication.getPresetCollection()` and `LegendQueryWebApplication.getPluginCollection()`.
