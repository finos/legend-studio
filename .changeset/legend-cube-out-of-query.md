---
'@finos/legend-application-query': patch
'@finos/legend-application-query-bootstrap': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-analytics': patch
'@finos/legend-application-studio': patch
---

Take Legend Cube out of Legend Query: Legend Analytics runs it as an application of its own, and Legend Studio opens it from an ingest definition's editor. Query drops the `/query/cube` route (shown only with `NonProductionFeatureFlag`), its Cube host and page, Cube's shortcuts and stylesheet, the `@finos/legend-cube-builder` dependency, and the config only Cube read: `marketplace.serverUrl`, `lakehouse.platformUrl` and `extensions.core.dataProductConfig`, with its exported classes `LegendQueryDataProductConfig` and `LegendQueryDataProductProducerConfig`, which configured the experimental Cube page alone. A deployment's config may keep those keys: Query ignores them.
