---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-extension-dsl-data-product': patch
---

The definition flow draws an access point definition that takes parameters. A filter on a parameter reads as a filter by expression, and a new column's expression may read one too. The flow shows each parameter as a dashed box above the steps, with its type, wired into the steps that read it. A parameter anywhere else, such as a limit's size or a join's condition, is still refused as `parameters`, now naming the function. `splitCubeLambda` reads parameters only when asked (`readsParameters`), so the editor still refuses a lambda that takes them. A drawn filter by expression now shows its condition, as Cube prints it, where it used to show "Not set", and counts as checked, so the steps after it are checked too. The data product viewer's line for a `parameters` refusal now says where the parameter is, e.g. "it uses a parameter in its limit()".
