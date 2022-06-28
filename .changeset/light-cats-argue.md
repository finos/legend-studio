---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Restructured documentation registry, each documentation entry now can also relate to other documentation (referring to others by their keys). Contextual documentation registry is now simplified to become a map between `context` and `documentation key`. As a result, in `LegendApplicationConfigurationData.documentation`, `contextualDocEntries` now becomes `contextualDocMap`, also, in `LegendApplicationPlugin`, `getExtraKeyedContextualDocumentationEntries()` now becomes `getExtraContextualDocumentationEntries()`.
