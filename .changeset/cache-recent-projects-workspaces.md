---
'@finos/legend-application-studio': patch
---

Cache recently-opened projects and workspaces on the workspace setup screen so users can re-open common work without waiting for project search to round-trip to SDLC. Recents are written from the editor at the moment a workspace is successfully opened (covers both Go-button and direct deep-link opens), persisted via the user data service, capped (10 projects / 20 workspaces, LRU), pruned automatically when the editor cannot find a referenced project or workspace, and can be cleared via a "Clear recents" action. Patch-based workspaces are intentionally excluded.
