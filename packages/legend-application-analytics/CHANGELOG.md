# @finos/legend-application-analytics

## 0.0.5

### Patch Changes

- [#5759](https://github.com/finos/legend-studio/pull/5759) [`a7038ec`](https://github.com/finos/legend-studio/commit/a7038ec339defaa0ed248a3f1696f0ed07820c92) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - A data space as a Legend Cube source (PLAN §11.25). The core's `dataSpace` node runs the relation the host's query builder wrote for it, and a cube's optional mapping makes a run end in `from(mapping, runtime)`. The builder adds the source dialog's Data Space tab and the source's node editor, both through a new host seam (`CubeHost.dataSpaceEditor`), so it keeps no dependency on the query builder. Legend Analytics provides the editor when its deployment has a depot: the depot's released data spaces, and the query builder on a data space's light graph, which it builds only from the analytics a release of the project generates, as Legend Query builds its minimal graph; a data space without them is refused, and no DSL extension's graph plugins are needed.

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
