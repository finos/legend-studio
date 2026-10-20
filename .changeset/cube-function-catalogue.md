---
'@finos/legend-cube-builder': patch
---

The expression editors of Filter by Expression, Extend Columns and Import Pure read the engine's function catalogue (`/api/pct/pct-docs.json`). Their completions now offer every function a column's type is passed to, each with its signature and documentation. A hover over a function's name shows its documentation, and its signatures show while a call's arguments are written. The column chips write at the cursor. Without the catalogue, the editors work as before.
