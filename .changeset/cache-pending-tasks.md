---
'@finos/legend-application-marketplace': patch
---

Cache and dedupe `/datacontracts/tasks/pending` requests across the header badge and entitlements dashboard to reduce load on the entitlements server. Cached responses are reused for 60 seconds and concurrent callers share a single in-flight request. The cache is invalidated automatically after approving or denying a task.
