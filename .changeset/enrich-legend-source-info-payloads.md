---
'@finos/legend-storage': patch
'@finos/legend-application-studio': patch
---

Enrich Legend Studio `LegendSourceInfo` payloads so downstream telemetry can join workspace-edit, project-view, and GAV-view traffic:

- `WorkspaceProjectQuerySDLC` (from `StandardEditorMode.getSourceInfo`) now includes `patchReleaseVersionId` when the workspace is on a patch branch, letting dashboards separate patch-workspace activity from mainline-workspace activity.
- `LegendProjectIdSourceInfo` (from `ProjectViewerEditorMode.getSourceInfo`, project-id branch) now optionally carries `groupId` / `artifactId` (from the project configuration) and `versionId` (from the pinned version or revision the viewer is showing). This means project-id-URL viewer traffic can be correlated with GAV-URL viewer traffic on the same project, and revision / version viewing can be sliced without inferring from the URL.
