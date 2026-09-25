---
'@finos/legend-extension-dsl-data-space': patch
---

DataSpace query-builder support for execution contexts backed by a `mappingProvider` and/or with no `defaultRuntime`:

- Show runtime selector for exec contexts that don't have a defaultRuntime, do not show for one with defaultRuntime (doesn't impact query -- Runtime selector depends on 'Show Runtime Selector' button)
