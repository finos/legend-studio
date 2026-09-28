---
'@finos/legend-application-studio': patch
---

Add structured launch + success telemetry for service registration precheck (`editor.service-editor.registration-check.launch` / `.success`) and generation (`editor.generation.launch` / `.success`). The pre-existing `.failure` events remain and are now also emitted through the telemetry service, tagged with the same payload keys (`servicePath` / `env` for the precheck; `mode` / `elementPath?` / `generationType?` for generation) so error rates are queryable alongside launches and successes.
