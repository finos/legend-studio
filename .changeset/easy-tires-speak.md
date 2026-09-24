---
'@finos/legend-extension-dsl-data-product': patch
---

Add `resolveEntitlementsDataProductByDID`, which resolves a Data Product from a Lakehouse deployment id supplied by the caller instead of looking one up from the depot artifact generation. Removes the now-unused `resolveEntitlementsDataProductFromSDLC`.
