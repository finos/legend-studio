---
'@finos/legend-extension-dsl-data-space': minor
---

Added a new query creation mode from data space, this will mode can be accessed from `Legend Query` using the `url pattern`

```
/query/extensions/{groupId}/{artifactId}/{versionId}/{dataSpacePath}/{executionContext}/{runtimePath}?
e.g. /query/extensions/org.finos.legend/test-project/1.0.0/model::MyDataSpace/context1
```

Data space viewer and query setup will also point at this new URL when users try to create a query from there.
