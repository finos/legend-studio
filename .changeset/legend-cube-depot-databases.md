---
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Legend Cube reads tables of the Databases in published Depot projects: a Project tab in the source dialog lists the depot's projects, their released versions (newest first) and a version's own Databases with their runtimes; the cube saves the engine's pointer to the project at that version, and the Source panel shows the project and version. Legend Query builds the project catalog from its `depot.url`.
