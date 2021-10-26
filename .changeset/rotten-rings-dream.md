---
'@finos/legend-application': patch
---

`notifyError()` now will only take `Error | string`. This will help Typescript catches cases where we pass non-error objects to the notification dispatcher.
