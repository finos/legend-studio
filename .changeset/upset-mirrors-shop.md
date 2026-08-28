---
'@finos/legend-application-query': patch
---

Guard `defaultRuntime` and `defaultExecutionContext` when serializing a data space back to V1 protocol in the query builder plugin, so query builder no longer crashes when the underlying analytics result is missing either field.
