---
'@finos/legend-application-studio': patch
---

Remove the unused Lakehouse deploy paths from the ingest-definition and data-product editors.

- `IngestDefinitionEditorState.deploy` / `init_with_deploy` and `DataProductEditorState.deploy` are removed, along with their supporting state (`deploymentState`, `validateAndDeployResponse` / `setValidateAndDeployResponse`, `deploymentResponse` computed, `ingestionManager` getter, `validForDeployment`, `validationMessage` / `deployValidationMessage`, `appDirDeployment`, `associatedIngest`, `deployResponse` / `setDeployResponse`) and the `DataProductDeploymentResponseModal` UI in `DataProductEditor`.
- Removes the four telemetry events these paths emitted: `editor.ingestion.deployment.success.urn`, `editor.ingestion.deployment.failure`, `editor.data-product.deployment.success`, `editor.data-product.deployment.failure` (and their `logEvent_LakehouseDeployIngest` / `logEvent_LakehouseDeployIngestFailure` / `logEvent_LakehouseDeployDataProduct` / `logEvent_LakehouseDeployDataProductFailure` helpers on `LegendStudioTelemetryHelper`).
- `deployOnOpen` state, the `generateUrlToDeployOnOpen` URL helper, and the `EditorInitialConfiguration` deploy-on-open flag are intentionally kept so the editor-config surface is untouched; they no longer trigger anything today.
