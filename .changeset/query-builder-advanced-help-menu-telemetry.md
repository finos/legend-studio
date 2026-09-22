---
'@finos/legend-query-builder': patch
'@finos/legend-application-query': patch
---

Cover the previously uninstrumented Advanced and Help menu clicks in the query builder header with telemetry. Every new event carries the shared query telemetry envelope — source info spread flat at the top level plus the resolved execution context under `state` — so dashboards can slice these actions by entry point (data space / data product / mapping / service / …) alongside every other query event.

New `@finos/legend-query-builder` events:

- Advanced: `query-builder.panel-parameter.toggle`, `query-builder.panel-constant.toggle`, `query-builder.panel-filter.toggle`, `query-builder.panel-window.toggle`, `query-builder.panel-post-filter.toggle`, `query-builder.calendar.toggle`, `query-builder.typed-tds.toggle`, `query-builder.check-entitlements.launch`, `query-builder.edit-pure.launch`, `query-builder.show-pure.launch`, `query-builder.show-protocol.launch`, `query-builder.compile-query.launch`, `query-builder.show-query-diff.launch`.
- Help: `query-builder.open-documentation.launch`, `query-builder.open-faq.launch`, `query-builder.open-support-tickets.launch`, `query-builder.virtual-assistant.toggle`.

New `@finos/legend-application-query` events (Help items injected by Legend Query): `query-editor.about-query-info.launch`, `query-editor.query-version-history.launch`, `query-editor.about-legend-query.launch`, `query-editor.about-data-space.launch`, `query-editor.about-data-product.launch`, `query-editor.about-ingest.launch`.

`*.toggle` payloads include an `enabled` field carrying the post-toggle state so a single event stream covers both opens and closes. Confirmation-gated toggles (Enable Calendar, Enable Typed TDS) fire on confirm rather than on click.

`QueryBuilderTelemetryContext` is now exported from `@finos/legend-query-builder` so host applications can type their own menu-action payloads against the same envelope.
