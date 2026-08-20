---
'@finos/legend-application-query': patch
---

Stop throwing when a Data Product has no default execution context or an execution context has no mapping/runtime; the query editor now degrades gracefully (e.g. showing "(none)" in the info modal) instead of crashing (temporary).
