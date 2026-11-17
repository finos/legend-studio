---
'@finos/legend-application-marketplace': patch
---

Keep a closed home page banner closed. Marketplace now remembers in the browser which banners a user closed, so a closed banner no longer comes back after a reload or on the next visit. A plugin that adds banners through `getExtraHomePageBannerConfigs` should keep each banner's `id` the same, and give it a new `id` to show changed content to everyone again.
