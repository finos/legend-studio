---
'@finos/legend-graph': patch
---

Fix a problem with `PackageableElementImplicitReference` where even the value is modified by users, its value for serialization does not change, hence effectively negating user's modification (see [#449](https://github.com/finos/legend-studio/issues/449) for more details).
