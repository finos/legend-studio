---
'@finos/legend-cube-builder': patch
---

Filter by Expression and Extend Columns get a functions panel: the engine's functions of values and Cube's own, by category, found by name, each with its signatures, documentation and how the engine's tests of it went on the cube's database. Insert writes a call of it at the cursor, as `->name(…)` after a value. The completions, hover and signature help say how those tests went on the cube's database too, as information: a failing test doesn't hide a function. Cube's own `substring` and `indexOf` are documented, with how their results differ by database.
