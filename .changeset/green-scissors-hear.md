---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Remove the required `clientVersion` call from execution-related methods in `AbstractPureGraphManager`, we will always assume `vX_X_X` is the chosen version until we come up with a more generic handling for protocol versions.
