---
'@finos/legend-application': patch
'@finos/legend-application-studio': patch
'@finos/legend-application-query': patch
---

Emit `application.extension-page.access` telemetry when a route contributed by an application plugin (via `getExtraApplicationPageEntries`) is mounted, and `application.route.not-found` when the fallback 404 page is shown in Legend Studio. Extension pages are wrapped in a shared `ExtensionPageBoundary` from `@finos/legend-application` so every host app gets consistent visibility into which plugin-registered pages are visited (by `key` and `pattern`) without each extension having to opt in to telemetry itself.
