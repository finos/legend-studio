---
'@finos/legend-application-marketplace': patch
'@finos/legend-extension-dsl-data-product': patch
---

Resolve access point schemas for the Intelligence & Agents tab from the data product element and its artifact instead of opening a product viewer, typing only the access points the artifact does not cover through the engine.

Access point sample values now fall back to the artifact's relation element, so the data product page shows sample values on columns that previously had none.
