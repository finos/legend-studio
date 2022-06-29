---
'@finos/legend-extension-dsl-data-space': major
---

**BREAKING CHANGE:** Previously, `data space` allows specifying a `Maven coordinates` (GAV - groupId, artifactId, version) to point at a project to get the models from. This may have given users a great deal of flexibility, but it sacrifices compilability of dataspaces, also, in soem case, it ends up confusing users even more. As such, we have decided to [remove these coordinates altogether](https://github.com/finos/legend-engine/pull/742). As a result, we will start building data space when building the graph.
