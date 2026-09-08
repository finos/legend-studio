---
'@finos/legend-shared': patch
---

Add a `getAuthenticationToken` hook (plus a static `setDefaultAuthenticationTokenProvider()` fallback on `AbstractServerClient`) so a request can carry `Authorization: Bearer <token>` instead of the default session cookie. The hook is resolved and the header attached directly in `NetworkClient.request()`, so it also works for callers that construct `NetworkClient` directly, not just `AbstractServerClient` subclasses. No behavior change when absent. Also adds `buildAuthorizationHeader()` to avoid emitting a literal `Bearer undefined` header.
