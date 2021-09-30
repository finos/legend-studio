---
'@finos/legend-studio': patch
---

Fix the problem with Studio change detection engine where after fixing compilation issue for a project that was never properly initialized, all elements are shown as `New` instead of `Modified` ([#533](https://github.com/finos/legend-studio/issues/533))
