---
'@finos/legend-application': patch
'@finos/legend-application-marketplace': patch
'@finos/legend-application-query': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-application-studio-depot-dashboard': patch
'@finos/legend-extension-dsl-data-space': patch
---

Bump `react-router` and `react-router-dom` to `7.18.5`. `generatePath()` now percent-encodes interpolated params (e.g. `:` as `%3A`), so tests that assert on generated paths expect the encoded form.
