---
'@finos/legend-query-builder': patch
---

Add authoring telemetry for the query builder — twelve `*.change` events covering everything a user can do to a query.

All of them carry the shared envelope described in the query-execution changeset (source info flat, resolved execution context under `state`), plus a **`change`** object holding what the user actually did. `change` is nested rather than flattened because it would otherwise collide: `change.sourceType` on a projection event (`explorer-property`) is unrelated to the top-level `sourceType` from the source info (`data-product`).

New events:

- `query-builder.execution-context.change` — fires when the user changes the source class, mapping, or runtime from the query builder sidebar. `change` carries a `subtype` discriminator (`class` / `mapping` / `runtime`).
- `query-builder.projection.change` — fires when the user adds, removes, moves, or clears TDS projection columns (including derivations). `change` carries an `action` (`add` / `remove` / `move` / `clear` / `add-derivation`), a `sourceType` for adds (`explorer-property` / `explorer-relation` / `function` / `filter-condition` / `derivation`), and a `columnCount` (the resulting column count, except for `clear` where it is the number of columns removed).
- `query-builder.aggregation.change` — fires when the user changes the aggregation operator for a projection column via its context menu. `change` carries `action: 'operator-change'` and the selected `operatorName`.
- `query-builder.window.change` — fires when the user adds, edits, or removes an OLAP/window column (via the editor modal, per-column controls, drag-and-drop add, or context menu). `change` carries an `action` (`add` / `edit` / `remove`) and the resulting `columnCount`. DnD reorders are intentionally not emitted to avoid per-hover noise.
- `query-builder.graph-fetch.change` — fires when the user modifies the graph-fetch tree (drag-drop add into the main tree, per-node remove in the main and external-format trees, the "Check graph fetch" toggle, and the "Proceed" confirmation of a serialization type switch). `change` carries an `action` (`add` / `remove` / `check-toggle` / `serialization-change`), the resulting `nodeCount`, and an optional `serializationType` (`PURE` / `EXTERNAL_FORMAT`).
- `query-builder.parameter.change` — fires when the user adds, edits, or removes a query parameter. `change` carries an `action` (`add` / `edit` / `remove`) and the resulting `parameterCount`.
- `query-builder.constant.change` — fires when the user adds, edits, or removes a query constant. `change` carries an `action` (`add` / `edit` / `remove`) and the resulting `constantCount`.
- `query-builder.result-modifier.change` — fires when the user applies changes from the result modifier modal. `change` carries `limitSet`, `distinctOn`, `sortColumnCount` and `sliceSet`.
- `query-builder.watermark.change` — fires from the result modifier apply handler when the watermark value actually changed. `change` carries an `enabled` boolean.
- `query-builder.milestoning.change` — fires from the result modifier apply handler when the milestoning configuration actually changed. `change` carries a `subtype` discriminator (`business-date` / `processing-date` / `all-versions` / `all-versions-in-range`).
- `query-builder.filter.change` — fires when the user removes a filter node via the context menu, or toggles a group node's operation (AND↔OR). `change` carries an `action` (`remove` / `group-operation-change`) and an optional `groupOperation` (`and` / `or`) for group-operation changes. DnD reparenting/reordering of condition nodes is intentionally not emitted to avoid per-hover noise.
- `query-builder.post-filter.change` — same shape as `query-builder.filter.change`, but for the post-filter tree.

Events are emitted from UI callsites only (sidebar, TDS panel, TDS window panel, graph-fetch panel, parameters panel, constants panel, result modifier modal, filter panel, post-filter panel), so query load / deserialization does not produce telemetry noise.
