---
'@finos/legend-server-depot': major
---

**BREAKING CHANGE:** Renamed a client method `getLatestDependencyEntities` to `getLatestRevisionDependencyEntities()` and `getProjectVersionsDependencyEntities()` to `collectDependencyEntities()` to better describe their functionality. Also introduce a new composite client method `getIndexedDependencyEntities()` which accepts `version aliases` (such as `HEAD`, `latest`) and has logic to pick the right client methods to fetch and index the corresponding dependency entities and index them. Besides, we also cleaned up method signatures to make a distinction between `version` and `versionId` in client methods where the latter includes the former and `version aliases`.
