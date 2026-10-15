---
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Add `LegendCubeHost`, the host a Legend deployment gives the Legend Cube page, built from a plain config of its servers (the engine, and optionally the depot, the lakehouse, its platform and the marketplace). Legend Query's Cube host is now built on it, so Legend Query and Legend Analytics offer the same sources by the same rules.
