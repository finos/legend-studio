---
'@finos/legend-server-depot': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-application-query': patch
---

Fix Chrome tab OOM crash when opening a multi execution context DataSpace in Legend Query.

The depot `GET /generations/{groupId}/{artifactId}/{versionId}/types/dataSpace-analytics` endpoint returns artifacts for **every** DataSpace in the project, which for large multi-execution-context projects can exceed 700 MB and OOM the browser tab. The endpoint also supports an `elementPath` query parameter that scopes the response to a single DataSpace; we now pass it through so only the requested DataSpace's artifacts are fetched.

Changes:

- `DepotServerClient.getGenerationFilesByType` now accepts an optional `elementPath` argument that is forwarded as an `elementPath` query parameter to narrow the response server-side.
- `retrieveDataspaceArtifactsCache` now requires a `dataSpacePath` argument and forwards it to the depot endpoint.
- `V1_DSL_DataSpace_PureGraphManagerExtension.analyzeDataSpaceCoverage` — the unneeded client-side `artifact.path === dataSpacePath` filter is removed; the depot response is already element-scoped.
