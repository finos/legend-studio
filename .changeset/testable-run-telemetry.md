---
'@finos/legend-application-studio': patch
---

Add a unified `editor.testable.run.{launch,success,failure}` telemetry lifecycle
around the shared testable editors (mapping, data product, ingest, function
activator, availability). Instrumented run entry points cover suite runs,
run-failing, run-testable, run-all-failing, single-test runs from the per-test
editor, and single-test / suite / testable runs launched from the global test
runner sidebar. Payloads carry `testableKind`, `testablePath`, `suiteId`,
`mode` (run-suite / run-failing / run-testable / run-all-failing / run-test),
`testCount`, plus `durationMs` and passed/failed/errored counts on success.

Also add a `global-test-runner.run.{launch,success,failure}` lifecycle for the
sidebar "run all tests" and "run dependencies tests" flows (cross-testable),
with `scope` (all / dependencies) and `testableCount` on every event.

The existing service test-suite events are left unchanged for backward
compatibility.
