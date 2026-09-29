---
'@finos/legend-application-studio': patch
---

Add a structured `editor.project-overview.action.{launch,success,failure}`
lifecycle around the project overview sidebar's SDLC writes: delete
workspace, update project metadata, cut a release version, release a patch
branch, open a new patch branch (which also creates its initial workspace).

Payload carries `action`, `projectId`, `patchReleaseVersionId?` (release /
create patch), `workspaceType?` (delete workspace / create patch), plus
`durationMs` on success and `errorMessage` on failure. Fires from inside
the workspace editor, so `sourceInfo` is populated. The
`SDLC_MANAGER_FAILURE` developer log stays in place alongside the new
failure event.

Read paths on `ProjectOverviewState` (fetch workspaces / patches / latest
version / revision / reviews) continue to log through
`SDLC_MANAGER_FAILURE` — they are background reads, not user-triggered
actions.
