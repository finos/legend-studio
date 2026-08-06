---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
'@finos/legend-application-query': patch
---

Add support for viewing and loading a query's version history in Legend Query. A saved query can be opened from the `/query/{queryId}/history` endpoint, and a specific revision (identified by its `version`) can be loaded via a new `revisionId` route parameter. The history is surfaced through a "Query History" action in the query editor help menu and a "Show Query History" action per query in the load-query dialog.
