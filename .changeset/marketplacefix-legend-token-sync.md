---
"@finos/legend-application": patch
---

Fallback to interactive OIDC signin redirect when silent renewal fails.
so users are returned to the current page after re-authentication. If the interactive redirect fails, the in-memory access token is cleared.
