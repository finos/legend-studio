---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Removed `buildState` from `BasicModel` and `DependencyManager` and moved them to `GraphManagerState` since these states don't belong inherently to the graph but the graph manager. As such, methods like `AbstractPureGraphManager.buildSystem()`, `AbstractPureGraphManager.buildGraph()` etc. now require the build state to as a parameter.
