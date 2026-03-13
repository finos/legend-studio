---
'@finos/legend-server-sdlc': minor
'@finos/legend-application-studio': patch
---

Pass `client_name` as a query parameter on all SDLC API requests when configured, by overriding `request()` in `SDLCServerClient`. Remove `client_name` from `authorizeCallbackUrl` static method since it is now included automatically.
