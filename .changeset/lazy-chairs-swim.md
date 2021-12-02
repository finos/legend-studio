---
'@finos/legend-shared': patch
---

**BREAKING CHANGE:** `AbstractServerClient` nolonger allows registering `TracerServicePlugin`s for the internal `TracerService` instance, but now requires explicitly registering an instance of `TracerService` instead.
