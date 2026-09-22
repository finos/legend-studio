---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
'@finos/legend-application-query': patch
'@finos/legend-application-data-cube': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-extension-dsl-service': patch
---

Add `queryClientName` to `ServerClientConfig`/`V1_EngineServerClient`: when set, it's attached as a `client_name` query parameter on requests made against `queryBaseUrl` (not `baseUrl`), letting a deployment select a specific pac4j client on the query-server (e.g. `onegsauthaws`) without affecting main engine calls. Wired through each app's config (`engine.queryClientName`, resolved to `engineQueryClientName`) and every call site that builds `clientConfig` for `graphManager.initialize()`/`V1_RemoteEngine` across Query, DataCube, and Studio (including its `legend-extension-dsl-data-space-studio` and `legend-extension-dsl-service` call sites). Not added to Marketplace — it never calls a query-server endpoint today, so `queryBaseUrl` there is already unused.
