---
'@finos/legend-studio': major
---

**BREAKING CHANGE:** Remove support for SDLC mode-specific handling: there is no longer special handlings for `prototype` and `production` projects, these are now driven by the SDLC features config. As such, flags like `TEMPORARY__useSDLCProductionProjectsOnly` and `TEMPORARY__useSDLCProductionProjectsOnly` are also removed.
