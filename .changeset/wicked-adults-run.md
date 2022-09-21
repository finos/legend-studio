---
'@finos/legend-application': major
---

**BREAKING CHANGE:** `ApplicationStore` typings has been updated to genericize on the type of the plugin manager instead of the plugin, i.e. class

```ts
class ApplicationStore<
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
>
```
