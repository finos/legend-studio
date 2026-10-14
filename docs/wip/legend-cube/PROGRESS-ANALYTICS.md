# Legend Cube: Legend Analytics, progress

PLAN §11.19. Built on `cube-analytics`, from `master` (`1cc69259a`, rebased on `1003eb7fb` 2026-10-15), in a PR into `master`.

## Current state

AN.4 done (2026-10-14): the inline review and the browser rehearsal. Next: AN.5, the demo video.

## Steps

- [x] AN.1 The plan section, this file, a draft PR (finos/legend-studio#5692)
- [x] AN.2 The shared host: `LegendCubeHost` in the builder; Query's host built on it
- [x] AN.3 The app: `legend-application-analytics`, its bootstrap and deployment, registered
- [x] AN.4 Verification: an inline review, a browser rehearsal on :9009
- [ ] AN.5 A demo video
- [ ] AN.6 Fold the supersessions in

## Commits

| Step | Commit                   | What                                                              |
| ---- | ------------------------ | ----------------------------------------------------------------- |
| AN.1 | `86f684244`              | The plan                                                          |
| AN.2 | `785a7ca98`              | The shared host                                                   |
| AN.3 | `f3e080f49`, `68761e11e` | The app; the root build references and the deployment's changeset |
| AN.4 | this commit              | The review's fixes                                                |

## Notes

- AN.4, the inline review of the diff against `master`: two fixes. Legend Query no longer uses
  `@finos/legend-server-marketplace`, which it gained for Cube's host (#5652), so the dependency and its references go.
  The tab title drops Data Cube's ⊞ mark: "Legend Analytics". The rehearsal is AN.3's (Examples, Dev Settings, an
  example on H2, the DuckDB Pivot, CSV export), and the light theme was compared surface by surface with Query's.
  `check:ci` against `master` found the root `tsconfig.build.json` references and the deployment's changeset entry
  missing, fixed in `68761e11e`; the changeset check counts private deployment packages too, as other changesets do.

- AN.3: `@finos/legend-application-analytics` (config, plugin manager, plugins, base store, the Cube page at the root,
  OIDC as Query's), `-bootstrap` (`run`, the local config, the styles) and `-deployment` (`analytics.config.js`,
  `/analytics/`, :9009), with `dev:analytics`, the root `tsconfig.json`, `check-build` and AGENTS.md's app list.

  - Two findings, in the plan's "Decided": Query's light look is partly Query's own stylesheet, so the 26 of its rules
    that match the Cube page (measured surface by surface on :9002) are copied into the bootstrap's
    `light-mode.scss`. And Cube downloads through data URIs, so no download service worker is registered.
  - Checked on :9009 against the engine: the Examples dialog and Dev Settings look as in Query. Top customers by
    orders runs (10 rows), the DuckDB Pivot example (country, 2022–2024), and CSV export of the whole query
    (`Top_customers_by_orders.csv`, a header and 10 rows; the download intercepted in the page). The grid's font is
    Balham's 12px, where Query's grid shows 14px from loading ag-grid's base stylesheet twice.
  - Tests: 9 in the app (config, the host's config, the page at the root, F9 and Ctrl/Cmd+Z). The builder's suite
    passes (2,815, 3 skipped, engine tests included), and so does Query's (261).
  - Local: the workspace `build:sass` script fails on a path with a space ("Goldman Sachs"), a local problem; the
    bootstrap's styles were built with `yarn sass style:lib` from its folder.

- AN.2: `LegendCubeHost` and `LegendCubeHostConfig` in the builder's `stores/`, with `buildLegendCubeLakehouseServices`
  and `buildLegendCubeProjectCatalog`; the marketplace link is the builder's own
  (`__lib__/LegendCubeNavigation.ts`, the address Query writes). `LegendQueryCubeHost` is a subclass passing
  `buildLegendQueryCubeHostConfig`; its 30 Cube tests pass unchanged. 6 builder tests: what each server offers, the
  parts tests give, the marketplace link, the viewer and token, and Dev Settings reaching every engine client.

- AN.1: the user's answers of 2026-10-14 are in the plan's "Settled". On the libraries' names the user asked which
  makes more sense; the plan records the recommendation (keep `legend-cube` and `legend-cube-builder`) and its
  reasons.
