---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube sends decimal literals as text, so a filter on a Decimal column keeps every digit, and saves a drill-down for its results grid with the cube.
