---
'@finos/legend-application-marketplace': patch
---

Wire the legacy data product (data space) viewer to the new mapping-provider access flow: `LegendMarketplaceProductViewerStore` now supplies `viewDataProduct` and `mappingProviderAccessConfig` so the viewer can render the Request Access control and open the underlying Lakehouse data product from a mapping-provider–backed execution context.

Handle data space analytics results that are missing a `defaultExecutionContext` or `defaultRuntime` in `LegendMarketplaceProductViewerStore` and `LegendMarketplaceAIChatStore` (Query Class bails with a warning; AI chat falls back to empty values instead of throwing).
