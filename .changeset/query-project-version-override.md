---
'@finos/legend-application-query': patch
---

Added a `projectVersionId` URL query parameter to the existing-query editor route (`/edit/:queryId`) that lets a saved query's graph be built against a different project version (e.g. a dev/snapshot version) without changing the version stored on the saved query while viewing. Saving the query (Save, Update, Save-As, or rename) while the override is active stores the override version on the query, so it matches the graph the query was built against.
