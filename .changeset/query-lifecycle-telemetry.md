---
'@finos/legend-application-query': patch
'@finos/legend-query-builder': patch
---

Close the gaps in saved-query lifecycle telemetry: report deletes, and report failures for every action.

Previously create, update and rename each reported only a success, and **delete reported nothing at all** — despite the `onQueryDeleted` hook already existing and being wired at three call sites to prune the recently-viewed list. Every failure path logged to the log service and stopped, so save-failure rate — arguably the most important number for a save action — was not measurable.

New events:

- `query-editor.delete-query.success`
- `query-editor.create-query.failure`
- `query-editor.update-query.failure`
- `query-editor.rename-query.failure`
- `query-editor.delete-query.failure`

Failure payloads carry the same `query` identity as their success counterpart plus `errorMessage` (capped at 2000 characters, with `errorMessageTruncated: true` when clipped), `errorName` and, for network errors, `httpStatus` — matching the query-execution and creator failure events so failure rates are computed on consistent dimensions.

`create-query.failure` has a **different payload** from the other three: it carries `queryName` and no `query` block at all. The server assigns the id and a failed create never got that far, so there is no query to identify — reporting the chosen name keeps "never persisted" distinguishable from a real value, instead of a placeholder id that would group as one in a warehouse. Update, rename and delete act on a query that already exists, so their `query.id` is required; the split is what stops those three from accidentally omitting it.

`QueryLoaderState` gains `onQueryRenameFailed` and `onQueryDeleteFailed` hooks mirroring the existing success callbacks, and resolves the deleted query from the loaded list before deleting so `onQueryDeleted` can pass more than a bare id — afterwards the list is refreshed and the entry is gone.

The emit itself now lives in one shared `buildQueryLoaderLifecycleTelemetryHandlers()` helper rather than being repeated at each host that builds a query loader; the rename emit had been triplicated across `QueryEditorStore`, `EditExistingQuerySetupStore` and `QueryProductionizerSetupStore`.

These events deliberately carry **no source info**. They fire from the query picker, where a user may rename or delete one query while editing another, so attaching the loaded query builder's source info would silently attribute the row to the wrong query. Create and update, which act on the query currently loaded, are unaffected by this and keep their existing extra telemetry metadata.

Note `query-editor.rename.query.success` keeps its existing (inconsistently dotted) name — it is already released. The new failure counterpart uses the regular `rename-query.failure` form.
