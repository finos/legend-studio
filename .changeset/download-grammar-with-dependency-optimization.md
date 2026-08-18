---
'@finos/legend-application-studio': patch
'@finos/legend-server-depot': patch
'@finos/legend-graph': patch
---

Optimize "download project grammar with dependency" in the developer tools panel: dependency grammar is now fetched from Depot as a single `V1_PureModelContextData` payload and transformed to Pure code in one engine call, instead of building a metamodel graph and round-tripping element-by-element. Adds `DepotServerClient.collectDependencyEntitiesAsPureModelContextData` and `AbstractPureGraphManager.protocolToPureCode` (backed by the engine's `transformProtocolGraphToCode`). Also makes the entire download-grammar action row (icon + label) clickable.
