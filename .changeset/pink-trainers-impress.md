---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** All setters methods are now moved out of metamodels. These are now branded as `graph modifier helpers` and will be put in places where we need to modify them (e.g. in the apps such as `Legend Studio`, `Legend Query`). Also, all `mobx` `makeObservable()` logic inside of metamodels' constructors are now removed. These are now branded as `observer helpers`.

> As of now, we are putting these in `@finos/legend-graph`, but ideally they should be moved to the app (similar to what we do with the `graph modifier observers`).
