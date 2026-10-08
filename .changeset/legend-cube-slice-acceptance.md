---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube: the canvas fits the query again when only its height changes, e.g. when the splitter above the results grid moves. `@finos/legend-cube-builder` no longer exports what nothing outside it uses (`getRuntimesForDatabase`, `BundledModel`, `createTextModel` and the bundled Northwind model's constants); neither package has been released yet. Both packages document how to host the page, how to test it, and how to add an operation.
