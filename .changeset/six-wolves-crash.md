---
'@finos/legend-shared': major
---

**BREAKING CHANGE:** Remove `BasicSerializationFactory` as now `SerializationFactory` allows overriding. `NullphobicSerializationFactory` has also been removed in favor of the new options `deserializeNullAsUndefined` one can pass when constructing `SerializationFactory`.
