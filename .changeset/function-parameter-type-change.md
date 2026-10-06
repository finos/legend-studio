---
'@finos/legend-application-studio': patch
---

Clear a function parameter's type variable values when its type is changed in the form editor, so changing `Varchar(10)` to `Integer` doesn't produce `Integer(10)`.
