---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
'@finos/legend-extension-dsl-data-quality': patch
---

Count numbers and booleans in hashes: `hashValue` gave every number and boolean the hash of the empty string, so change detection missed edits to fields such as a hosted service's `autoActivateUpdates`. Fix the data quality relation comparison hashes, whose protocol and metamodel sides only matched because of it.
