---
'@finos/legend-studio-shared': patch
---

Make `Logger` requires `LogEvent` instead of log event name as the first argument. This will make logger implementation more extensible as we can support features like `channel`, `timestamp`, etc.
