---
'@finos/legend-application-data-cube': patch
'@finos/legend-data-cube': patch
---

Add loading indicators across the DataCube builder flows so long-running actions no longer look frozen: the creation/load/save dialogs now show progress and register a task, the DataCube initialization placeholder is no longer blank, and the Lakehouse source builder selectors stay visible with their loading state while fetching. Also fix the Lakehouse consumer and producer source builders resetting an already filled out form on OAuth token refresh, and report failures from their initialization instead of leaving them as unhandled promise rejections.
