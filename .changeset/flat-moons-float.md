---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
'@finos/legend-application': patch
---

Fixed marketplace users getting unauthorized errors after their ~5 minute OIDC access token expired. Removed a duplicate silent token renewal in `LegendTokenSync` that raced with the OIDC library's own automatic renewal and could wipe out a valid token, and switched approve/deny, refresh, and request-access action handlers to read the latest token via a ref instead of one captured at render time.
