---
'@finos/legend-cube-builder': patch
---

Show Pure and Import Pure check the engine's Pure text by parsing it back. The engine's text writer writes a comparison's operands without parentheses: `($x.A + 1) == 3` becomes `$x.A + 1 == 3`, which Pure reads as `$x.A + (1 == 3)`. The same happens to any operator before `==`, to `&&` or `||` after it, and to a comparison after another. Where it does, Cube puts the parentheses back, so a query copied from Show Pure, or an expression's code read by Import Pure, reads as the query. Where the text still reads otherwise, Show Pure warns and Import Pure notes it.
