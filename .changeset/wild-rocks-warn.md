---
'@finos/legend-graph': patch
---

Support the new backend defect format for compilation results. The engine now returns `defects` with a `defectSeverityLevel` and `defectTypeId` instead of just `warnings`. Added `V1_Defect` base class with a `V1_DefectSeverityLevel` enum, updated `V1_CompilationWarning` to extend it, and changed `V1_RemoteEngine` to read from the `defects` field and filter by WARN severity. Added unit tests for defect deserialization and severity filtering.
