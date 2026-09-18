---
'@finos/legend-application-query': patch
---

Close the remaining gaps in existing-query load and productionize telemetry.

The `VIEW_QUERY__SUCCESS` and `INITIALIZE_QUERY_STATE__SUCCESS` events had no failure counterparts, so a failed existing-query load emitted nothing — load failure rate was not measurable. The `GRAPH_INITIALIZATION__SUCCESS` event similarly had no failure counterpart. The `PRODUCTIONIZE_QUERY__LAUNCH` event had no home, so the handoff from query to studio was silent. The `VIEW_PROJECT__LAUNCH` helper had landed but was never wired to a call site.

New events:

- `query-editor.view-query.failure`
- `query-editor.initialize-query-state.failure`
- `query-editor.graph-initialization.failure`
- `query-editor.productionize-query.launch`

Wiring:

- `VIEW_QUERY__FAILURE` and `GRAPH_INITIALIZATION__FAILURE` fire from `ExistingQueryEditorStore` when the corresponding stage of `initialize()` throws, mirroring the identity that the success emits already attach.
- `INITIALIZE_QUERY_STATE__FAILURE` fires from the tight boundary around `queryBuilderState.initializeWithQuery`, matching where its success counterpart fires.
- `PRODUCTIONIZE_QUERY__LAUNCH` fires from `QueryProductionizerSetupStore.loadQueryProductionizer` at the actual navigation to studio — the upstream setup landing action can be abandoned before a query is picked, so this counts real launches only.
- `VIEW_PROJECT__LAUNCH` fires from `createViewProjectHandler`, alongside its already-wired SDLC counterpart.
