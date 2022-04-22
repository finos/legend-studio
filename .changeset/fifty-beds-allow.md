---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** `BasicModel.getOwn{X}()` set of methods will now throw if element is not found, the previous behavior now will manifest via `BasicModel.getOwnNullable{x}()` set of methods.
