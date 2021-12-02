---
'@finos/legend-shared': minor
---

Introduce `EventNotifierService` which is very similar to telemetry service but will help creating event hook for cross-application integration (e.g. `Github web-hooks`); also implemented `IframeEventNotifierPlugin` to help with communication between Legend applications and applications that embedded them in `iframe`s.
