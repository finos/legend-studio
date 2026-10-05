---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-service': patch
---

Fix Studio telemetry so each launch ends in exactly one terminal event:

- **Global generation** (`editor.generation.*`): `generateModels` / `generateArtifacts` / the deprecated file generation now return their (already handled) errors instead of emitting their own failure events, and `globalGenerate` emits a single `success` or `failure`. Previously a failed run emitted a `failure` and then a `success`.
- **Workflow job cancel** (`workflow-manager.job-action.*`): the cancel call is now awaited, so a rejected cancel reports `failure` instead of an unconditional `success` and an unhandled rejection.
- **Service registration** (`editor.service-editor.registration.*`): success / failure payloads now carry `registeredCount` / `failedCount` (and `activationFailedCount` for bulk). A bulk run where no service registered emits `failure` instead of `success`. Bulk post-registration activations are now awaited (`Promise.allSettled`) instead of fire-and-forget.
- **Registration precheck** (`editor.service-editor.registration-check.*`): per-env errors are aggregated into `errorCount` / `failedEnvs`; `failure` is emitted once per run, only when no env could be probed, instead of once per failing env.
- **Form-mode compilation** (`editor.form-mode.compilation.failure`): non-engine errors now emit a failure with `errorKind: 'other'` before being re-thrown, and the failure is emitted before the text-mode fallback runs so it is recorded even if the mode switch fails.
