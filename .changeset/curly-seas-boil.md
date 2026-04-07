---
'@finos/legend-application-query': patch
'@finos/legend-application-studio': patch
'@finos/legend-data-cube': patch
'@finos/legend-extension-dsl-data-quality': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-graph': minor
'@finos/legend-query-builder': minor
---

Add accessor-backed query builder support across graph, query builder, and consuming applications/extensions, including relation column projection handling and the supporting protocol serialization updates. This also updates source-element usage from class-only assumptions and includes related fixes for relation/value-spec handling.
