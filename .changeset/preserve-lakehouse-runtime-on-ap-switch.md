---
'@finos/legend-query-builder': patch
---

Fix error when switching between `LakehouseAccessPoint`s in the data product query builder. The new `LakehouseDataProductExecutionState` now preserves the user's `selectedRuntime` and `adhocRuntime` from the previous execution state, and the source element is updated through `changeSourceElement` so the query content, explorer tree, and fetch-structure are properly reset to match the new access point's relation type.
