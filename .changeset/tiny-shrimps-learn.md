---
'@finos/legend-graph': major
---

Rename `fullPath` to `path` in `Package`. Where this change really makes a difference is for the root package: previously, `path` was the `name` of the root package element, from now on, `path` will be `empty string`, this makes the handling of root package when constructing element path more consistent.
