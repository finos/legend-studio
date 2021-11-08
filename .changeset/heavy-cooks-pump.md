---
'@finos/legend-studio': minor
---

Allow accessing viewer mode using [GAV coordinates] (i.e. `groupId`, `artifactId`, and `versionId`). As this fetches model data from `Depot` server, in this mode, certain `SDLC` [features will not be supported](https://github.com/finos/legend-studio/issues/638). The URL pattern for this is `/view/${groupId}:${artifactId}:${versionId}`, e.g. `/view/legend.org.test:legend-test-project:latest`.
