---
'@finos/legend-server-sdlc': minor
'@finos/legend-application-studio': patch
---

Add an optional `useCookieAuthOnly` flag to `SDLCServerClientConfig` (exposed via Studio's `sdlc.useCookieAuthOnly` config field), mirroring the existing `engine.useCookieAuthOnly` flag. Some SDLC deployments authenticate via a session cookie and their filter chain does not support the CORS preflight triggered by an `Authorization: Bearer` header. When set to `true`, the SDLC client omits the Authorization header entirely and relies solely on the session cookie. Defaults to `false`, which preserves the existing Bearer-header behavior for all deployments that don't set this flag.
