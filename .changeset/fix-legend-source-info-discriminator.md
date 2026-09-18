---
'@finos/legend-storage': patch
'@finos/legend-application-studio': patch
---

Fix bugs in `LegendSourceInfo` discriminators and Legend Studio source info emission:

- `LegendGAVSourceInfo` and `LegendProjectIdSourceInfo` declared a `type` field for the source-type discriminator, but the base `LegendSourceInfo` uses `sourceType` and runtime call sites populate `sourceType`. The typed `type` field was dead. Both are now correctly declared as `sourceType`, matching the wire payload dashboards receive.
- `StandardEditorMode.getSourceInfo()` (`WorkspaceProjectQuerySDLC`) used the field name `WorkspaceType` (capitalized) and never populated the `sourceType` discriminator at runtime. The field is now `workspaceType` (matching every other SDLC consumer), and `sourceType: LegendStudioSourceType.PROJECT_WORKSPACE` is set on the returned payload so telemetry consumers can reliably discriminate workspace-edit events from project-view / GAV-view / showcase events.
