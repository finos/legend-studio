---
'@finos/legend-server-depot': major
---

**BREAKING CHANGE:** Renamed a client method `getLatestDependencyEntities` to `getLatestRevisionDependencyEntities()` and `getProjectVersionsDependencyEntities()` to `collectDependencyEntities()` to better describe their functionality. Also introduce a new composite client method `getIndexedDependencyEntities()` which accepts `version alias` (such as `HEAD`, `latest`) and has logic to pick the right client methods to fetch and index the corresponding dependency entities and index them.
