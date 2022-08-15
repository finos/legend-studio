---
'@finos/legend-application-query': minor
---

Add basic support for a light-themed mode for query editor. This will be available only to standalone mode (i.e. `Legend Query`) instead of embedded query builder since we want the embedded builder to have consistent look and field with the host app ([#1374](https://github.com/finos/legend-studio/issues/1374)). By the default, this mode will not be available in query editor, to enable it, configure the core option of query builder `extensions: { core: { TEMPORARY__enableThemeSwitcher: true }}` in `Legend Query` application config.
