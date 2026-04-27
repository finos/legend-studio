---
'@finos/legend-query-builder': patch
---

Support filtering on accessor relation columns. Introduced `FilterConditionSourceState` abstraction with `FilterPropertyExpressionSourceState` and `FilterRelationColumnSourceState` implementations, enabling the filter panel for accessor queries. Added drag-and-drop support for relation columns in the filter panel and lambda roundtrip processing for accessor filter expressions.
