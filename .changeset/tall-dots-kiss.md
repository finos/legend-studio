---
'@finos/legend-studio-plugin-query-builder': patch
---

Do strict checks on parameters of supported function while processing lambda. With this, functions like `project()`, `distinct()`, `take()`, etc. must be placed in very specific order to be supported in form mode, otherwise, we will fallback to text-mode.
