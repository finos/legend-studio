---
'@finos/legend-application-studio': patch
'@finos/legend-query-builder': patch
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
---

Fix code editors turning dark in the light theme after the SQL Playground opens: the playground now follows the application theme, and every code editor uses the same light theme, since a Monaco theme applies to every editor on the page.
