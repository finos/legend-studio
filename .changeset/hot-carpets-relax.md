---
'@finos/legend-studio': patch
---

**BREAKING CHANGE:** Rename methods in `BasicModel`: add `own` to methods name to avoid confusion on when consumers are interacting with elements from the whole graph (in `PureModel`) or elements just from the graph itself.
