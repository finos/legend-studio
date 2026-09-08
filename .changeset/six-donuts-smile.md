---
'@finos/legend-application-studio': patch
'@finos/legend-application-query': patch
'@finos/legend-application-data-cube': patch
'@finos/legend-application-marketplace': patch
---

Each app's base store no longer needs to register `AbstractServerClient.setDefaultAuthenticationTokenProvider()` itself — `ApplicationStore` now does it once in its own constructor (see the `@finos/legend-application` changeset), so when `enableTokenClient` is on, every server client any app builds authenticates via OAuth Bearer token with no per-app or per-client wiring.

DataCube also folds its separate `AuthStore` token cache into `ApplicationStore.getAccessToken()`.
