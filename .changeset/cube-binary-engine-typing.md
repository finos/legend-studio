---
'@finos/legend-cube-builder': patch
---

Follow the engine's typing of BINARY and VARBINARY columns as `Byte` (legend-engine#5449) in the Northwind fixture's engine tests: its binary table now types, and the parity file records its columns rather than an error. The source picker still flags such tables unavailable.
