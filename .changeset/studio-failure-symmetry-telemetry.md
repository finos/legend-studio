---
'@finos/legend-application-studio': patch
---

Complete the launch/success/failure lifecycle for three Studio editor operations that previously had success telemetry only, so their error rates become measurable without grepping the generic failure buckets.

- New `editor.form-mode.compilation.failure` event with `sourceInfo?`, `errorKind` (`compilation` / `engine` / `other`), `errorMessage`, and `fallbackToTextMode` (whether Studio auto-redirected to text mode because the error could not be revealed inline).
- New `editor.test.test-data-generation.failure` event with `sourceInfo?` and `errorMessage`, fired from the two `-ForDatabaseConnection` codepaths that already emit the matching `launch` and `success` events.
- New `graph-manager.initialize-graph.launch` and `graph-manager.initialize-graph.failure` events; the failure payload carries `errorKind` (`dependency` / `deserialization` / `network` / `other`), `errorMessage`, and `fallbackToTextMode`.

Enums `FORM_MODE_COMPILATION_ERROR_KIND` and `GRAPH_INITIALIZATION_ERROR_KIND` are exported from `LegendStudioTelemetryHelper`.
