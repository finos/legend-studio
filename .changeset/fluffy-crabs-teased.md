---
'@finos/legend-application-studio-bootstrap': major
---

**BREAKING CHANGE:** Renamed package from `@finos/legend-studio-app` to `@finos/legend-application-studio-bootstrap`. Also, methods returning the collection of plugins and presets like `getLegendStudioPresetCollection()` and `getLegendStudioPluginCollection()` are no longer exported, instead, use `LegendStudioWebApplication.getPresetCollection()` and `LegendStudioWebApplication.getPluginCollection()`.
