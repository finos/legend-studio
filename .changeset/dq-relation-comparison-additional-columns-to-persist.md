---
'@finos/legend-extension-dsl-data-quality': patch
---

Support the new `additionalColumnsToPersist` field on `DataQualityRelationComparison`: columns are persisted in the reconciliation output with `_SOURCE`/`_TARGET` suffixes and are excluded from the hash, keys, and join. Adds a matching multi-select in the Relation Comparison editor.
