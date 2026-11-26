---
'@finos/legend-graph': patch
---

Fix the precise primitive type paths: `PRECISE_PRIMITIVE_TYPE.TIMESTAMP` is now `meta::pure::precisePrimitives::Timestamp` (it was the relational data type `meta::relational::metamodel::datatype::Timestamp`), and the new `PRECISE_PRIMITIVE_TYPE_PATHS` lists the 13 precise primitive types the engine defines. `PRECISE_PRIMITIVE_TYPE.DECIMAL`, `STRICTDATE` and `STRICTTIME`, which the engine does not define, and `DATETIME`, now the same as `TIMESTAMP`, are deprecated. As in the engine, `meta::pure::precisePrimitives::Date`, `Decimal` and `Time` no longer resolve as types in the graph; the relational `Timestamp` path, a class of the engine's relational metamodel which the graph does not define, no longer resolves to the precise `Timestamp`. `getCorrespondingStandardPrimitiveType` no longer maps any of these, nor the short names `Date`, `Decimal` and `Time`.
