---
'@finos/legend-application-marketplace': patch
---

Guard against Data Products whose execution context has no mapping or runtime when resolving the AI chat's execution context, matching the now-optional Data Product execution context model.
