---
'@finos/legend-studio': patch
---

Move `SDLC` logic out of `ApplicationStore` into `StudioStore`. Utilize the new `useSDLCServerClient()` and `useDepotServerClient()` hooks.
