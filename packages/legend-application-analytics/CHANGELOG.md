# @finos/legend-application-analytics

## 0.0.4

## 0.0.3

### Patch Changes

- [#5736](https://github.com/finos/legend-studio/pull/5736) [`34a0d27`](https://github.com/finos/legend-studio/commit/34a0d2781314b4311e1254e9ffcddd42fe9f87c7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Take Legend Cube out of Legend Query: Legend Analytics runs it as an application of its own, and Legend Studio opens it from an ingest definition's editor. Query drops the `/query/cube` route (shown only with `NonProductionFeatureFlag`), its Cube host and page, Cube's shortcuts and stylesheet, the `@finos/legend-cube-builder` dependency, and the config only Cube read: `marketplace.serverUrl`, `lakehouse.platformUrl` and `extensions.core.dataProductConfig`, with its exported classes `LegendQueryDataProductConfig` and `LegendQueryDataProductProducerConfig`, which configured the experimental Cube page alone. A deployment's config may keep those keys: Query ignores them.

## 0.0.2

### Patch Changes

- [#5718](https://github.com/finos/legend-studio/pull/5718) [`ef67499`](https://github.com/finos/legend-studio/commit/ef67499133dd38e8354b625e27b1ccf910a347c6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Name the producer deployments in Legend Cube's Ingest tab with the Legend user service Marketplace's producer info reads (`dataProductConfig.producer.deploymentLegendServiceUrl`), falling back to their ids.

## 0.0.1

### Patch Changes

- [#5692](https://github.com/finos/legend-studio/pull/5692) [`33bdd8a`](https://github.com/finos/legend-studio/commit/33bdd8ac4730db40232014921e4e7b13bb8b994f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add Legend Analytics, a Legend application whose first iteration runs the Legend Cube page on its own, at `/analytics/` (`yarn dev:analytics`). It needs only an engine; projects, data products, ingest data sets and marketplace links are offered where its config names a depot, a lakehouse and a marketplace. Signing in works as in Legend Query (optional OIDC), and the page has Cube's shortcuts and Legend Query's light theme.
