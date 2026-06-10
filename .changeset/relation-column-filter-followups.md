---
'@finos/legend-query-builder': patch
'@finos/legend-graph': patch
---

Follow-up fixes for `is empty` / `is not empty` on accessor relation columns and projection→filter DnD:

- `QueryBuilderPostFilterOperator_IsEmpty` now emits `isEmpty($row.<col>)` for relation-column projections (and `not(isEmpty($row.<col>))` for `IsNotEmpty`) instead of silently returning an unwrapped column accessor; matching round-trip overrides recognize both shapes. Previously these operators were offered in the UI but produced an invalid lambda for relation sources.
- `buildtdsPropertyExpressionFromColState` now handles `QueryBuilderRelationColumnProjectionColumnState` directly via its `RelationColumn`, so operators can build their expression without requiring a parent lambda.
- `QueryBuilderFilterStateBuilder` walks through wrapping `not(...)` / `isEmpty(...)` calls when extracting the lambda variable from a relation-column filter expression, so `is not empty` round-trips no longer throw `relation column filter must reference a variable`.
- Filter panel DnD now treats a `QueryBuilderRelationColumnProjectionColumnState` dropped from the projection panel the same as one dragged from the relation explorer, creating a `FilterRelationColumnSourceState` (carrying the column's multiplicity) instead of throwing "Dragging and Dropping derivation projection column is not supported.".
