---
'@finos/legend-application-data-cube': patch
'@finos/legend-data-cube': patch
---

Add loading indicators across the DataCube builder flows so long-running actions no longer look frozen: the creation/load/save dialogs now show progress and register a task, and the DataCube initialization placeholder is no longer blank. Freeze the New DataCube form while creation is in flight, and hold on to the source builder it started with, so switching the source type mid-flight can no longer be silently discarded or applied to the wrong source. Fix the Lakehouse consumer and producer source builders resetting an already filled out form on OAuth token refresh, stop a failure to resolve the Iceberg catalog from aborting the rest of the producer setup, and report failures from initialization instead of leaving them as unhandled promise rejections.
