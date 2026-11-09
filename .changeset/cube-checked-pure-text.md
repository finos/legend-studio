---
'@finos/legend-cube-builder': patch
---

Show Pure and Import Pure check the engine's Pure text by parsing it back. The engine's text writer drops the parentheses of arithmetic compared, writing `($x.A + 1) == 3` as `$x.A + 1 == 3`, which Pure reads as `$x.A + (1 == 3)`. Where it does, Cube puts them back, so a query copied from Show Pure, or an expression's code read by Import Pure, reads as the query. Where it can't, Show Pure warns and Import Pure notes it.
