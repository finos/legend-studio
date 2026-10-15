---
'@finos/legend-application-analytics': patch
'@finos/legend-application-analytics-bootstrap': patch
'@finos/legend-application-analytics-deployment': patch
---

Add Legend Analytics, a Legend application whose first iteration runs the Legend Cube page on its own, at `/analytics/` (`yarn dev:analytics`). It needs only an engine; projects, data products, ingest data sets and marketplace links are offered where its config names a depot, a lakehouse and a marketplace. Signing in works as in Legend Query (optional OIDC), and the page has Cube's shortcuts and Legend Query's light theme.
