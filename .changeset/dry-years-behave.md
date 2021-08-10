---
'@finos/legend-studio-preset-query-builder': patch
---

Avoid initializing application store in Query, as it will try to authenticate against SDLC.
