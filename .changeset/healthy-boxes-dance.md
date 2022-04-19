---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** `getOrCreatePackage` logic has been moved from `Package` to `DomainHelper`. This method now will also make use of caching to speed up graph building.
