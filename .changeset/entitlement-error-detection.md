---
'@finos/legend-application-data-cube': patch
'@finos/legend-query-builder': patch
'@finos/legend-graph': patch
---

Share the detection of entitlement/authorization execution errors between Legend Query and Legend DataCube via `isExecutionPermissionDeniedError`, fix the check that prevented capitalized error patterns from ever matching, and recognize more Snowflake privilege and warehouse access errors.
