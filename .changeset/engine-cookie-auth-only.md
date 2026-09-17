---
'@finos/legend-graph': minor
'@finos/legend-application-studio': patch
'@finos/legend-application-query': patch
'@finos/legend-application-data-cube': patch
'@finos/legend-application-marketplace': patch
---

Add an optional `useCookieAuthOnly` flag to `V1_EngineServerClientConfig` (exposed via each application's `engine.useCookieAuthOnly` config field). Some Engine deployments authenticate via a session cookie and their filter chain does not support the CORS preflight triggered by an `Authorization: Bearer` header. When set to `true`, the Engine client omits the Authorization header entirely and relies solely on the session cookie. Defaults to `false`, which preserves the existing Bearer-header behavior for all deployments that don't set this flag.
