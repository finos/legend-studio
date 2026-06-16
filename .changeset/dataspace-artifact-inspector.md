---
'@finos/legend-application-query': patch
---

Add a developer-only DataSpace Artifact Inspector page (route `/dev/dataspace-inspector`) for diagnosing oversized depot analytics artifacts.

The page hits the depot analytics endpoint (`GET /generations/{groupId}/{artifactId}/{versionId}/types/dataSpace-analytics?elementPath={path}`) scoped to a single DataSpace and reports total uncompressed payload size plus a per-file breakdown. Inputs can be filled in three ways: manually, by pasting a saved query id (loads `groupId` / `artifactId` / `versionId` / dataspace path from `/pure/v1/query/{id}`), or by picking from a dropdown of every DataSpace registered in depot. Also provides streaming variants that survive OOM-causing payloads (raw byte count, JSON state-machine per-element headers, and stream-to-disk download via the File System Access API), plus an inline Monaco JSON viewer for the parsed response and individual file contents.
