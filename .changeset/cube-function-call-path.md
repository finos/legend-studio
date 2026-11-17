---
'@finos/legend-cube-builder': patch
---

Cube's Function source picker calls a project function by its whole name: one taking two or more values with an underscore in its name, e.g. `orders_above(min, region)`, was called by the part before its first underscore (`orders`), a function that doesn't exist.
