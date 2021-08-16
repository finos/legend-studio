---
'@finos/legend-studio': patch
---

No longer make engine re-authentication use SDLC authorize endpoint as this is very situational depending on the deployment context and how the servers are set up. We make this configurable instead.
