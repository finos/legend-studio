---
'@finos/legend-application-studio': patch
---

Speed up the workspace setup screen with three further changes:

- **Sandbox access + project id caching.** Cache per-user sandbox-access boolean + sandbox project id (24h TTL, persisted via the user data service) so the sandbox section can render without re-running the prototype-access graph manager call and the sandbox-tag project search on every mount. Cache self-invalidates on 404, on user switch, and after a freshly-created sandbox.
- **Richer recent project metadata.** Persist project `description`, `webUrl`, and `tags` alongside the existing `projectId` / `name` on each recents entry. Recent tiles surface the description as a hover tooltip and render the first two tags as chips; the project dropdown stub built from a recents entry now carries real metadata instead of empty placeholders.
- **Cleanup.** Remove the dead `showAdvancedWorkspaceFilterOptions` flag from `WorkspaceSetupStore` (defined but never read or toggled by any UI).
