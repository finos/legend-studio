---
'@finos/legend-application-studio': patch
'@finos/legend-query-builder': patch
---

Fixed a regression introduced by #1572 where query execution with parameters of type `SimpleFunctionExpression` failed.
Fixed a regression introduced by #1628 where failed to update mocked value after parameter's multiplicity is changed.
