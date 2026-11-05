---
'@finos/legend-cube-builder': patch
---

Filter by Expression and Extend Columns show an expression's outline: how Pure reads the code, part by part, each part with its role and the kind of value it gives. A warning appears where Pure's precedence reads the code other than it was likely meant (`$x.A + 1 == 3`, `$x.A > 0 && $x.A < 30`, `!$x.A > 3`), with a one-click fix that puts in the parentheses. A value that can be empty where one is needed is flagged, with `->toOne()` and `->coalesce(…)` fixes.
