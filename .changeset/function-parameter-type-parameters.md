---
'@finos/legend-graph': patch
---

Keep type variable values on function parameters: a function declared `function my::f(x: Varchar(10)[1]): String[1]` no longer comes back as `x: Varchar[1]` when it is serialized from the graph (raw types and function paths are unchanged), including when the parameters are built from a raw value specification. Function hashes now include the type variable values of parameters and of the return type when present, so editing only `Varchar(3)` to `Varchar(4)` is detected as a change; lambda parameter (`VariableExpression`/`V1_Variable`) hashes include type arguments and type variable values when present. Hashes without type parameters are unchanged.
