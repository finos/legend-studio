---
'@finos/legend-query': patch
---

Add a temporary flag `TEMP__useLegacyDepotServerAPIRoutes` in `depot` server config to allow pointing certain APIs at old endpoint. This is expected to be removed soon but provided as a workaround for older infrastructure.
