---
'@finos/legend-studio': patch
---

**BREAKING CHANGE:** Remove `GraphFreezer` as we now can rely on hashing to detect unexpected changes to immutable objects. As a result, the config flag `DEV__enableGraphImmutabilityRuntimeCheck` will be removed as well.
