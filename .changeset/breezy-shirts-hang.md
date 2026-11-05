---
'@finos/legend-application-data-cube': patch
'@finos/legend-data-cube': patch
---

Eliminated a duplicate `processSource` call when opening a new DataCube or editing a source query: the resolved source is now passed through as `DataCubeOptions.initialSource` so the view reuses it instead of re-resolving it from scratch, cutting out a full repeat of the source-resolution network calls.
