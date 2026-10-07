---
'@finos/legend-graph': patch
---

Type ingest accessor columns (`#I{...}#`) with the generic type each dataset column declares: `Varchar(255)` and `Numeric(10,2)` keep their parameters, and enumerations and classes in the graph resolve to themselves instead of `String`. A column whose type can't be resolved is still typed `String`, but a warning is now logged.
