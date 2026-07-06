---
'@finos/legend-query-builder': patch
---

Fix `percentile()` aggregate emitting `Decimal` instead of `Float` for the percentile argument.

`buildAggregateExpression` was creating the percentile `PrimitiveInstanceValue` with `PrimitiveType.NUMBER` (the abstract supertype). The V1 transformer has no direct wire representation for `Number` and intentionally falls back to `Decimal`, producing `{"_type":"decimal"}` → PURE grammar `0.8D`. The Engine correctly rejects this because the registered signature is `percentile(Number[*], Float[1], ...)` — `Decimal` and `Float` are distinct concrete subtypes.

Fix: change the generic type to `PrimitiveType.FLOAT` so the transformer takes the `FLOAT` branch → `{"_type":"float"}` → `0.8` → matches `Float[1]`.
