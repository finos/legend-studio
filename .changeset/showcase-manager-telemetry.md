---
'@finos/legend-application-studio': patch
---

Expand Showcase manager telemetry so the funnel is measurable end-to-end.

- `showcase.manager.launch` and `showcase.manager.showcase.project.launch` now carry an `entryPoint` (activity bar vs. workspace-setup card for the manager; explorer / search-showcase-match / search-code-match / deep-link for the project launch). The launch event also now includes `title`, `isDevelopment`, and (for search-code-match) the `lineNumber` the user landed on.
- New `showcase.viewer.close` event with `showcasePath` and `dwellMs` — pairs with `showcase.manager.showcase.project.launch` / `showcase.viewer.launch` so we can measure per-showcase engagement.
- New `showcase.manager.search.completed` event with `resultCount`, `showcaseMatchCount`, `textMatchCount`, `durationMs`, and `hadResults` — enables zero-result-rate and search-latency dashboards.
- `showcase.viewer.launch` is now actually fired (from the deep-link `/showcase/:path` route in `ShowcaseViewerStore`); previously the viewer store was misfiring the manager launch event, making the two paths indistinguishable.
- Split the single `showcase.manager.failure` generic bucket into three specific events — `showcase.manager.init.failure`, `showcase.manager.open.failure` (carries `showcasePath`), and `showcase.manager.search.failure` (carries `searchText`).
