---
'@finos/legend-graph': patch
---

Keep type parameters on class properties, derived properties and lambda parameters: `Varchar(200)` and `Numeric(10,2)` no longer lose their parameters when an element is serialized from the graph (which made the engine reject it with "Wrong type variables count (0)"), and lambda parameters such as `v: Varchar(10)[1]` and `r: Relation<(a:Integer)>[1]` keep their type variable values and type arguments. Property and derived property hashes now include type variable values when present, so editing only a parameter (e.g. `Varchar(200)` to `Varchar(300)`) is detected as a change; hashes of properties without type variable values are unchanged.
