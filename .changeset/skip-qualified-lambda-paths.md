---
'@finos/legend-graph': patch
---

When building a graph, skip resolving the element paths of a lambda when it has none to resolve: only paths that aren't full paths (and aren't primitive types) can change, and lambdas saved from Studio only have full paths. This saves a serialize and deserialize round trip of every derived property, constraint, mapping transform and service query.
