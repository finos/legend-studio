---
'@finos/legend-application-studio': patch
---

Add structured `editor.service-editor.test-suite-run.{launch,success,failure}` telemetry around the service editor's testable panel run flows (`Run Suite` / `Run Failing`). Payloads carry `sourceInfo?`, `servicePath`, `suiteId`, `mode`, `testCount`, plus `durationMs` and pass / fail / error result counts on success, complementing the existing generic `editor.service-editor.test-runner.failure` bucket.
