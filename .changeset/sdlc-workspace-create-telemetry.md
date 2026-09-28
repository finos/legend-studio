---
'@finos/legend-application-studio': patch
---

Add a dedicated `sdlc.workspace-create.{launch,success,failure}` lifecycle
around the ad-hoc "Create workspace" recovery prompt that fires when a user
deep-links to a workspace that doesn't exist yet. Distinct from
`setup.action.create-workspace` (setup screen callsite) — this is the
in-editor bootstrap callsite with its own error-handling and legacy
`WORKSPACE_SETUP_FAILURE` log bucket, which stays in place.

Payload carries `projectId`, `workspaceId`, `workspaceType`, and
`hasPatchReleaseVersion`, plus `durationMs` on success and `errorMessage`
on failure. `sourceInfo` is omitted — no editor mode is active at this
point.
