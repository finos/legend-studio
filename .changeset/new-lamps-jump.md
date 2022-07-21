---
'@finos/legend-query': major
---

**BREAKING CHANGE:** Change the URL patterns for query editor to use [GAV coordinate](https://help.sonatype.com/repomanager3/using-nexus-repository/repository-manager-concepts/an-example---maven-repository-format#AnExampleMavenRepositoryFormat-ComponentCoordinatesandtheRepositoryFormat) `{groupId}:{artifactId}:{versionId}` instead of these separated by slashes `{groupId}/{artifactId}/{versionId}`. As such the following routes are impacted:

```
1. creating query from a pair mapping and runtime
before: /query/create/{groupId}/{artifactId}/{versionId}/{mappingPath}/{runtimePath}
after: /query/create/{groupId}:{artifactId}:{versionId}/{mappingPath}/{runtimePath}
example: /query/create/org.finos.legend/test-project/1.0.0/model::MyMapping/model::MyRuntime -> /query/create/org.finos.legend:test-project:1.0.0/model::MyMapping/model::MyRuntime

2. creating query from a service execution context
before: /query/service/{groupId}/{artifactId}/{versionId}/{servicePath}
after: /query/service/{groupId}:{artifactId}:{versionId}/{servicePath}
example: /query/service/org.finos.legend/test-project/1.0.0/model::MyService -> /query/service/org.finos.legend:test-project:1.0.0/model::MyService

```
