---
'@finos/legend-application': patch
---

Add `enableTokenClient` to the shared `LegendApplicationConfig`/`ApplicationStore`, plus `resolveRequestToken()` which returns the OAuth access token only when the flag is on. `ApplicationStore`'s constructor also registers `resolveRequestToken` as the process-wide `AbstractServerClient.setDefaultAuthenticationTokenProvider()` itself, so every app gets both the flag and the wiring without its own copy of either.
