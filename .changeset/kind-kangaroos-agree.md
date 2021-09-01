---
'@finos/legend-graph': patch
---

Created a new type of plugin `PureGraphPlugin` that only concerns procedures happening inside the graph (i.e. `PureModel`), such as initializing graph extension or cleaning up dead references, etc. Move `getExtraPureGraphExtensionClasses()` from `PureGraphManagerPlugin` to `PureGraphPlugin`.
