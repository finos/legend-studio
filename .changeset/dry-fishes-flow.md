---
'@finos/legend-studio': major
---

**BREAKING CHANGE:** Remove support for multi SDLC instances, `Studio` config for `SDLC` are now simplified to `{ url: string }`. To facilitate migration, we have added a `Not Found` page for the app so that we could communicate about route pattern changes using documentation which can be set in the app config.
