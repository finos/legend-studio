# @finos/legend-application-analytics-bootstrap

## 13.275.0

### Patch Changes

- [#5759](https://github.com/finos/legend-studio/pull/5759) [`a7038ec`](https://github.com/finos/legend-studio/commit/a7038ec339defaa0ed248a3f1696f0ed07820c92) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - A data space as a Legend Cube source (PLAN §11.25). The core's `dataSpace` node runs the relation the host's query builder wrote for it, and a cube's optional mapping makes a run end in `from(mapping, runtime)`. The builder adds the source dialog's Data Space tab and the source's node editor, both through a new host seam (`CubeHost.dataSpaceEditor`), so it keeps no dependency on the query builder. Legend Analytics provides the editor when its deployment has a depot: the depot's released data spaces, and the query builder on a data space's light graph, which it builds only from the analytics a release of the project generates, as Legend Query builds its minimal graph; a data space without them is refused, and no DSL extension's graph plugins are needed.

## 13.274.0

## 13.273.0

## 13.272.0

## 13.271.0

### Patch Changes

- [#5692](https://github.com/finos/legend-studio/pull/5692) [`33bdd8a`](https://github.com/finos/legend-studio/commit/33bdd8ac4730db40232014921e4e7b13bb8b994f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add Legend Analytics, a Legend application whose first iteration runs the Legend Cube page on its own, at `/analytics/` (`yarn dev:analytics`). It needs only an engine; projects, data products, ingest data sets and marketplace links are offered where its config names a depot, a lakehouse and a marketplace. Signing in works as in Legend Query (optional OIDC), and the page has Cube's shortcuts and Legend Query's light theme.
