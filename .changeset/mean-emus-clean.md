---
'@finos/legend-studio': minor
'@finos/legend-studio-components': minor
'@finos/legend-studio-app': minor
---

**BREAKING CHANGE** Studio router is reorganized to be more consistent and to accomondate more use cases.

- All routes now are to be prefixed with the SDLC server key, if there is only one SDLC server specified in the config file (with legacy SDLC field config form: `sdlc: { url: string }`), then the server key is `-`, i.e. `/studio/-/...`, else the server key is the key to the SDLC instance, i.e. `/studio/sdlc1/...`.
- If the server key specified in the URL is not recognised, the user will be redirected to the setup page if there is only one SDLC server in the config or the SDLC server configuration page if there are multiple SDLC servers in the config.
- Some basic routes are now renamed to be more consistent with others: e.g. setup page route is `/studio/-/setup/...`, editor page route is `/studio/-/edit/...`, and viewer page route is `/studio/-/view/...`
