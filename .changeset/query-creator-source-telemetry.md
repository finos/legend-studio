---
'@finos/legend-application-query': patch
---

Report where every query builder came from, and report opens uniformly across routes.

**Every route now tags its query builder with a `sourceType`.** Each creator already did; `ExistingQueryEditorStore` did not — it built source info inline at four sites with an ad-hoc shape predating the `LegendQuerySourceInfo` union, with no `sourceType` discriminator. Any dashboard filtering on `sourceType` — the natural way to ask "which data spaces are queried most" — therefore silently excluded every run of a saved query, typically the bulk of activity. Each site now emits the proper union variant:

- data space -> `sourceType: 'data-space'` with `dataSpace` and `executionContext`
- explicit mapping/runtime -> `sourceType: 'mapping'` with `mapping` and `runtime`
- data product -> `sourceType: 'data-product'` with `dataProduct`, `accessType` and `accessId`
- ingest -> `sourceType: 'ingest'` with `ingestDefinitionPath` and `dataSet`

A saved query reports the `sourceType` of whatever it _targets_, so a saved data space query looks the same as a freshly created one; the new optional `queryId` field (already present on these payloads, now declared on `LegendQueryProjectSourceInfo`) distinguishes saved from newly authored. One `sourceType` filter works across both paths, and the saved/ad-hoc split stays available.

This also fixes the default source info in `buildDataProductQueryBuilderState()`, which omitted `sourceType`, `accessType` and `accessId` for every caller that did not pass one explicitly. These payloads never carried `sourceType`, so this is additive rather than breaking.

**`query-builder.opened` is now emitted for every route.** `QueryEditorStore.initialize()` reports it once the builder is loaded, for creator and saved-query routes alike, with `openedFrom` set to `query.creator` or `query.saved` (`ExistingQueryEditorStore` overrides `getOpenedFrom()`; every creator store inherits the default). Switching data product mid-session rebuilds the query builder and bypasses `initialize()`, so that path reports its own open.

`query-editor.initialize-query-creator.success` has been **removed** — it carried source info, `restoredFromRecent` and load timings, all of which the new event now carries for both routes, plus `state` and `openedFrom`. It was never released, so no dashboard is affected.

`query-editor.initialize-query-creator.failure` **stays**, and now reports the source info flat (rather than nested under a `source` key) to match every other query telemetry event. A failed load never builds a query builder, so there is no `opened` event to pair with and this is the only record that an attempt happened. Creator failure rate is `failure / (failure + opened where openedFrom = 'query.creator')`. Its `errorMessage` is capped at 2000 characters with `errorMessageTruncated: true` when clipped.

`query-editor.view-query.success` and `query-editor.initialize-query-state.success` also stay, as saved-route load-phase detail. Neither should be used for counting opens — each covers only half the population, which is what the new event fixes.
