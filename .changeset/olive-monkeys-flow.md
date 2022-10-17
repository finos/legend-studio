---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** `BasicModel.renameOwnElement` now requires passing the `oldPath` in. This helps fix a problem with renaming an element belonging to a package that has just been renamed.
