---
'@finos/legend-application-marketplace': patch
---

Bulk approving or denying pending tasks now sends requests in batches of size 50 with a single progress indicator instead of firing every request at once with a notification per task.
