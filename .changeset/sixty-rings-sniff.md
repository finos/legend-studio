---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Index local storage by application: top level application storage with index key default to the application name, e.g. `legend-studio`, `legend-query`, etc. This key is configurable via the config option `application.storageKey`. This change helps different legend applications being deployed on the same host have their settings separated.
