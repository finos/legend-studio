---
'@finos/legend-application-query': patch
---

Log `query-editor.initialize-query-creator.success` and `query-editor.initialize-query-creator.failure` when a query creator is initialized, reporting where the query was started from: each creator now tags its query builder `sourceInfo` with a `sourceType` (mapping, service, data space, data space template, data product, data product sample, ingest), and the events also report whether the most recently visited data product or data space was reopened. Failures also report the error message, name and, for network errors, the response status.
