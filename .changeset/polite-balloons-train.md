---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Removed all `OptionalReference` to simplify reference system. Removed `OptionalPackageableElementReference`, use `PackageableElementReference | undefined` instead. As a result, `PureInstanceSetImplementation.srcClass`, `PropertyGraphFetchTree.subType`, `Binding.schemaSet` are now adjusted to use `PackageableElementReference` accordingly.
