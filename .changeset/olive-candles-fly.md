---
'@finos/legend-shared': major
---

**BREAKING CHANGE:** Moved `EventNotifierService` and `TelemetryService` to `@finos/legend-application` and reshaped `TelemetryService` as well as `TelemetryServicePlugin` to take a `setup()` method for instead of just allowing setting the user ID via `setUserId()`.
