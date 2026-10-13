---
'@finos/legend-cube-builder': patch
---

Legend Cube can save cubes: a `CubeStore` port on the host (`CubeHost.store`), Legend's implementation over the engine's Cube store (`buildCubeStore`), and the sources each saved cube reads (`getCubeSourceRefs`), so the store can find the cubes that read a table, a data product or an ingest data set.
