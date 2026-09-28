---
'@finos/legend-application-studio': patch
---

Add structured telemetry lifecycles around two more SDLC-adjacent surfaces:

**Workspace setup** — new `setup.action.{launch,success,failure}` family
covering `create-sandbox-project`, `create-project`, `import-project`, and
`create-workspace`. Payload carries `action`, `projectId?`, `workspaceType?`
(create-workspace), `hasPatchReleaseVersion?` (create-workspace), plus
`durationMs` on success and `errorMessage` on failure. `create-project` and
`import-project` previously emitted no telemetry at all; `create-workspace`
and `create-sandbox-project` were failure-only via `WORKSPACE_SETUP_FAILURE`
/ `ENGINE_MANAGER_FAILURE` buckets, which are left in place for backward
compatibility. Setup runs before any editor mode, so `sourceInfo` is always
`undefined`.

**Project configuration update** — new
`editor.project-config.update.{launch,success,failure}` family covering
`update-configs` (dependency add/remove, platform configurations,
run-dependency-tests toggle), `update-to-latest-structure` (structure
version bump), and `change-project-type` (managed / embedded toggle). All
three funnel through `updateProjectConfiguration`, where the lifecycle is
emitted with the `action` discriminator so dashboards can slice per entry
point. Carries `sourceInfo`.
