---
'@finos/legend-extension-dsl-service': patch
---

Query productionizer in Studio now honors `engine.useCookieAuthOnly`, authenticating Engine calls via the session cookie instead of an `Authorization: Bearer` header.
