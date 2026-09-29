---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-service': patch
---

Structure service-registration telemetry so registration success rate, latency, and error rate are measurable per entry point.

- New `editor.service-editor.registration.launch` and `editor.service-editor.registration.success` events. Both carry `sourceInfo?`, `trigger` (`single` / `bulk` / `service-query-editor`), `executionMode?` (raw `ServiceExecutionMode`), `serviceCount`, and `activatePostRegistration`. Success additionally carries `durationMs` (activation call included when opted in).
- The existing `editor.service-editor.registration.failure` string constant is now emitted through the telemetry service (in addition to the developer-console `logService.error` call), with the same structured payload plus `errorMessage`.
- Wired into all three registration codepaths: `ServiceRegistrationState.registerService` (`single`), `BulkServiceRegistrationState.registerServices` (`bulk`), and `ServiceQueryEditorStore.registerService` in the `dsl-service` extension (`service-query-editor`).

Enum `SERVICE_REGISTRATION_TRIGGER` is exported from `@finos/legend-application-studio` for downstream consumers.
