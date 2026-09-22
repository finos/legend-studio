---
'@finos/legend-application-query': patch
---

Capture in-session data-space / data-product switches from the query-builder setup panel as telemetry:

- `query-editor.change-data-space`, emitted when the setup-panel dropdown selects a different data space.
- `query-editor.change-data-product`, emitted when the setup-panel dropdown selects a different data product.

Both payloads spread the query builder's current `sourceInfo` FLAT (the state being switched *from*, matching how every other query telemetry event reports `sourceInfo`) and add a `to` block carrying the target's `groupId` / `artifactId` / `versionId` / element `path`. Data-space navigation via the advanced-search modal is still observed indirectly through the route reload it triggers (`query-builder.opened`).
