---
'@finos/legend-application-studio': patch
---

Add telemetry for the workflow manager: panel open/close (with dwell), workflows and jobs fetch launch/success/failure (with duration, counts and status breakdown), workflow expand/refresh, job actions retry/cancel/run-manual (launch/success/failure with `jobName`, `jobStatus` and `action`), and job-logs viewer open/close/refresh/fetch events. All events carry an optional `sourceInfo` and a `scope` discriminator (`workspace` / `project` / `project-version`) so dashboards can slice pipeline health per surface without joining on `sourceInfo.sourceType`.
