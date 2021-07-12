---
'@finos/legend-studio-preset-query-builder': patch
---

Support usage of `derivation` in projection mode. This gives user more flexibility when creating the column expression (as right now the only form we support is simple property expression), for example, now user can specify the following lambda `x|$x.lastName->toUpper() + ', ' + $x.firstName->toLower()` for a projection column :tada:. See https://github.com/finos/legend-studio/issues/254 for more details.
