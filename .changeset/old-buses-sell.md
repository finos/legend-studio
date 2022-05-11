---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Remove `Stubable` interface and all stub logic in metamodels, such as `createStub()`, `isStub()`, these methods are now cleaned up and organized in `model creater helpers` which will be exported as utilities from this package.
