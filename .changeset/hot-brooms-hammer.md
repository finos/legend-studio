---
'@finos/legend-shared': major
---

**BREAKING CHANGE:** `Logger` now conforms to plugin structure, the new class to use is `LoggerPlugin`. Create the interface `PluginConsumer` with method `registerPlugins(plugins: AbstractPluginManager[]): void` to make plugin consumers like `Log`, `TelemetryService`, and `TracerService` more similar and systematic.
