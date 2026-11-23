---
'@finos/legend-cube-builder': patch
---

A definition's flow draws the engine's SQL island, `#SQL{…}#`, as one step holding its SQL where it refused the whole definition: `sqlIslands` on the reading, `onShowSql` on `CubeDefinitionFlow`, and `describeCubeDefinitionUncheckedSql` for the host's note. A function whose SQL reads one of its values by name stays one box. Import Pure refuses SQL with its own message. Fix: with a host's functions loaded, the ingest definition of a data set read inside a `let` was not found, so its columns were not known.
