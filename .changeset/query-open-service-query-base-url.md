---
'@finos/legend-extension-dsl-data-space': patch
---

Fix `Open in Query` on a service executable in Legend Query's data space search: it opens the service query under Legend Query's base URL (e.g. `/query/create-from-service/...`) instead of a blank page at `/create-from-service/...`.
