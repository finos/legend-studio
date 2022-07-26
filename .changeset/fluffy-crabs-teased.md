---
'@finos/legend-studio-app': major
---

**BREAKING CHANGE:** Methods returning the collection of plugins and presets like `getLegendStudioPresetCollection()` and `getLegendStudioPluginCollection()` are no longer exported, instead, use `LegendStudioWebApplication.getPresetCollection()` and `LegendStudioWebApplication.getPluginCollection()`.
