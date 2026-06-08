---
'@finos/legend-server-sdlc': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-service': patch
---

feat: add `excludeTag` parameter to `SDLCServerClient.getProjects` and exclude sandbox projects from project search

`SDLCServerClient.getProjects` now accepts an `excludeTag: string[] | undefined` parameter (positioned between `tag` and `limit`) which filters out projects carrying any of the given SDLC tags.

Workspace setup, query productionization, and update-project-service-query flows now pass `[SANDBOX_SDLC_TAG]` as `excludeTag` so that other users' sandbox projects no longer appear in the main project search/typeahead. The current user's own sandbox project is still fetched via the dedicated sandbox lookup and is now pinned to the top of the workspace setup project picker with a `(sandbox)` label suffix.
