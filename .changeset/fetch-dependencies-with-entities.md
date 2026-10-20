---
'@finos/legend-application-studio': patch
---

When a workspace opens, fetch the project's dependencies at the same time as the workspace entities instead of after them: they only need the project configuration, which is already loaded.
