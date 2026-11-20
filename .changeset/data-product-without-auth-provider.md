---
'@finos/legend-extension-dsl-data-product': patch
---

Data product viewer: no longer crashes without an `AuthProvider` ("Cannot read properties of undefined (reading 'user')"), e.g. in the data product Preview of Legend Studio when its ingest deployment has no OIDC config. Without one there is no token: calls go without it, and the actions that need the signed-in user (escalating or closing an access request, creating a subscription, requesting access from Legend AI) are disabled or hidden.
