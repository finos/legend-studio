---
'@finos/legend-graph': patch
---

Add `buildRelationTypeFromRelationalRelation`, which types a table's or view's columns exactly as the engine types a relational store accessor (`#>{db.schema.TABLE}#`): precise types with their parameters (`Varchar(10)`, `Numeric(10,2)`, `Int`, `Float4`, `Timestamp`, `Variant`), the engine's nullability rule, and column stereotypes and tagged values. It copies the engine's known defects (`CHAR(n)` is `Varchar(1)`, view columns are `Varchar(0)[0..1]`, `BINARY` tables can't be typed) and reports them per column in `columnNotes` (`RELATIONAL_COLUMN_TYPE_NOTE`). Nothing uses it yet; `mapRelationalDataTypeToPrimitiveType` is unchanged.
