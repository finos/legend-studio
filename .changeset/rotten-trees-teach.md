---
'@finos/legend-taxonomy': major
---

**BREAKING CHANGE:** Renamed `LegendTaxonomyStore` to `LegendTaxonomyBaseStore`, `LegendTaxonomyPlugin` to `LegendTaxonomyApplicationPlugin`, `LegendTaxonomyConfig` to `LegendTaxonomyApplicationConfig`. We also unified `LegendTaxonomyApplicationPlugin` and `LegendApplicationPlugin` in `LegendTaxonomyPluginManager` so we have removed `getTaxonomyPlugins()` method, use `getApplicationPlugins()` instead.
